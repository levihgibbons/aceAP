/**
 * AP exam readiness: an evidence summary, never a score prediction.
 *
 * Built on the student's mastery projection (via getCourseOverview, which
 * reads through RLS) plus their submitted exam-practice / unit-test attempts.
 * Skills with no evidence are reported as untested — never as known and never
 * as weak — and roll-ups never read Proficient while any skill is untested.
 */
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { asUser, getDb, type Actor } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { getCourseTree, type CourseTree } from "@/modules/curriculum/queries";
import { getCourseOverview, type CourseOverview } from "@/modules/learning/overview";
import { LEVEL_LABEL, LEVEL_RANK, type MasteryLevel } from "@/modules/mastery/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const round1 = (x: number) => Math.round(x * 10) / 10;
const practiceHref = (skillId: string) => `/app/practice/${skillId}`;
const MAX_REVIEW_STEPS = 12;
const RECENT_FOR_CONSISTENCY = 5;

export const READINESS_DISCLAIMER =
  "This is not a predicted AP score. AceAP has no validated model for predicting AP exam scores. This page only summarises the practice evidence recorded in AceAP for this course: skills you haven't practised are shown as untested, and AceAP covers only part of most AP courses.";

// ─────────────────────────────────── types ──────────────────────────────────

export interface UnitReadiness {
  unitId: string;
  number: number;
  title: string;
  /** "outline" units have no AceAP lessons or skills yet. */
  status: "available" | "outline";
  totalSkills: number;
  skillsWithEvidence: number;
  proficientOrBetter: number;
  /** Conservative roll-up: never Proficient while any skill in the unit is untested. */
  level: MasteryLevel;
}

export interface WeakObjective {
  objectiveId: string;
  code: string;
  description: string;
  unitId: string;
  level: MasteryLevel;
  totalSkills: number;
  skillsWithEvidence: number;
  reason: string;
  /** Tested skills below Proficient, weakest first. */
  weakSkills: { skillId: string; name: string; level: MasteryLevel }[];
}

export interface UntestedObjective {
  objectiveId: string;
  code: string;
  description: string;
  unitId: string;
  totalSkills: number;
  /** 0 = nothing tested; >0 = some skills tested (all at Proficient or better) but not all. */
  skillsWithEvidence: number;
}

export interface PracticeAttempt {
  attemptId: string;
  mode: "exam_practice" | "unit_test";
  assessmentId: string | null;
  title: string;
  score: number | null;
  maxScore: number | null;
  percent: number | null;
  submittedAt: Date | null;
  timed: boolean;
}

export interface PracticeConsistency {
  /** Number of recent scored attempts considered. */
  recentCount: number;
  min: number;
  max: number;
  /** max − min, in percentage points. */
  spread: number;
  mean: number;
  note: string;
}

export interface ReviewStep {
  skillId: string;
  name: string;
  level: MasteryLevel;
  kind: "prerequisite" | "review_due" | "weak_skill";
  why: string;
  href: string;
}

export interface ExamReadiness {
  courseId: string;
  courseName: string;
  courseStatus: t.CourseContentStatus;
  generatedAt: Date;
  totalSkills: number;
  skillsWithEvidence: number;
  /** Share of course skills with any graded evidence. */
  coverage: number;
  /** Share of ALL course skills at Proficient or Mastered (untested count against it). */
  masteryShare: number;
  perUnit: UnitReadiness[];
  /** Objectives with tested skills below Proficient, weakest first. */
  weakestObjectives: WeakObjective[];
  /** Objectives with no evidence at all, listed separately — unknown, not weak. */
  untested: UntestedObjective[];
  /** Objectives whose tested skills are all Proficient+ but that still have untested skills. */
  partiallyTested: UntestedObjective[];
  practiceResults: { attempts: PracticeAttempt[]; consistency: PracticeConsistency | null };
  reviewSequence: ReviewStep[];
  disclaimer: string;
}

// ───────────────────────────────── helpers ──────────────────────────────────

/** Students may see only themselves; staff only students in a class they run for this course. */
async function assertCanView(actor: Actor, studentId: string, courseId: string): Promise<void> {
  if (!UUID.test(studentId)) throw new DomainError("not_found", "Student not found.");
  if (actor.id === studentId || actor.role === "platform_admin") return;
  if (actor.role === "student") throw new DomainError("forbidden", "You can only view your own exam readiness.");
  const rows = await asUser(actor, (tx) =>
    tx
      .select({ classId: t.classEnrollments.classId })
      .from(t.classEnrollments)
      .innerJoin(t.classes, eq(t.classes.id, t.classEnrollments.classId))
      .where(and(eq(t.classEnrollments.studentId, studentId), eq(t.classEnrollments.status, "active"), eq(t.classes.courseId, courseId), sql`${t.classes.archivedAt} is null`))
      .limit(1),
  );
  if (rows.length === 0) throw new DomainError("not_found", "Student not found.");
}

function levelOf(o: CourseOverview, skillId: string): MasteryLevel {
  return o.states.get(skillId)?.level ?? "not_started";
}

const belowProficient = (l: MasteryLevel) => LEVEL_RANK[l] < LEVEL_RANK.proficient;

function independentRecord(o: CourseOverview, skillId: string): string {
  const e = o.states.get(skillId)?.explanation;
  return e ? `${e.independentCorrect} of ${e.independentAttempts} answered correctly without help` : "no graded answers yet";
}

function perUnit(o: CourseOverview): UnitReadiness[] {
  return o.tree.units.map((u) => {
    const r = o.rollups.units.get(u.id);
    return {
      unitId: u.id,
      number: u.number,
      title: u.title,
      status: u.status,
      totalSkills: r?.totalSkills ?? 0,
      skillsWithEvidence: r?.skillsWithEvidence ?? 0,
      proficientOrBetter: r?.proficientOrBetter ?? 0,
      level: r?.level ?? "not_started",
    };
  });
}

function classifyObjectives(o: CourseOverview): Pick<ExamReadiness, "weakestObjectives" | "untested" | "partiallyTested"> {
  const weak: { item: WeakObjective; sortKey: number }[] = [];
  const untested: UntestedObjective[] = [];
  const partiallyTested: UntestedObjective[] = [];
  for (const obj of o.tree.objectives.values()) {
    const r = o.rollups.objectives.get(obj.id);
    if (!r) continue;
    const base = { objectiveId: obj.id, code: obj.code, description: obj.description, unitId: obj.unitId, totalSkills: r.totalSkills, skillsWithEvidence: r.skillsWithEvidence };
    if (r.skillsWithEvidence === 0) {
      untested.push(base);
      continue;
    }
    const weakSkills = obj.skillIds
      .filter((id) => o.states.has(id) && belowProficient(levelOf(o, id)))
      .map((id) => ({ skillId: id, name: o.tree.skills.get(id)?.name ?? id, level: levelOf(o, id), estimate: o.states.get(id)?.estimate ?? 0 }))
      .sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || a.estimate - b.estimate);
    if (weakSkills.length === 0) {
      if (r.skillsWithEvidence < r.totalSkills) partiallyTested.push(base);
      continue;
    }
    const w = weakSkills[0];
    const untestedCount = r.totalSkills - r.skillsWithEvidence;
    const reason = `${w.name} is ${LEVEL_LABEL[w.level]} (${independentRecord(o, w.skillId)})${weakSkills.length > 1 ? `; ${weakSkills.length - 1} more skill${weakSkills.length > 2 ? "s" : ""} below Proficient` : ""}${untestedCount ? `; ${untestedCount} skill${untestedCount > 1 ? "s" : ""} not yet tested` : ""}.`;
    weak.push({ item: { ...base, level: r.level, reason, weakSkills: weakSkills.map(({ skillId, name, level }) => ({ skillId, name, level })) }, sortKey: LEVEL_RANK[w.level] * 10 + w.estimate });
  }
  weak.sort((a, b) => a.sortKey - b.sortKey);
  return { weakestObjectives: weak.map((x) => x.item), untested, partiallyTested };
}

/**
 * Prerequisite-aware study order:
 *   1. weaker prerequisites of weak skills (deepest prerequisite first),
 *   2. spaced reviews that are due / skills flagged by recent misses,
 *   3. remaining weak skills, weakest first.
 * Any skill is preceded by its own below-Proficient prerequisites.
 */
function buildReviewSequence(o: CourseOverview): ReviewStep[] {
  const { tree } = o;
  const name = (id: string) => tree.skills.get(id)?.name ?? id;
  const prereqs = (id: string) => tree.skills.get(id)?.prerequisites ?? [];
  const weak = tree.skillIds
    .filter((id) => o.states.has(id) && belowProficient(levelOf(o, id)))
    .sort((a, b) => LEVEL_RANK[levelOf(o, a)] - LEVEL_RANK[levelOf(o, b)] || (o.states.get(a)?.estimate ?? 0) - (o.states.get(b)?.estimate ?? 0));
  const flagged = tree.skillIds.filter((id) => o.states.get(id)?.needsReview);
  const due = [...new Set([...o.reviewsDue.map((r) => r.skillId), ...flagged])].filter((id) => tree.skills.has(id));

  const prereqWhy = (p: string, dependent: string) => {
    const l = levelOf(o, p);
    return `${name(dependent)} builds on this, and it is ${l === "not_started" ? "not yet practised" : `currently ${LEVEL_LABEL[l]}`}. Strengthen it first.`;
  };
  const steps: ReviewStep[] = [];
  const added = new Set<string>();
  const add = (id: string, kind: ReviewStep["kind"], why: string, visiting = new Set<string>()) => {
    if (added.has(id) || visiting.has(id)) return;
    visiting.add(id);
    for (const p of prereqs(id)) {
      if (tree.skills.has(p) && belowProficient(levelOf(o, p))) add(p, "prerequisite", prereqWhy(p, id), visiting);
    }
    added.add(id);
    steps.push({ skillId: id, name: name(id), level: levelOf(o, id), kind, why, href: practiceHref(id) });
  };

  for (const w of weak) for (const p of prereqs(w)) if (tree.skills.has(p) && belowProficient(levelOf(o, p))) add(p, "prerequisite", prereqWhy(p, w));
  for (const d of due) {
    const reason = o.states.get(d)?.explanation.reviewReason;
    add(d, "review_due", reason === "recent_misses" ? "Recent answers slipped — a short review will confirm what you still know." : reason === "dropped_below_proficient" ? "This was Proficient before; recent work fell below it." : "A spaced review is due.");
  }
  for (const w of weak) add(w, "weak_skill", `${LEVEL_LABEL[levelOf(o, w)]}: ${independentRecord(o, w)}.`);
  return steps.slice(0, MAX_REVIEW_STEPS);
}

async function loadPracticeAttempts(actor: Actor, studentId: string, tree: CourseTree): Promise<PracticeAttempt[]> {
  const rows = await asUser(actor, (tx) =>
    tx
      .select({ id: t.attempts.id, mode: t.attempts.mode, assessmentId: t.attempts.assessmentId, score: t.attempts.score, maxScore: t.attempts.maxScore, submittedAt: t.attempts.submittedAt, timeLimitSeconds: t.attempts.timeLimitSeconds })
      .from(t.attempts)
      .where(and(eq(t.attempts.userId, studentId), eq(t.attempts.courseId, tree.course.id), eq(t.attempts.status, "submitted"), inArray(t.attempts.mode, ["exam_practice", "unit_test"])))
      .orderBy(desc(t.attempts.submittedAt))
      .limit(30),
  );
  const titles = new Map(tree.assessments.map((a) => [a.id, a.title]));
  return rows.map((r) => ({
    attemptId: r.id,
    mode: r.mode as PracticeAttempt["mode"],
    assessmentId: r.assessmentId,
    title: (r.assessmentId && titles.get(r.assessmentId)) || (r.mode === "exam_practice" ? "Mixed exam practice set" : "Unit test"),
    score: r.score,
    maxScore: r.maxScore,
    percent: r.score !== null && r.maxScore ? round1((r.score / r.maxScore) * 100) : null,
    submittedAt: r.submittedAt,
    timed: r.timeLimitSeconds !== null,
  }));
}

function consistencyOf(attempts: PracticeAttempt[]): PracticeConsistency | null {
  const recent = attempts.map((a) => a.percent).filter((p): p is number => p !== null).slice(0, RECENT_FOR_CONSISTENCY);
  if (recent.length < 2) return null;
  const min = Math.min(...recent);
  const max = Math.max(...recent);
  return {
    recentCount: recent.length,
    min,
    max,
    spread: round1(max - min),
    mean: round1(recent.reduce((s, x) => s + x, 0) / recent.length),
    note: `Range of your last ${recent.length} practice scores. A small range means consistent results; it is not a score prediction.`,
  };
}

// ──────────────────────────────────── API ───────────────────────────────────

/** Evidence-based exam readiness for one student in one course. Not a score prediction. */
export async function getExamReadiness(actor: Actor, studentId: string, courseId: string, now: Date = new Date()): Promise<ExamReadiness> {
  await assertCanView(actor, studentId, courseId);
  const overview = await getCourseOverview(actor, studentId, courseId, now);
  const course = overview.rollups.course;
  const attempts = await loadPracticeAttempts(actor, studentId, overview.tree);
  return {
    courseId,
    courseName: overview.tree.course.name,
    courseStatus: overview.tree.course.contentStatus,
    generatedAt: now,
    totalSkills: course.totalSkills,
    skillsWithEvidence: course.skillsWithEvidence,
    coverage: course.coverage,
    masteryShare: course.masteryShare,
    perUnit: perUnit(overview),
    ...classifyObjectives(overview),
    practiceResults: { attempts, consistency: consistencyOf(attempts) },
    reviewSequence: buildReviewSequence(overview),
    disclaimer: READINESS_DISCLAIMER,
  };
}

export interface ExamPracticeOptions {
  courseId: string;
  courseName: string;
  assessments: {
    id: string;
    kind: "exam_practice" | "unit_test";
    title: string;
    description: string;
    unitId: string | null;
    questionCount: number;
    timeLimitSeconds: number | null;
    href: string;
  }[];
  mixedAdaptive: {
    available: boolean;
    /** Auto-gradable published questions in the course. */
    questionCount: number;
    minimumQuestions: number;
    reason: string;
    /** Pass to startAttempt to begin a mixed set. */
    startSpec: { kind: "exam_mixed"; courseId: string };
  };
}

export const MIXED_SET_MIN_QUESTIONS = 4;

/** Curriculum exam-practice sets and unit tests, plus whether a mixed adaptive set is possible. */
export async function listExamPracticeOptions(courseId: string): Promise<ExamPracticeOptions> {
  if (typeof courseId !== "string" || courseId.length === 0 || courseId.length > 100) throw new DomainError("not_found", "Course not found.");
  const tree = await getCourseTree(courseId);
  if (!tree) throw new DomainError("not_found", "Course not found.");
  const db = await getDb();
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(t.questions)
    .where(and(eq(t.questions.courseId, courseId), sql`${t.questions.publishedVersion} is not null`, sql`${t.questions.type} <> 'short_response'`));
  const available = n >= MIXED_SET_MIN_QUESTIONS;
  return {
    courseId,
    courseName: tree.course.name,
    assessments: tree.assessments
      .filter((a): a is typeof a & { kind: "exam_practice" | "unit_test" } => a.kind === "exam_practice" || a.kind === "unit_test")
      .map((a) => ({ id: a.id, kind: a.kind, title: a.title, description: a.description, unitId: a.unitId, questionCount: a.questionCount, timeLimitSeconds: a.timeLimitSeconds, href: `/app/assessments/${a.id}` })),
    mixedAdaptive: {
      available,
      questionCount: n,
      minimumQuestions: MIXED_SET_MIN_QUESTIONS,
      reason: available
        ? `A mixed set draws from ${n} auto-graded questions, weighted toward your weakest skills.`
        : `A mixed set needs at least ${MIXED_SET_MIN_QUESTIONS} auto-graded questions; this course has ${n}.`,
      startSpec: { kind: "exam_mixed", courseId },
    },
  };
}
