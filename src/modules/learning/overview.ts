/**
 * Student-centred read models. Everything private to a student is read
 * through `asUser`, so PostgreSQL row-level security — not just this code —
 * decides whether `actor` may see `studentId`'s records.
 */
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { asUser, getDb, type Actor, type Db } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { getCourseTree, type CourseTree } from "@/modules/curriculum/queries";
import { rollup, type Rollup, type SkillStateLite } from "@/modules/mastery/aggregation";
import type { MasteryLevel, SkillExplanation } from "@/modules/mastery/types";
import { recommend, type RecInput, type Recommendation } from "@/modules/recommendations/engine";

export type StateRow = typeof t.masteryStates.$inferSelect;

export interface StudentAssignment {
  id: string;
  classId: string;
  className: string;
  courseId: string;
  title: string;
  instructions: string;
  kind: t.AssignmentKind;
  lessonId: string | null;
  assessmentId: string | null;
  skillIds: string[];
  dueAt: Date | null;
  availableFrom: Date | null;
  maxAttempts: number | null;
  aiPolicy: t.AiPolicy;
  points: number;
  submissions: number;
  bestScore: number | null;
  maxScore: number | null;
  done: boolean;
  late: boolean;
  href: string;
}

/** Assignments that reach this student (RLS: class member + targeted). */
export async function listStudentAssignments(tx: Db, studentId: string, courseId?: string): Promise<StudentAssignment[]> {
  const rows = await tx
    .select({ a: t.assignments, className: t.classes.name, courseId: t.classes.courseId })
    .from(t.assignments)
    .innerJoin(t.classes, eq(t.classes.id, t.assignments.classId))
    .innerJoin(t.classEnrollments, and(eq(t.classEnrollments.classId, t.classes.id), eq(t.classEnrollments.studentId, studentId), eq(t.classEnrollments.status, "active")))
    .where(and(sql`${t.assignments.archivedAt} is null`, sql`${t.classes.archivedAt} is null`, courseId ? eq(t.classes.courseId, courseId) : undefined))
    .orderBy(asc(t.assignments.dueAt));
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.a.id);
  const targets = await tx.select().from(t.assignmentTargets).where(inArray(t.assignmentTargets.assignmentId, ids));
  const subs = await tx.select().from(t.submissions).where(and(inArray(t.submissions.assignmentId, ids), eq(t.submissions.studentId, studentId)));
  const overrides = await tx.select().from(t.assignmentOverrides).where(and(inArray(t.assignmentOverrides.assignmentId, ids), eq(t.assignmentOverrides.studentId, studentId)));

  return rows
    .filter((r) => {
      const tg = targets.filter((x) => x.assignmentId === r.a.id);
      return tg.length === 0 || tg.some((x) => x.studentId === studentId);
    })
    .map(({ a, className, courseId: cid }) => {
      const mine = subs.filter((s) => s.assignmentId === a.id);
      const override = overrides.find((o) => o.assignmentId === a.id);
      const scored = mine.filter((s) => s.score !== null && s.maxScore);
      const best = scored.length ? scored.reduce((x, y) => ((y.score as number) / (y.maxScore as number) > (x.score as number) / (x.maxScore as number) ? y : x)) : null;
      return {
        id: a.id,
        classId: a.classId,
        className,
        courseId: cid,
        title: a.title,
        instructions: a.instructions,
        kind: a.kind,
        lessonId: a.lessonId,
        assessmentId: a.assessmentId,
        skillIds: a.skillIds,
        dueAt: override?.dueAt ?? a.dueAt,
        availableFrom: a.availableFrom,
        maxAttempts: override?.maxAttempts ?? a.maxAttempts,
        aiPolicy: a.aiPolicy,
        points: a.points,
        submissions: mine.length,
        bestScore: best?.score ?? null,
        maxScore: best?.maxScore ?? null,
        done: mine.length > 0,
        late: mine.some((s) => s.status === "late"),
        href: `/app/assignments/${a.id}`,
      };
    });
}

export interface DetectedMisconceptionView {
  id: string;
  skillId: string;
  misconceptionId: string;
  title: string;
  description: string;
  remediation: string;
  status: t.MisconceptionStatus;
  detectionMethod: "answer_pattern_rule" | "teacher";
  occurrences: number;
  correctSinceLast: number;
  firstObservedAt: Date;
  lastObservedAt: Date;
}

export interface CourseOverview {
  tree: CourseTree;
  states: Map<string, StateRow>;
  lessonProgress: Map<string, { status: "in_progress" | "completed"; furthestBlock: number; updatedAt: Date }>;
  rollups: { course: Rollup; units: Map<string, Rollup>; topics: Map<string, Rollup>; objectives: Map<string, Rollup> };
  reviewsDue: { skillId: string; dueAt: Date }[];
  misconceptions: DetectedMisconceptionView[];
  assignments: StudentAssignment[];
  /** Curriculum assessments with at least one submitted attempt → best score. */
  assessmentResults: Map<string, { attempts: number; bestScore: number; maxScore: number; lastAt: Date }>;
  recommendations: Recommendation[];
  lessonsCompleted: number;
  lessonsTotal: number;
}

const lite = (s: StateRow): SkillStateLite => ({ skillId: s.skillId, level: s.level, estimate: s.estimate, needsReview: s.needsReview });

export async function getCourseOverview(actor: Actor, studentId: string, courseId: string, now: Date = new Date()): Promise<CourseOverview> {
  const tree = await getCourseTree(courseId);
  if (!tree) throw new DomainError("not_found", "Course not found.");

  const data = await asUser(actor, async (tx) => {
    const states = await tx.select().from(t.masteryStates).where(and(eq(t.masteryStates.userId, studentId), eq(t.masteryStates.courseId, courseId)));
    const progress = await tx.select().from(t.lessonProgress).where(and(eq(t.lessonProgress.userId, studentId), eq(t.lessonProgress.courseId, courseId)));
    const reviews = await tx.select().from(t.reviewSchedule).where(and(eq(t.reviewSchedule.userId, studentId), eq(t.reviewSchedule.courseId, courseId)));
    const detected = await tx.select().from(t.detectedMisconceptions).where(and(eq(t.detectedMisconceptions.userId, studentId), eq(t.detectedMisconceptions.courseId, courseId)));
    const attempts = await tx
      .select({ assessmentId: t.attempts.assessmentId, score: t.attempts.score, maxScore: t.attempts.maxScore, submittedAt: t.attempts.submittedAt })
      .from(t.attempts)
      .where(and(eq(t.attempts.userId, studentId), eq(t.attempts.courseId, courseId), eq(t.attempts.status, "submitted"), sql`${t.attempts.assessmentId} is not null`));
    const assignments = await listStudentAssignments(tx, studentId, courseId);
    return { states, progress, reviews, detected, attempts, assignments };
  });

  const states = new Map(data.states.map((s) => [s.skillId, s]));
  const liteStates = new Map(data.states.map((s) => [s.skillId, lite(s)]));
  const lessonProgress = new Map(data.progress.map((p) => [p.lessonId, { status: p.status, furthestBlock: p.furthestBlock, updatedAt: p.updatedAt }]));

  const units = new Map<string, Rollup>();
  const topics = new Map<string, Rollup>();
  const objectives = new Map<string, Rollup>();
  for (const u of tree.units) {
    if (u.skillIds.length) units.set(u.id, rollup(u.skillIds, liteStates));
    for (const tp of u.topics) {
      topics.set(tp.id, rollup(tp.skillIds, liteStates));
      for (const o of tp.objectives) objectives.set(o.id, rollup(o.skillIds, liteStates));
    }
  }

  const misconceptions: DetectedMisconceptionView[] = data.detected
    .map((d) => {
      const m = tree.misconceptions.get(d.misconceptionId);
      return m
        ? { id: d.id, skillId: d.skillId, misconceptionId: d.misconceptionId, title: m.title, description: m.description, remediation: m.remediation, status: d.status, detectionMethod: d.detectionMethod, occurrences: d.occurrences, correctSinceLast: d.correctSinceLast, firstObservedAt: d.firstObservedAt, lastObservedAt: d.lastObservedAt }
        : null;
    })
    .filter((x): x is DetectedMisconceptionView => x !== null)
    .sort((a, b) => b.lastObservedAt.getTime() - a.lastObservedAt.getTime());

  const assessmentResults = new Map<string, { attempts: number; bestScore: number; maxScore: number; lastAt: Date }>();
  for (const a of data.attempts) {
    if (!a.assessmentId || a.score === null || !a.maxScore || !a.submittedAt) continue;
    const cur = assessmentResults.get(a.assessmentId);
    if (!cur) assessmentResults.set(a.assessmentId, { attempts: 1, bestScore: a.score, maxScore: a.maxScore, lastAt: a.submittedAt });
    else {
      cur.attempts += 1;
      if (a.score / a.maxScore > cur.bestScore / cur.maxScore) Object.assign(cur, { bestScore: a.score, maxScore: a.maxScore });
      if (a.submittedAt > cur.lastAt) cur.lastAt = a.submittedAt;
    }
  }

  const lessons = tree.lessonOrder.map((id) => tree.lessons.get(id)!).filter(Boolean);
  const recInput: RecInput = {
    now,
    courseId,
    courseName: tree.course.name,
    lessons: lessons.map((l) => ({ id: l.id, title: l.title, skillIds: l.skillIds })),
    lessonStatus: new Map([...lessonProgress].map(([id, p]) => [id, p.status])),
    skills: new Map([...tree.skills].map(([id, s]) => [id, { id, name: s.name, prerequisites: s.prerequisites, lessonIds: s.lessonIds, patternLabels: s.patternLabels, questionCount: s.questionCount }])),
    states: new Map(data.states.map((s) => [s.skillId, { level: s.level, needsReview: s.needsReview, explanation: s.explanation }])),
    reviewsDue: data.reviews.map((r) => ({ skillId: r.skillId, dueAt: r.dueAt })),
    misconceptions: misconceptions.map((m) => ({ skillId: m.skillId, misconceptionId: m.misconceptionId, title: m.title, remediation: m.remediation, status: m.status, occurrences: m.occurrences })),
    assignments: data.assignments.map((a) => ({ id: a.id, title: a.title, dueAt: a.dueAt, kind: a.kind, done: a.done, href: a.href })),
    assessments: tree.assessments.map((a) => ({ id: a.id, title: a.title, kind: a.kind, skillIds: a.skillIds, taken: assessmentResults.has(a.id) })),
  };

  return {
    tree,
    states,
    lessonProgress,
    rollups: { course: rollup(tree.skillIds, liteStates), units, topics, objectives },
    reviewsDue: data.reviews.filter((r) => r.dueAt.getTime() <= now.getTime()).map((r) => ({ skillId: r.skillId, dueAt: r.dueAt })),
    misconceptions,
    assignments: data.assignments,
    assessmentResults,
    recommendations: recommend(recInput),
    lessonsCompleted: [...lessonProgress.values()].filter((p) => p.status === "completed").length,
    lessonsTotal: lessons.length,
  };
}

export interface EnrolledCourse {
  courseId: string;
  name: string;
  category: string;
  contentStatus: t.CourseContentStatus;
  via: "class" | "independent";
  className: string | null;
  lastActivityAt: Date | null;
}

/** Courses the student is taking, through a class or independently. */
export async function getEnrolledCourses(actor: Actor, studentId: string): Promise<EnrolledCourse[]> {
  const rows = await asUser(actor, async (tx) => {
    const viaClass = await tx
      .select({ courseId: t.classes.courseId, className: t.classes.name })
      .from(t.classEnrollments)
      .innerJoin(t.classes, eq(t.classes.id, t.classEnrollments.classId))
      .where(and(eq(t.classEnrollments.studentId, studentId), eq(t.classEnrollments.status, "active"), sql`${t.classes.archivedAt} is null`));
    const independent = await tx.select({ courseId: t.courseEnrollments.courseId }).from(t.courseEnrollments).where(eq(t.courseEnrollments.userId, studentId));
    const activity = await tx
      .select({ courseId: t.learningEvents.courseId, last: sql<string>`max(${t.learningEvents.occurredAt})` })
      .from(t.learningEvents)
      .where(and(eq(t.learningEvents.userId, studentId), sql`${t.learningEvents.courseId} is not null`))
      .groupBy(t.learningEvents.courseId);
    return { viaClass, independent, activity };
  });
  const ids = [...new Set([...rows.viaClass.map((r) => r.courseId), ...rows.independent.map((r) => r.courseId)])];
  if (ids.length === 0) return [];
  const db = await getDb();
  const courses = await db.select().from(t.courses).where(inArray(t.courses.id, ids));
  return courses
    .map((c) => {
      const cls = rows.viaClass.find((r) => r.courseId === c.id);
      const last = rows.activity.find((a) => a.courseId === c.id)?.last;
      return { courseId: c.id, name: c.name, category: c.category, contentStatus: c.contentStatus, via: cls ? ("class" as const) : ("independent" as const), className: cls?.className ?? null, lastActivityAt: last ? new Date(last) : null };
    })
    .sort((a, b) => (b.lastActivityAt?.getTime() ?? 0) - (a.lastActivityAt?.getTime() ?? 0) || a.name.localeCompare(b.name));
}

export interface EvidenceView {
  id: string;
  responseId: string;
  attemptId: string;
  questionId: string;
  prompt: string;
  questionType: string;
  pattern: string;
  patternLabel: string;
  difficulty: number;
  mode: t.AttemptMode;
  score: number;
  correct: boolean;
  tryNumber: number;
  hintsUsed: number;
  solutionViewed: boolean;
  tutorUsed: boolean;
  independent: boolean;
  misconceptionTitle: string | null;
  occurredAt: Date;
  /** Present only when `includeAnswers` (teacher drill-down). */
  response?: unknown;
  correctAnswer?: string;
}

export interface SkillDetail {
  skill: { id: string; name: string; description: string; courseId: string; patternLabels: Record<string, string> };
  state: StateRow | null;
  level: MasteryLevel;
  explanation: SkillExplanation | null;
  evidence: EvidenceView[];
  history: { at: Date; estimate: number; level: MasteryLevel; trigger: string; policyVersion: number }[];
  misconceptions: DetectedMisconceptionView[];
  review: { dueAt: Date; stage: number } | null;
}

/**
 * Everything behind one mastery classification: state, the attempts that
 * produced it, and how it changed over time.
 */
export async function getSkillDetail(actor: Actor, studentId: string, skillId: string, options: { includeAnswers?: boolean } = {}): Promise<SkillDetail> {
  const db = await getDb();
  const [skill] = await db.select().from(t.skills).where(eq(t.skills.id, skillId));
  if (!skill) throw new DomainError("not_found", "Skill not found.");

  const data = await asUser(actor, async (tx) => {
    // RLS decides visibility; make "no access" an error rather than an empty record.
    if (actor.id !== studentId) {
      const [visible] = await tx.select({ id: t.users.id }).from(t.users).where(eq(t.users.id, studentId));
      if (!visible) throw new DomainError("not_found", "Student not found.");
    }
    const [state] = await tx.select().from(t.masteryStates).where(and(eq(t.masteryStates.userId, studentId), eq(t.masteryStates.skillId, skillId)));
    const evidence = await tx
      .select({ e: t.masteryEvidence, response: t.questionResponses.response, misconceptionId: t.questionResponses.misconceptionId })
      .from(t.masteryEvidence)
      .innerJoin(t.questionResponses, eq(t.questionResponses.id, t.masteryEvidence.responseId))
      .where(and(eq(t.masteryEvidence.userId, studentId), eq(t.masteryEvidence.skillId, skillId)))
      .orderBy(desc(t.masteryEvidence.occurredAt));
    const history = await tx
      .select()
      .from(t.masterySnapshots)
      .where(and(eq(t.masterySnapshots.userId, studentId), eq(t.masterySnapshots.skillId, skillId)))
      .orderBy(asc(t.masterySnapshots.createdAt));
    const detected = await tx.select().from(t.detectedMisconceptions).where(and(eq(t.detectedMisconceptions.userId, studentId), eq(t.detectedMisconceptions.skillId, skillId)));
    const [review] = await tx.select().from(t.reviewSchedule).where(and(eq(t.reviewSchedule.userId, studentId), eq(t.reviewSchedule.skillId, skillId)));
    return { state, evidence, history, detected, review };
  });

  // Question text is shared curriculum; fetched after RLS has authorised the evidence rows.
  const qIds = [...new Set(data.evidence.map((r) => r.e.questionId))];
  const versions = qIds.length ? await db.select().from(t.questionVersions).where(inArray(t.questionVersions.questionId, qIds)) : [];
  const catalog = await db.select().from(t.misconceptions).where(eq(t.misconceptions.skillId, skillId));
  const allMisconceptions = qIds.length ? await db.select().from(t.misconceptions) : catalog;
  const { describeCorrectAnswer } = await import("@/modules/assessments/grading");

  const evidence: EvidenceView[] = data.evidence.map(({ e, response, misconceptionId }) => {
    const v = versions.find((x) => x.questionId === e.questionId && x.version === e.questionVersion);
    return {
      id: e.id,
      responseId: e.responseId,
      attemptId: e.attemptId,
      questionId: e.questionId,
      prompt: v?.prompt ?? "(question no longer available)",
      questionType: v?.body.type ?? "unknown",
      pattern: e.pattern,
      patternLabel: skill.patternLabels[e.pattern] ?? e.pattern,
      difficulty: e.difficulty,
      mode: e.mode,
      score: e.score,
      correct: e.score >= 0.999,
      tryNumber: e.tryNumber,
      hintsUsed: e.hintsUsed,
      solutionViewed: e.solutionViewed,
      tutorUsed: e.tutorUsed,
      independent: e.tryNumber === 1 && e.hintsUsed === 0 && !e.solutionViewed && !e.tutorUsed,
      misconceptionTitle: misconceptionId ? (allMisconceptions.find((m) => m.id === misconceptionId)?.title ?? null) : null,
      occurredAt: e.occurredAt,
      ...(options.includeAnswers && v ? { response, correctAnswer: describeCorrectAnswer(v.body) } : {}),
    };
  });

  return {
    skill: { id: skill.id, name: skill.name, description: skill.description, courseId: skill.courseId, patternLabels: skill.patternLabels },
    state: data.state ?? null,
    level: data.state?.level ?? "not_started",
    explanation: data.state?.explanation ?? null,
    evidence,
    history: data.history.map((h) => ({ at: h.createdAt, estimate: h.estimate, level: h.level, trigger: h.trigger, policyVersion: h.policyVersion })),
    misconceptions: data.detected
      .map((d) => {
        const m = allMisconceptions.find((x) => x.id === d.misconceptionId);
        return m
          ? { id: d.id, skillId: d.skillId, misconceptionId: d.misconceptionId, title: m.title, description: m.description, remediation: m.remediation, status: d.status, detectionMethod: d.detectionMethod, occurrences: d.occurrences, correctSinceLast: d.correctSinceLast, firstObservedAt: d.firstObservedAt, lastObservedAt: d.lastObservedAt }
          : null;
      })
      .filter((x): x is DetectedMisconceptionView => x !== null),
    review: data.review ? { dueAt: data.review.dueAt, stage: data.review.stage } : null,
  };
}
