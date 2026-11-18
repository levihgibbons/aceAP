/**
 * Assessment service — the single path by which a student response becomes
 * mastery evidence:
 *
 *   validate → authorise → grade → persist response → create evidence →
 *   recalculate mastery → update misconceptions/review schedule → log event →
 *   return feedback
 *
 * Every mode (lesson checks, guided practice, quizzes, unit tests, review,
 * exam practice, teacher assignments) goes through here, so they all feed the
 * same student learning record.
 */
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, type Db } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import type { AssessmentConfig, LessonBlock, QuestionBody } from "@/modules/content/schema";
import { logEvent } from "@/modules/learning/events";
import { LEVEL_RANK, type MasteryLevel } from "@/modules/mastery/types";
import { recomputeSkill, recordMisconceptionSignal, resolvePolicy } from "@/modules/mastery/service";
import { GRADER_VERSION, describeCorrectAnswer, gradeResponse, responseSchema, toStudentQuestion, type GradeResult, type QuestionResponse, type StudentQuestion } from "./grading";
import { hashString, mulberry32 } from "./math";

type AttemptRow = typeof t.attempts.$inferSelect;
type QuestionVersionRow = typeof t.questionVersions.$inferSelect;
type Assistance = AttemptRow["assistance"];

const GRACE_MS = 30_000;
/** Modes where each answer is graded and shown immediately. */
const IMMEDIATE_SINGLE_TRY: ReadonlySet<t.AttemptMode> = new Set(["course_review"]);

export type StartSpec =
  | { kind: "assessment"; assessmentId: string }
  | { kind: "practice"; skillId: string; count?: number }
  | { kind: "lesson"; lessonId: string }
  | { kind: "review"; courseId: string; count?: number }
  | { kind: "exam_mixed"; courseId: string; count?: number; timed?: boolean }
  | { kind: "assignment"; assignmentId: string };

// ───────────────────────────── question loading ─────────────────────────────

async function loadVersions(db: Db, items: { questionId: string; version: number }[]): Promise<Map<string, QuestionVersionRow>> {
  if (items.length === 0) return new Map();
  const rows = await db.select().from(t.questionVersions).where(inArray(t.questionVersions.questionId, items.map((i) => i.questionId)));
  const want = new Map(items.map((i) => [i.questionId, i.version]));
  return new Map(rows.filter((r) => want.get(r.questionId) === r.version).map((r) => [r.questionId, r]));
}

async function publishedItems(db: Db, questionIds: string[]): Promise<{ questionId: string; version: number }[]> {
  if (questionIds.length === 0) return [];
  const rows = await db.select({ id: t.questions.id, v: t.questions.publishedVersion }).from(t.questions).where(inArray(t.questions.id, questionIds));
  const byId = new Map(rows.map((r) => [r.id, r.v]));
  return questionIds.filter((id) => byId.get(id)).map((id) => ({ questionId: id, version: byId.get(id) as number }));
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  const rand = mulberry32(hashString(seed));
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Choose practice items for the given skills: unseen questions first, then
 * ones last answered incorrectly, then the least recently seen — rotating
 * through skills and problem patterns so practice is varied.
 */
export async function pickQuestions(
  db: Db,
  userId: string,
  skillIds: string[],
  count: number,
  seed: string,
  /** Restrict the draw to these questions (an exercise's pool). */
  poolIds?: string[],
): Promise<{ questionId: string; version: number }[]> {
  if (skillIds.length === 0 || count <= 0) return [];
  const pool = await db
    .select({ id: t.questions.id, version: t.questions.publishedVersion, skillId: t.questions.primarySkillId, type: t.questions.type, pattern: t.questionVersions.pattern })
    .from(t.questions)
    .innerJoin(t.questionVersions, and(eq(t.questionVersions.questionId, t.questions.id), eq(t.questionVersions.version, t.questions.publishedVersion)))
    .where(
      and(
        inArray(t.questions.primarySkillId, skillIds),
        sql`${t.questions.type} <> 'short_response'`,
        poolIds ? inArray(t.questions.id, poolIds.length ? poolIds : [""]) : undefined,
      ),
    );
  if (pool.length === 0) return [];

  const history = await db
    .select({ questionId: t.questionResponses.questionId, isCorrect: t.questionResponses.isCorrect, createdAt: t.questionResponses.createdAt })
    .from(t.questionResponses)
    .where(and(eq(t.questionResponses.userId, userId), inArray(t.questionResponses.questionId, pool.map((p) => p.id))))
    .orderBy(asc(t.questionResponses.createdAt));
  const last = new Map<string, { correct: boolean; at: number }>();
  for (const h of history) last.set(h.questionId, { correct: Boolean(h.isCorrect), at: h.createdAt.getTime() });

  const rank = (id: string) => {
    const h = last.get(id);
    if (!h) return 0; // never seen
    return h.correct ? 2 : 1;
  };
  const bySkill = new Map<string, typeof pool>();
  for (const q of seededShuffle(pool, seed)) {
    const list = bySkill.get(q.skillId) ?? [];
    list.push(q);
    bySkill.set(q.skillId, list);
  }
  for (const list of bySkill.values()) list.sort((a, b) => rank(a.id) - rank(b.id) || (last.get(a.id)?.at ?? 0) - (last.get(b.id)?.at ?? 0));

  const picked: typeof pool = [];
  const usedPatterns = new Map<string, Set<string>>();
  let progressed = true;
  while (picked.length < count && progressed) {
    progressed = false;
    for (const skillId of skillIds) {
      if (picked.length >= count) break;
      const list = bySkill.get(skillId);
      if (!list?.length) continue;
      const used = usedPatterns.get(skillId) ?? new Set<string>();
      // Prefer a pattern not yet used for this skill among equally-ranked candidates.
      const bestRank = rank(list[0].id);
      let idx = list.findIndex((q) => rank(q.id) === bestRank && !used.has(q.pattern));
      if (idx < 0) idx = 0;
      const [q] = list.splice(idx, 1);
      used.add(q.pattern);
      usedPatterns.set(skillId, used);
      picked.push(q);
      progressed = true;
    }
  }
  return picked.map((q) => ({ questionId: q.id, version: q.version as number }));
}

// ─────────────────────────────── start attempt ──────────────────────────────

function modeForAssessmentKind(kind: string): t.AttemptMode {
  switch (kind) {
    case "exercise":
      return "guided_practice";
    case "lesson_quiz":
    case "skill_quiz":
    case "unit_test":
    case "course_review":
    case "exam_practice":
      return kind;
    default:
      return "custom";
  }
}

async function ensureCourseEnrollment(db: Db, userId: string, courseId: string) {
  await db.insert(t.courseEnrollments).values({ userId, courseId }).onConflictDoNothing();
}

/** AI-tutor availability for ordinary learning, from the student's class for this course. */
export async function classAiPolicy(db: Db, userId: string, courseId: string): Promise<t.AiPolicy> {
  const rows = await db
    .select({ aiPolicy: t.classes.aiPolicy })
    .from(t.classEnrollments)
    .innerJoin(t.classes, eq(t.classes.id, t.classEnrollments.classId))
    .where(and(eq(t.classEnrollments.studentId, userId), eq(t.classEnrollments.status, "active"), eq(t.classes.courseId, courseId), sql`${t.classes.archivedAt} is null`));
  // Most restrictive policy wins when a student is in several classes for the course.
  if (rows.some((r) => r.aiPolicy === "disabled")) return "disabled";
  if (rows.some((r) => r.aiPolicy === "hints_only")) return "hints_only";
  return "allowed";
}

function learningAssistance(policy: t.AiPolicy): Assistance {
  // In ordinary learning authored hints are always available; the class policy governs the AI tutor.
  return policy === "allowed" ? "allowed" : "hints_only";
}

export interface AssignmentContext {
  assignment: typeof t.assignments.$inferSelect;
  override: typeof t.assignmentOverrides.$inferSelect | null;
  priorSubmissions: number;
}

/** Load an assignment and verify it actually reaches this student right now. */
export async function loadAssignmentForStudent(db: Db, userId: string, assignmentId: string, now: Date): Promise<AssignmentContext> {
  const [assignment] = await db.select().from(t.assignments).where(eq(t.assignments.id, assignmentId));
  if (!assignment || assignment.archivedAt) throw new DomainError("not_found", "Assignment not found.");
  const [enrolled] = await db
    .select({ classId: t.classEnrollments.classId })
    .from(t.classEnrollments)
    .where(and(eq(t.classEnrollments.classId, assignment.classId), eq(t.classEnrollments.studentId, userId), eq(t.classEnrollments.status, "active")));
  if (!enrolled) throw new DomainError("forbidden", "This assignment isn't assigned to you.");
  const targets = await db.select().from(t.assignmentTargets).where(eq(t.assignmentTargets.assignmentId, assignmentId));
  if (targets.length && !targets.some((x) => x.studentId === userId)) throw new DomainError("forbidden", "This assignment isn't assigned to you.");
  if (assignment.availableFrom && assignment.availableFrom.getTime() > now.getTime()) throw new DomainError("closed", "This assignment isn't open yet.");
  const [override] = await db
    .select()
    .from(t.assignmentOverrides)
    .where(and(eq(t.assignmentOverrides.assignmentId, assignmentId), eq(t.assignmentOverrides.studentId, userId)));
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(t.submissions)
    .where(and(eq(t.submissions.assignmentId, assignmentId), eq(t.submissions.studentId, userId)));
  return { assignment, override: override ?? null, priorSubmissions: n };
}

export async function startAttempt(userId: string, spec: StartSpec, now: Date = new Date()): Promise<{ attemptId: string; resumed: boolean }> {
  const db = await getDb();
  const seed = `${userId}:${now.getTime()}`;

  let assignmentCtx: AssignmentContext | null = null;
  let effective: Exclude<StartSpec, { kind: "assignment" }>;
  let assignmentSkillIds: string[] = [];
  if (spec.kind === "assignment") {
    assignmentCtx = await loadAssignmentForStudent(db, userId, spec.assignmentId, now);
    const a = assignmentCtx.assignment;
    const maxAttempts = assignmentCtx.override?.maxAttempts ?? a.maxAttempts;
    // Resume an open attempt rather than opening a second one.
    const [open] = await db
      .select({ id: t.attempts.id })
      .from(t.attempts)
      .where(and(eq(t.attempts.userId, userId), eq(t.attempts.assignmentId, a.id), eq(t.attempts.status, "in_progress")))
      .limit(1);
    if (open) return { attemptId: open.id, resumed: true };
    if (maxAttempts !== null && maxAttempts !== undefined && assignmentCtx.priorSubmissions >= maxAttempts)
      throw new DomainError("closed", `You have used all ${maxAttempts} attempt${maxAttempts === 1 ? "" : "s"} for this assignment.`);
    if (a.kind === "assessment" && a.assessmentId) effective = { kind: "assessment", assessmentId: a.assessmentId };
    else if (a.kind === "skill_practice") {
      assignmentSkillIds = a.skillIds;
      effective = { kind: "practice", skillId: a.skillIds[0] ?? "", count: a.questionCount };
    } else if (a.kind === "lesson" && a.lessonId) effective = { kind: "lesson", lessonId: a.lessonId };
    else throw new DomainError("invalid", "This assignment has nothing to start.");
  } else effective = spec;

  const a = assignmentCtx?.assignment ?? null;
  const assignmentAssistance = (fallback: Assistance): Assistance => {
    if (!a) return fallback;
    return a.aiPolicy === "allowed" ? "allowed" : a.aiPolicy === "hints_only" ? "hints_only" : "disabled";
  };
  const timeMultiplier = assignmentCtx?.override?.timeMultiplier ?? 1;

  let values: typeof t.attempts.$inferInsert;

  switch (effective.kind) {
    case "assessment": {
      const [assessment] = await db.select().from(t.assessments).where(eq(t.assessments.id, effective.assessmentId));
      if (!assessment) throw new DomainError("not_found", "Assessment not found.");
      if (!a) {
        const [open] = await db
          .select({ id: t.attempts.id })
          .from(t.attempts)
          .where(and(eq(t.attempts.userId, userId), eq(t.attempts.assessmentId, assessment.id), eq(t.attempts.status, "in_progress"), sql`${t.attempts.assignmentId} is null`))
          .limit(1);
        if (open) return { attemptId: open.id, resumed: true };
      }
      const itemRows = await db.select().from(t.assessmentItems).where(eq(t.assessmentItems.assessmentId, assessment.id)).orderBy(asc(t.assessmentItems.ordinal));
      const config: AssessmentConfig = assessment.config;
      const poolIds = itemRows.map((i) => i.questionId);
      let items: { questionId: string; version: number }[];
      if (config.questionsPerAttempt && poolIds.length > config.questionsPerAttempt) {
        // Exercise: a fresh draw from the pool each attempt (unseen and missed questions first).
        const poolSkills = await db.selectDistinct({ id: t.questions.primarySkillId }).from(t.questions).where(inArray(t.questions.id, poolIds));
        items = await pickQuestions(db, userId, poolSkills.map((s) => s.id), config.questionsPerAttempt, seed, poolIds);
      } else items = await publishedItems(db, poolIds);
      if (items.length === 0) throw new DomainError("invalid", "This assessment has no published questions.");
      values = {
        userId,
        courseId: assessment.courseId,
        mode: modeForAssessmentKind(assessment.kind),
        assessmentId: assessment.id,
        assignmentId: a?.id ?? null,
        items,
        assistance: assignmentAssistance(config.assistance === "allowed" ? "allowed" : "disabled"),
        feedback: a?.feedback ?? config.feedback,
        timeLimitSeconds: config.timeLimitSeconds ? Math.round(config.timeLimitSeconds * timeMultiplier) : null,
        startedAt: now,
      };
      break;
    }

    case "practice": {
      const skillIds = assignmentSkillIds.length ? assignmentSkillIds : [effective.skillId];
      const skills = await db.select({ id: t.skills.id, courseId: t.skills.courseId }).from(t.skills).where(inArray(t.skills.id, skillIds));
      if (skills.length === 0) throw new DomainError("not_found", "Skill not found.");
      const courseId = skills[0].courseId;
      const count = Math.min(Math.max(effective.count ?? 5, 1), 20);
      const items = await pickQuestions(db, userId, skills.map((s) => s.id), count, seed);
      if (items.length === 0) throw new DomainError("invalid", "There are no practice questions for this skill yet.");
      values = {
        userId,
        courseId,
        mode: "guided_practice",
        assignmentId: a?.id ?? null,
        skillId: skills[0].id,
        items,
        assistance: assignmentAssistance(learningAssistance(await classAiPolicy(db, userId, courseId))),
        feedback: "immediate",
        startedAt: now,
      };
      break;
    }

    case "lesson": {
      const [lesson] = await db.select().from(t.lessons).where(eq(t.lessons.id, effective.lessonId));
      if (!lesson || !lesson.publishedVersion) throw new DomainError("not_found", "Lesson not found.");
      const [open] = await db
        .select({ id: t.attempts.id })
        .from(t.attempts)
        .where(and(eq(t.attempts.userId, userId), eq(t.attempts.lessonId, lesson.id), eq(t.attempts.mode, "lesson_check"), eq(t.attempts.status, "in_progress")))
        .orderBy(desc(t.attempts.startedAt))
        .limit(1);
      if (open) return { attemptId: open.id, resumed: true };
      const [version] = await db
        .select({ blocks: t.lessonVersions.blocks })
        .from(t.lessonVersions)
        .where(and(eq(t.lessonVersions.lessonId, lesson.id), eq(t.lessonVersions.version, lesson.publishedVersion)));
      const checkIds = (version?.blocks ?? []).filter((b): b is Extract<LessonBlock, { type: "check" }> => b.type === "check").map((b) => b.questionId);
      values = {
        userId,
        courseId: lesson.courseId,
        mode: "lesson_check",
        lessonId: lesson.id,
        assignmentId: a?.id ?? null,
        items: await publishedItems(db, checkIds),
        assistance: assignmentAssistance(learningAssistance(await classAiPolicy(db, userId, lesson.courseId))),
        feedback: "immediate",
        startedAt: now,
      };
      break;
    }

    case "review": {
      const courseId = effective.courseId;
      const count = Math.min(Math.max(effective.count ?? 8, 3), 20);
      const states = await db.select().from(t.masteryStates).where(and(eq(t.masteryStates.userId, userId), eq(t.masteryStates.courseId, courseId)));
      if (states.length === 0) throw new DomainError("invalid", "Nothing to review yet — complete a lesson or some practice first.");
      const due = await db
        .select({ skillId: t.reviewSchedule.skillId })
        .from(t.reviewSchedule)
        .where(and(eq(t.reviewSchedule.userId, userId), eq(t.reviewSchedule.courseId, courseId), sql`${t.reviewSchedule.dueAt} <= ${now.toISOString()}`));
      const dueIds = due.map((d) => d.skillId);
      const flagged = states.filter((s) => s.needsReview && !dueIds.includes(s.skillId)).map((s) => s.skillId);
      const rest = states
        .filter((s) => !dueIds.includes(s.skillId) && !flagged.includes(s.skillId))
        .sort((x, y) => (x.lastEvidenceAt?.getTime() ?? 0) - (y.lastEvidenceAt?.getTime() ?? 0))
        .map((s) => s.skillId);
      const order = [...dueIds, ...flagged, ...rest];
      const items = await pickQuestions(db, userId, order, count, seed);
      if (items.length === 0) throw new DomainError("invalid", "There are no review questions available yet.");
      values = { userId, courseId, mode: "course_review", items, assistance: "disabled", feedback: "immediate", reviewSkillIds: dueIds, startedAt: now };
      break;
    }

    case "exam_mixed": {
      const courseId = effective.courseId;
      const count = Math.min(Math.max(effective.count ?? 10, 4), 30);
      const skills = await db.select({ id: t.skills.id }).from(t.skills).where(eq(t.skills.courseId, courseId)).orderBy(asc(t.skills.ordinal));
      if (skills.length === 0) throw new DomainError("invalid", "This course has no practice questions yet.");
      const states = await db.select({ skillId: t.masteryStates.skillId, level: t.masteryStates.level }).from(t.masteryStates).where(and(eq(t.masteryStates.userId, userId), eq(t.masteryStates.courseId, courseId)));
      const rank = new Map(states.map((s) => [s.skillId, LEVEL_RANK[s.level]]));
      // Weakest skills first, so a short set concentrates where it helps most.
      const order = skills.map((s) => s.id).sort((x, y) => (rank.get(x) ?? 0) - (rank.get(y) ?? 0));
      const items = await pickQuestions(db, userId, order, count, seed);
      if (items.length === 0) throw new DomainError("invalid", "This course has no practice questions yet.");
      values = {
        userId,
        courseId,
        mode: "exam_practice",
        items: seededShuffle(items, seed),
        assistance: "disabled",
        feedback: "after_submit",
        timeLimitSeconds: effective.timed === false ? null : items.length * 120,
        startedAt: now,
      };
      break;
    }
  }

  await ensureCourseEnrollment(db, userId, values.courseId);
  const [row] = await db.insert(t.attempts).values(values).returning({ id: t.attempts.id });
  if (values.mode !== "lesson_check")
    await logEvent(db, { userId, type: "ASSESSMENT_STARTED", courseId: values.courseId, activityType: values.mode, activityId: row.id, payload: { items: values.items?.length ?? 0, assignmentId: values.assignmentId ?? null }, occurredAt: now });
  return { attemptId: row.id, resumed: false };
}

// ──────────────────────────────── attempt view ──────────────────────────────

export interface FeedbackView {
  correct: boolean;
  score: number;
  note: string | null;
  misconception: { id: string; title: string; remediation: string } | null;
  /** Present only when the answer may be revealed. */
  correctAnswer: string | null;
  solution: string | null;
}

export interface QuestionState {
  tries: number;
  answered: boolean;
  /** Latest response (immediate modes) or saved draft (deferred modes). */
  response: QuestionResponse | null;
  hints: string[];
  solutionViewed: boolean;
  feedback: FeedbackView | null;
  pendingReview: boolean;
  /** No further answers are accepted for this item. */
  locked: boolean;
}

export interface AttemptView {
  id: string;
  mode: t.AttemptMode;
  status: AttemptRow["status"];
  feedback: AttemptRow["feedback"];
  assistance: Assistance;
  courseId: string;
  title: string;
  description: string;
  assessmentId: string | null;
  assignmentId: string | null;
  skillId: string | null;
  lessonId: string | null;
  startedAt: string;
  submittedAt: string | null;
  /** ISO time after which no more answers are accepted (timed attempts). */
  deadline: string | null;
  score: number | null;
  maxScore: number | null;
  questions: StudentQuestion[];
  state: Record<string, QuestionState>;
}

function deadlineOf(a: AttemptRow): Date | null {
  return a.timeLimitSeconds ? new Date(a.startedAt.getTime() + a.timeLimitSeconds * 1000) : null;
}

async function misconceptionView(db: Db, id: string | null) {
  if (!id) return null;
  const [m] = await db.select().from(t.misconceptions).where(eq(t.misconceptions.id, id));
  return m ? { id: m.id, title: m.title, remediation: m.remediation } : null;
}

async function getOwnAttempt(db: Db, userId: string, attemptId: string): Promise<AttemptRow> {
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) throw new DomainError("not_found", "Attempt not found.");
  const [a] = await db.select().from(t.attempts).where(and(eq(t.attempts.id, attemptId), eq(t.attempts.userId, userId)));
  if (!a) throw new DomainError("not_found", "Attempt not found.");
  return a;
}

async function attemptTitle(db: Db, a: AttemptRow): Promise<{ title: string; description: string }> {
  if (a.assignmentId) {
    const [x] = await db.select({ title: t.assignments.title, instructions: t.assignments.instructions }).from(t.assignments).where(eq(t.assignments.id, a.assignmentId));
    if (x) return { title: x.title, description: x.instructions };
  }
  if (a.assessmentId) {
    const [x] = await db.select({ title: t.assessments.title, description: t.assessments.description }).from(t.assessments).where(eq(t.assessments.id, a.assessmentId));
    if (x) return x;
  }
  if (a.mode === "guided_practice" && a.skillId) {
    const [s] = await db.select({ name: t.skills.name }).from(t.skills).where(eq(t.skills.id, a.skillId));
    return { title: `Practice: ${s?.name ?? "skill"}`, description: "Guided practice with immediate feedback. Hints are available, but answers given with hints count for less." };
  }
  if (a.mode === "course_review") return { title: "Mixed review", description: "Interleaved questions on skills you've already worked on. One try each, no hints." };
  if (a.mode === "exam_practice") return { title: "AP exam practice set", description: "Original AP-style questions, weighted toward your weakest skills." };
  return { title: "Lesson check", description: "" };
}

export async function getAttemptView(userId: string, attemptId: string, now: Date = new Date()): Promise<AttemptView> {
  const db = await getDb();
  let attempt = await getOwnAttempt(db, userId, attemptId);

  // A timed attempt whose clock has run out is submitted with whatever was saved.
  const deadline = deadlineOf(attempt);
  if (attempt.status === "in_progress" && deadline && now.getTime() > deadline.getTime() + GRACE_MS) {
    await submitAttempt(userId, attemptId, now, { expired: true });
    attempt = await getOwnAttempt(db, userId, attemptId);
  }

  const versions = await loadVersions(db, attempt.items);
  const responses = await db.select().from(t.questionResponses).where(eq(t.questionResponses.attemptId, attempt.id)).orderBy(asc(t.questionResponses.createdAt));
  const reveals = await db.select().from(t.hintReveals).where(eq(t.hintReveals.attemptId, attempt.id));
  const revealed = attempt.status === "submitted" && attempt.feedback === "after_submit";

  const questions: StudentQuestion[] = [];
  const state: Record<string, QuestionState> = {};
  for (const item of attempt.items) {
    const v = versions.get(item.questionId);
    if (!v) continue;
    questions.push(toStudentQuestion({ id: v.questionId, version: v.version, prompt: v.prompt, body: v.body, hints: v.hints, difficulty: v.difficulty, stimulus: v.stimulus ?? null }, attempt.id));
    const mine = responses.filter((r) => r.questionId === item.questionId);
    const latest = mine[mine.length - 1];
    const reveal = reveals.find((r) => r.questionId === item.questionId);
    const everCorrect = mine.some((r) => r.isCorrect);
    const immediate = attempt.feedback === "immediate";
    const showKey = revealed || (immediate && latest !== undefined && (everCorrect || IMMEDIATE_SINGLE_TRY.has(attempt.mode) || mine.length >= 2 || Boolean(reveal?.solutionViewed)));
    let feedback: FeedbackView | null = null;
    if (latest && latest.score !== null && (immediate || revealed)) {
      feedback = {
        correct: Boolean(latest.isCorrect),
        score: latest.score,
        note: answerNote(v.body, latest.response as QuestionResponse, v.questionId),
        misconception: await misconceptionView(db, latest.misconceptionId),
        correctAnswer: showKey ? describeCorrectAnswer(v.body) : null,
        solution: showKey ? v.solution : null,
      };
    } else if (revealed && !latest) {
      feedback = { correct: false, score: 0, note: "Not answered.", misconception: null, correctAnswer: describeCorrectAnswer(v.body), solution: v.solution };
    }
    const draft = attempt.draftAnswers[item.questionId] as QuestionResponse | undefined;
    state[item.questionId] = {
      tries: mine.length,
      answered: immediate ? mine.length > 0 : draft !== undefined || mine.length > 0,
      response: (latest?.response as QuestionResponse | undefined) ?? draft ?? null,
      hints: v.hints.slice(0, reveal?.hintsRevealed ?? 0),
      solutionViewed: Boolean(reveal?.solutionViewed),
      feedback,
      pendingReview: Boolean(latest && latest.score === null),
      locked: attempt.status !== "in_progress" || (immediate && (everCorrect || (IMMEDIATE_SINGLE_TRY.has(attempt.mode) && mine.length > 0))),
    };
  }

  const { title, description } = await attemptTitle(db, attempt);
  return {
    id: attempt.id,
    mode: attempt.mode,
    status: attempt.status,
    feedback: attempt.feedback,
    assistance: attempt.assistance,
    courseId: attempt.courseId,
    title,
    description,
    assessmentId: attempt.assessmentId,
    assignmentId: attempt.assignmentId,
    skillId: attempt.skillId,
    lessonId: attempt.lessonId,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    deadline: deadline?.toISOString() ?? null,
    score: attempt.score,
    maxScore: attempt.maxScore,
    questions,
    state,
  };
}

function answerNote(body: QuestionBody, response: QuestionResponse, questionId: string): string | null {
  const g = gradeResponse(questionId, body, response);
  return g.status === "graded" ? g.note : null;
}

// ───────────────────────────── hints & solutions ────────────────────────────

async function openAttemptItem(db: Db, userId: string, attemptId: string, questionId: string, now: Date) {
  const attempt = await getOwnAttempt(db, userId, attemptId);
  if (attempt.status !== "in_progress") throw new DomainError("closed", "This attempt has already been submitted.");
  const deadline = deadlineOf(attempt);
  if (deadline && now.getTime() > deadline.getTime() + GRACE_MS) throw new DomainError("closed", "Time is up for this attempt.");
  const item = attempt.items.find((i) => i.questionId === questionId);
  if (!item) throw new DomainError("not_found", "That question isn't part of this attempt.");
  const version = (await loadVersions(db, [item])).get(questionId);
  if (!version) throw new DomainError("not_found", "Question not found.");
  return { attempt, version };
}

async function bumpReveal(db: Db, attempt: AttemptRow, questionId: string, patch: { hints?: number; solution?: boolean; tutor?: boolean }, now: Date) {
  await db
    .insert(t.hintReveals)
    .values({ attemptId: attempt.id, questionId, userId: attempt.userId, hintsRevealed: patch.hints ?? 0, solutionViewed: patch.solution ?? false, tutorUsed: patch.tutor ?? false, updatedAt: now })
    .onConflictDoUpdate({
      target: [t.hintReveals.attemptId, t.hintReveals.questionId],
      set: {
        ...(patch.hints !== undefined ? { hintsRevealed: sql`greatest(${t.hintReveals.hintsRevealed}, ${patch.hints})` } : {}),
        ...(patch.solution ? { solutionViewed: true } : {}),
        ...(patch.tutor ? { tutorUsed: true } : {}),
        updatedAt: now,
      },
    });
}

/** Reveal the next authored hint. Recorded before the answer so it counts as assistance. */
export async function revealHint(userId: string, attemptId: string, questionId: string, now: Date = new Date()): Promise<{ hints: string[]; remaining: number }> {
  const db = await getDb();
  const { attempt, version } = await openAttemptItem(db, userId, attemptId, questionId, now);
  if (attempt.assistance === "disabled") throw new DomainError("forbidden", "Hints are turned off for this assessment.");
  const [row] = await db.select().from(t.hintReveals).where(and(eq(t.hintReveals.attemptId, attemptId), eq(t.hintReveals.questionId, questionId)));
  const next = Math.min((row?.hintsRevealed ?? 0) + 1, version.hints.length);
  if (version.hints.length === 0) return { hints: [], remaining: 0 };
  await bumpReveal(db, attempt, questionId, { hints: next }, now);
  const [skill] = await db.select({ skillId: t.questions.primarySkillId }).from(t.questions).where(eq(t.questions.id, questionId));
  await logEvent(db, { userId, type: "HINT_REQUESTED", courseId: attempt.courseId, skillId: skill?.skillId, activityType: attempt.mode, activityId: attempt.id, payload: { questionId, hintNumber: next }, occurredAt: now });
  return { hints: version.hints.slice(0, next), remaining: version.hints.length - next };
}

/** Show the worked solution in guided modes. Any later answer on this item earns minimal credit. */
export async function revealSolution(userId: string, attemptId: string, questionId: string, now: Date = new Date()): Promise<{ solution: string; correctAnswer: string }> {
  const db = await getDb();
  const { attempt, version } = await openAttemptItem(db, userId, attemptId, questionId, now);
  if (attempt.assistance === "disabled" || attempt.feedback !== "immediate" || IMMEDIATE_SINGLE_TRY.has(attempt.mode))
    throw new DomainError("forbidden", "Solutions are shown after you submit this assessment.");
  await bumpReveal(db, attempt, questionId, { solution: true }, now);
  await logEvent(db, { userId, type: "SOLUTION_VIEWED", courseId: attempt.courseId, activityType: attempt.mode, activityId: attempt.id, payload: { questionId }, occurredAt: now });
  return { solution: version.solution, correctAnswer: describeCorrectAnswer(version.body) };
}

/** Called by the tutor when it helps with a specific open question. */
export async function markTutorUsed(db: Db, attempt: AttemptRow, questionId: string, now: Date) {
  if (!attempt.items.some((i) => i.questionId === questionId)) return;
  await bumpReveal(db, attempt, questionId, { tutor: true }, now);
}

// ─────────────────────────────── evidence core ──────────────────────────────

export interface MasteryChange {
  skillId: string;
  skillName: string;
  before: MasteryLevel;
  after: MasteryLevel;
  needsReview: boolean;
}

interface GradedInput {
  attempt: AttemptRow;
  version: QuestionVersionRow;
  responseId: string;
  score: number;
  tryNumber: number;
  hintsUsed: number;
  solutionViewed: boolean;
  tutorUsed: boolean;
  misconceptionId: string | null;
  now: Date;
}

/** Insert one evidence row per skill the question assesses. */
async function insertEvidence(db: Db, g: GradedInput): Promise<{ skillId: string; evidenceId: string; isPrimary: boolean }[]> {
  const skills = await db.select().from(t.questionSkills).where(eq(t.questionSkills.questionId, g.version.questionId));
  if (skills.length === 0) return [];
  const objectives = await db.select().from(t.objectiveSkills).where(inArray(t.objectiveSkills.skillId, skills.map((s) => s.skillId)));
  const rows = skills.map((s) => ({
    userId: g.attempt.userId,
    courseId: g.attempt.courseId,
    skillId: s.skillId,
    objectiveId: objectives.find((o) => o.skillId === s.skillId)?.objectiveId ?? null,
    questionId: g.version.questionId,
    questionVersion: g.version.version,
    pattern: g.version.pattern,
    responseId: g.responseId,
    attemptId: g.attempt.id,
    score: g.score,
    difficulty: g.version.difficulty,
    mode: g.attempt.mode,
    tryNumber: g.tryNumber,
    hintsUsed: g.hintsUsed,
    solutionViewed: g.solutionViewed,
    tutorUsed: g.tutorUsed,
    isRetentionReview: g.attempt.reviewSkillIds.includes(s.skillId),
    scoringVersion: GRADER_VERSION,
    occurredAt: g.now,
  }));
  const inserted = await db.insert(t.masteryEvidence).values(rows).onConflictDoNothing().returning({ id: t.masteryEvidence.id, skillId: t.masteryEvidence.skillId });
  return inserted.map((r) => ({ skillId: r.skillId, evidenceId: r.id, isPrimary: Boolean(skills.find((s) => s.skillId === r.skillId)?.isPrimary) }));
}

async function recomputeAfter(db: Db, userId: string, courseId: string, touched: { skillId: string; evidenceId: string }[], now: Date): Promise<MasteryChange[]> {
  const latest = new Map<string, string>();
  for (const x of touched) latest.set(x.skillId, x.evidenceId);
  if (latest.size === 0) return [];
  const ids = [...latest.keys()];
  const before = await db.select({ skillId: t.masteryStates.skillId, level: t.masteryStates.level }).from(t.masteryStates).where(and(eq(t.masteryStates.userId, userId), inArray(t.masteryStates.skillId, ids)));
  const names = await db.select({ id: t.skills.id, name: t.skills.name }).from(t.skills).where(inArray(t.skills.id, ids));
  const policy = await resolvePolicy(db, userId, courseId);
  const changes: MasteryChange[] = [];
  for (const [skillId, evidenceId] of latest) {
    const result = await recomputeSkill(db, { userId, skillId, courseId, trigger: "evidence", triggerEvidenceId: evidenceId, now, policy });
    changes.push({
      skillId,
      skillName: names.find((n) => n.id === skillId)?.name ?? skillId,
      before: before.find((b) => b.skillId === skillId)?.level ?? "not_started",
      after: result.level,
      needsReview: result.needsReview,
    });
  }
  await logEvent(db, { userId, type: "MASTERY_RECALCULATED", courseId, payload: { skills: changes.map((c) => ({ skillId: c.skillId, before: c.before, after: c.after })) }, occurredAt: now });
  return changes;
}

// ─────────────────────── immediate-feedback submissions ─────────────────────

export const submitInputSchema = responseSchema;

export type SubmitResult =
  | { status: "invalid"; message: string }
  | { status: "pending_review" }
  | { status: "graded"; feedback: FeedbackView; tryNumber: number; locked: boolean; mastery: MasteryChange[]; duplicate: boolean };

export async function submitResponse(
  userId: string,
  input: { attemptId: string; questionId: string; response: QuestionResponse; idempotencyKey: string; timeSpentMs?: number },
  now: Date = new Date(),
): Promise<SubmitResult> {
  const db = await getDb();
  const { attempt, version } = await openAttemptItem(db, userId, input.attemptId, input.questionId, now);
  if (attempt.feedback !== "immediate") throw new DomainError("invalid", "Answers in this assessment are saved and graded when you submit.");

  const prior = await db
    .select()
    .from(t.questionResponses)
    .where(and(eq(t.questionResponses.attemptId, attempt.id), eq(t.questionResponses.questionId, input.questionId)))
    .orderBy(asc(t.questionResponses.createdAt));

  // Idempotency: a repeated submit returns the original outcome and records nothing new.
  const dup = prior.find((r) => r.idempotencyKey === input.idempotencyKey);
  if (dup && dup.score !== null) {
    const everCorrect = prior.some((r) => r.isCorrect);
    return {
      status: "graded",
      duplicate: true,
      tryNumber: dup.tryNumber,
      locked: everCorrect || IMMEDIATE_SINGLE_TRY.has(attempt.mode),
      mastery: [],
      feedback: {
        correct: Boolean(dup.isCorrect),
        score: dup.score,
        note: answerNote(version.body, dup.response as QuestionResponse, version.questionId),
        misconception: await misconceptionView(db, dup.misconceptionId),
        correctAnswer: dup.isCorrect ? describeCorrectAnswer(version.body) : null,
        solution: dup.isCorrect ? version.solution : null,
      },
    };
  }

  if (prior.some((r) => r.isCorrect)) throw new DomainError("closed", "You've already answered this question correctly.");
  if (IMMEDIATE_SINGLE_TRY.has(attempt.mode) && prior.length > 0) throw new DomainError("closed", "Review questions allow one try.");

  const graded: GradeResult = gradeResponse(version.questionId, version.body, input.response);
  if (graded.status === "invalid") return { status: "invalid", message: graded.message };

  const tryNumber = prior.length + 1;
  const [reveal] = await db.select().from(t.hintReveals).where(and(eq(t.hintReveals.attemptId, attempt.id), eq(t.hintReveals.questionId, input.questionId)));
  const hintsUsed = reveal?.hintsRevealed ?? 0;
  const solutionViewed = Boolean(reveal?.solutionViewed);
  const tutorUsed = Boolean(reveal?.tutorUsed);

  return db.transaction(async (txRaw) => {
    const tx = txRaw as unknown as Db;
    const [response] = await tx
      .insert(t.questionResponses)
      .values({
        attemptId: attempt.id,
        userId,
        courseId: attempt.courseId,
        questionId: version.questionId,
        questionVersion: version.version,
        response: input.response,
        score: graded.status === "graded" ? graded.score : null,
        isCorrect: graded.status === "graded" ? graded.correct : null,
        tryNumber,
        hintsUsed,
        solutionViewed,
        tutorUsed,
        misconceptionId: graded.status === "graded" ? graded.misconceptionId : null,
        timeSpentMs: input.timeSpentMs ? Math.min(Math.max(Math.round(input.timeSpentMs), 0), 3_600_000) : null,
        gradedBy: graded.status === "graded" ? GRADER_VERSION : null,
        gradingVersion: graded.status === "graded" ? GRADER_VERSION : null,
        idempotencyKey: input.idempotencyKey,
        createdAt: now,
        gradedAt: graded.status === "graded" ? now : null,
      })
      .returning({ id: t.questionResponses.id });

    if (graded.status === "pending_review") return { status: "pending_review" as const };

    const touched = await insertEvidence(tx, { attempt, version, responseId: response.id, score: graded.score, tryNumber, hintsUsed, solutionViewed, tutorUsed, misconceptionId: graded.misconceptionId, now });
    const policy = await resolvePolicy(tx, userId, attempt.courseId);
    for (const s of touched) {
      await recordMisconceptionSignal(tx, {
        userId,
        courseId: attempt.courseId,
        skillId: s.skillId,
        responseId: response.id,
        misconceptionId: s.isPrimary ? graded.misconceptionId : null,
        evidence: { score: graded.score, tryNumber, hintsUsed, solutionViewed, tutorUsed },
        correctThreshold: policy.config.correctThreshold,
        now,
      });
    }
    const mastery = await recomputeAfter(tx, userId, attempt.courseId, touched, now);
    const primary = touched.find((s) => s.isPrimary) ?? touched[0];
    await logEvent(tx, {
      userId,
      type: "QUESTION_SUBMITTED",
      courseId: attempt.courseId,
      skillId: primary?.skillId,
      activityType: attempt.mode,
      activityId: attempt.id,
      payload: { questionId: version.questionId, correct: graded.correct, tryNumber, hintsUsed, responseId: response.id },
      idempotencyKey: `resp:${response.id}`,
      occurredAt: now,
    });

    const single = IMMEDIATE_SINGLE_TRY.has(attempt.mode);
    const showKey = graded.correct || single || tryNumber >= 2 || solutionViewed;
    return {
      status: "graded" as const,
      duplicate: false,
      tryNumber,
      locked: graded.correct || single,
      mastery,
      feedback: {
        correct: graded.correct,
        score: graded.score,
        note: graded.note,
        misconception: await misconceptionView(tx, graded.misconceptionId),
        correctAnswer: showKey ? describeCorrectAnswer(version.body) : null,
        solution: showKey ? version.solution : null,
      },
    };
  });
}

// ───────────────────────── deferred-feedback attempts ───────────────────────

/** Save (not grade) an answer in a quiz/test. Returns whether the input is readable. */
export async function saveDraftAnswer(userId: string, input: { attemptId: string; questionId: string; response: QuestionResponse | null }, now: Date = new Date()): Promise<{ saved: boolean; message?: string }> {
  const db = await getDb();
  const { attempt, version } = await openAttemptItem(db, userId, input.attemptId, input.questionId, now);
  if (attempt.feedback !== "after_submit") throw new DomainError("invalid", "This attempt grades each answer immediately.");
  if (input.response === null) {
    await db.update(t.attempts).set({ draftAnswers: sql`${t.attempts.draftAnswers} - ${input.questionId}` }).where(eq(t.attempts.id, attempt.id));
    return { saved: true };
  }
  // Tell the student if we can't read the input — without revealing correctness.
  const check = gradeResponse(version.questionId, version.body, input.response);
  if (check.status === "invalid") return { saved: false, message: check.message };
  await db
    .update(t.attempts)
    .set({ draftAnswers: sql`${t.attempts.draftAnswers} || ${JSON.stringify({ [input.questionId]: input.response })}::jsonb` })
    .where(eq(t.attempts.id, attempt.id));
  return { saved: true };
}

export interface SubmitAttemptResult {
  attemptId: string;
  score: number;
  maxScore: number;
  pendingReview: number;
  mastery: MasteryChange[];
  alreadySubmitted: boolean;
}

/**
 * Close an attempt. Deferred modes are graded here; immediate modes were
 * graded per answer and are simply scored (first tries only).
 */
export async function submitAttempt(userId: string, attemptId: string, now: Date = new Date(), options: { expired?: boolean } = {}): Promise<SubmitAttemptResult> {
  const db = await getDb();
  const attempt = await getOwnAttempt(db, userId, attemptId);
  if (attempt.status === "submitted") return { attemptId, score: attempt.score ?? 0, maxScore: attempt.maxScore ?? attempt.items.length, pendingReview: 0, mastery: [], alreadySubmitted: true };
  if (attempt.status !== "in_progress") throw new DomainError("closed", "This attempt is closed.");

  const versions = await loadVersions(db, attempt.items);
  const deadline = deadlineOf(attempt);
  const submittedAt = options.expired && deadline ? deadline : now;

  return db.transaction(async (txRaw) => {
    const tx = txRaw as unknown as Db;
    let score = 0;
    let pendingReview = 0;
    const touched: { skillId: string; evidenceId: string }[] = [];
    const policy = await resolvePolicy(tx, userId, attempt.courseId);

    if (attempt.feedback === "after_submit") {
      // Assistance recorded during the attempt (hints/tutor, when the assessment allowed them) discounts credit.
      const reveals = await tx.select().from(t.hintReveals).where(eq(t.hintReveals.attemptId, attempt.id));
      const assistOf = (questionId: string) => {
        const r = reveals.find((x) => x.questionId === questionId);
        return { hintsUsed: r?.hintsRevealed ?? 0, solutionViewed: Boolean(r?.solutionViewed), tutorUsed: Boolean(r?.tutorUsed) };
      };
      for (const item of attempt.items) {
        const version = versions.get(item.questionId);
        const draft = attempt.draftAnswers[item.questionId];
        if (!version || draft === undefined) continue; // Unanswered: scores 0, creates no mastery evidence.
        const parsed = responseSchema.safeParse(draft);
        if (!parsed.success) continue;
        const graded = gradeResponse(version.questionId, version.body, parsed.data);
        if (graded.status === "invalid") continue;
        const [response] = await tx
          .insert(t.questionResponses)
          .values({
            attemptId: attempt.id,
            userId,
            courseId: attempt.courseId,
            questionId: version.questionId,
            questionVersion: version.version,
            response: parsed.data,
            score: graded.status === "graded" ? graded.score : null,
            isCorrect: graded.status === "graded" ? graded.correct : null,
            tryNumber: 1,
            ...assistOf(version.questionId),
            misconceptionId: graded.status === "graded" ? graded.misconceptionId : null,
            gradedBy: graded.status === "graded" ? GRADER_VERSION : null,
            gradingVersion: graded.status === "graded" ? GRADER_VERSION : null,
            idempotencyKey: `attempt:${attempt.id}:${version.questionId}`,
            createdAt: submittedAt,
            gradedAt: graded.status === "graded" ? submittedAt : null,
          })
          .onConflictDoNothing()
          .returning({ id: t.questionResponses.id });
        if (!response) continue;
        if (graded.status === "pending_review") {
          pendingReview += 1;
          continue;
        }
        score += graded.score;
        const rows = await insertEvidence(tx, { attempt, version, responseId: response.id, score: graded.score, tryNumber: 1, ...assistOf(version.questionId), misconceptionId: graded.misconceptionId, now: submittedAt });
        for (const s of rows) {
          touched.push(s);
          await recordMisconceptionSignal(tx, {
            userId,
            courseId: attempt.courseId,
            skillId: s.skillId,
            responseId: response.id,
            misconceptionId: s.isPrimary ? graded.misconceptionId : null,
            evidence: { score: graded.score, tryNumber: 1, ...assistOf(version.questionId) },
            correctThreshold: policy.config.correctThreshold,
            now: submittedAt,
          });
        }
      }
    } else {
      // Immediate modes: only the first try at each item counts toward the score.
      const firstTries = await tx.select().from(t.questionResponses).where(and(eq(t.questionResponses.attemptId, attempt.id), eq(t.questionResponses.tryNumber, 1)));
      score = firstTries.reduce((sum, r) => sum + (r.score ?? 0), 0);
    }

    const maxScore = attempt.items.length;
    await tx.update(t.attempts).set({ status: "submitted", submittedAt, score, maxScore, draftAnswers: {} }).where(eq(t.attempts.id, attempt.id));
    const mastery = await recomputeAfter(tx, userId, attempt.courseId, touched, submittedAt);

    if (attempt.assignmentId) {
      const [assignment] = await tx.select().from(t.assignments).where(eq(t.assignments.id, attempt.assignmentId));
      if (assignment) {
        const [override] = await tx.select().from(t.assignmentOverrides).where(and(eq(t.assignmentOverrides.assignmentId, assignment.id), eq(t.assignmentOverrides.studentId, userId)));
        const due = override?.dueAt ?? assignment.dueAt;
        const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(t.submissions).where(and(eq(t.submissions.assignmentId, assignment.id), eq(t.submissions.studentId, userId)));
        await tx.insert(t.submissions).values({
          assignmentId: assignment.id,
          studentId: userId,
          attemptId: attempt.id,
          attemptNumber: n + 1,
          status: due && submittedAt.getTime() > due.getTime() ? "late" : "submitted",
          score: pendingReview ? null : score,
          maxScore,
          submittedAt,
        });
      }
    }

    if (attempt.mode !== "lesson_check")
      await logEvent(tx, {
        userId,
        type: attempt.mode === "course_review" ? "REVIEW_COMPLETED" : "ASSESSMENT_SUBMITTED",
        courseId: attempt.courseId,
        activityType: attempt.mode,
        activityId: attempt.id,
        payload: { score, maxScore, expired: Boolean(options.expired), assignmentId: attempt.assignmentId },
        idempotencyKey: `attempt-submitted:${attempt.id}`,
        occurredAt: submittedAt,
      });

    return { attemptId, score, maxScore, pendingReview, mastery, alreadySubmitted: false };
  });
}

// ─────────────────────────── teacher rubric grading ─────────────────────────

/**
 * Score a written response against its rubric. The caller must already have
 * verified that `graderId` is staff for the student's class.
 */
export async function gradeWrittenResponse(graderId: string, responseId: string, rubricScores: Record<string, number>, now: Date = new Date()): Promise<{ score: number }> {
  const db = await getDb();
  const [response] = await db.select().from(t.questionResponses).where(eq(t.questionResponses.id, responseId));
  if (!response) throw new DomainError("not_found", "Response not found.");
  const [version] = await db
    .select()
    .from(t.questionVersions)
    .where(and(eq(t.questionVersions.questionId, response.questionId), eq(t.questionVersions.version, response.questionVersion)));
  if (!version || version.body.type !== "short_response") throw new DomainError("invalid", "This response is graded automatically.");
  const rubric = version.body.rubric;
  let earned = 0;
  let possible = 0;
  for (const c of rubric) {
    const given = rubricScores[c.id];
    if (typeof given !== "number" || given < 0 || given > c.points) throw new DomainError("invalid", `Score for "${c.description}" must be between 0 and ${c.points}.`);
    earned += given;
    possible += c.points;
  }
  const score = possible ? earned / possible : 0;
  const [attempt] = await db.select().from(t.attempts).where(eq(t.attempts.id, response.attemptId));
  if (!attempt) throw new DomainError("not_found", "Attempt not found.");

  await db.transaction(async (txRaw) => {
    const tx = txRaw as unknown as Db;
    const regrade = response.score !== null;
    await tx
      .update(t.questionResponses)
      .set({ score, isCorrect: score >= 0.999, rubricScores, gradedBy: `teacher:${graderId}`, gradingVersion: "rubric:1", gradedAt: now })
      .where(eq(t.questionResponses.id, responseId));
    await tx.insert(t.auditLogs).values({ actorId: graderId, action: regrade ? "response.regraded" : "response.graded", entityType: "question_response", entityId: responseId, metadata: { score, previous: response.score } });
    if (regrade) {
      await tx.update(t.masteryEvidence).set({ score, scoringVersion: `rubric:1:teacher:${graderId}` }).where(eq(t.masteryEvidence.responseId, responseId));
      const rows = await tx.select({ skillId: t.masteryEvidence.skillId, id: t.masteryEvidence.id }).from(t.masteryEvidence).where(eq(t.masteryEvidence.responseId, responseId));
      for (const r of rows) await recomputeSkill(tx, { userId: response.userId, skillId: r.skillId, courseId: response.courseId, trigger: "rebuild", now });
    } else {
      const touched = await insertEvidence(tx, { attempt, version, responseId, score, tryNumber: response.tryNumber, hintsUsed: response.hintsUsed, solutionViewed: response.solutionViewed, tutorUsed: response.tutorUsed, misconceptionId: null, now: response.createdAt });
      await recomputeAfter(tx, response.userId, response.courseId, touched, now);
    }
    // Refresh the attempt score now that nothing may be pending.
    const all = await tx.select({ score: t.questionResponses.score, tryNumber: t.questionResponses.tryNumber }).from(t.questionResponses).where(eq(t.questionResponses.attemptId, attempt.id));
    if (attempt.status === "submitted" && all.every((r) => r.score !== null)) {
      const total = all.filter((r) => r.tryNumber === 1).reduce((s, r) => s + (r.score ?? 0), 0);
      await tx.update(t.attempts).set({ score: total }).where(eq(t.attempts.id, attempt.id));
      await tx.update(t.submissions).set({ score: total }).where(eq(t.submissions.attemptId, attempt.id));
    }
  });
  return { score };
}
