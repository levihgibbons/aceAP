/**
 * Teacher-facing read models. Per-student records are read with `asUser`, so
 * row-level security limits a teacher to students actively enrolled in a class
 * they are responsible for, and only for that class's course.
 *
 * Dashboards read projections (mastery_states, activity_aggregates,
 * lesson_progress) — never the raw attempt log — and drill down to evidence
 * only when a cell is opened.
 */
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { asUser, getDb, type Actor } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { getCourseTree, type CourseTree } from "@/modules/curriculum/queries";
import { rollup, type Rollup } from "@/modules/mastery/aggregation";
import { LEVEL_RANK, MASTERY_LEVELS, type MasteryLevel } from "@/modules/mastery/types";
import { assertClassStaff, type StaffUser } from "./service";

export interface RosterStudent {
  id: string;
  name: string;
  email: string;
  isDemo: boolean;
  joinedAt: Date;
}

async function loadClass(user: StaffUser, classId: string) {
  const db = await getDb();
  const cls = await assertClassStaff(db, user, classId);
  const tree = await getCourseTree(cls.courseId);
  if (!tree) throw new DomainError("not_found", "Course not found.");
  return { cls, tree };
}

export async function getRoster(user: StaffUser, classId: string): Promise<RosterStudent[]> {
  await loadClass(user, classId);
  return asUser(user as Actor, async (tx) =>
    tx
      .select({ id: t.users.id, name: t.users.name, email: t.users.email, isDemo: t.users.isDemo, joinedAt: t.classEnrollments.joinedAt })
      .from(t.classEnrollments)
      .innerJoin(t.users, eq(t.users.id, t.classEnrollments.studentId))
      .where(and(eq(t.classEnrollments.classId, classId), eq(t.classEnrollments.status, "active")))
      .orderBy(t.users.name),
  );
}

export interface MatrixColumn {
  id: string;
  kind: "objective" | "skill";
  label: string;
  code: string | null;
  description: string;
  unitId: string;
  skillIds: string[];
  /** Class distribution for this column, counting students with no evidence. */
  distribution: Record<MasteryLevel, number>;
  needsReview: number;
}

export interface MatrixCell {
  level: MasteryLevel;
  needsReview: boolean;
  /** Skills in the column that have any evidence / total skills in the column. */
  skillsWithEvidence: number;
  totalSkills: number;
  /** Mean estimate over skills WITH evidence (null if none) — for the tooltip only. */
  estimate: number | null;
}

export interface MasteryMatrix {
  classId: string;
  className: string;
  courseId: string;
  courseName: string;
  groupBy: "objective" | "skill";
  units: { id: string; title: string; number: number }[];
  columns: MatrixColumn[];
  students: RosterStudent[];
  /** cells[studentId][columnId] */
  cells: Record<string, Record<string, MatrixCell>>;
}

function columnsFor(tree: CourseTree, groupBy: "objective" | "skill", unitId?: string): Omit<MatrixColumn, "distribution" | "needsReview">[] {
  const cols: Omit<MatrixColumn, "distribution" | "needsReview">[] = [];
  for (const u of tree.units) {
    if (unitId && u.id !== unitId) continue;
    for (const tp of u.topics) {
      for (const o of tp.objectives) {
        if (groupBy === "objective") cols.push({ id: o.id, kind: "objective", label: o.code, code: o.code, description: o.description, unitId: u.id, skillIds: o.skillIds });
        else
          for (const s of o.skillIds) {
            const skill = tree.skills.get(s);
            if (skill && !cols.some((c) => c.id === s)) cols.push({ id: s, kind: "skill", label: skill.name, code: o.code, description: skill.description, unitId: u.id, skillIds: [s] });
          }
      }
    }
  }
  return cols;
}

export async function getMasteryMatrix(user: StaffUser, classId: string, options: { groupBy?: "objective" | "skill"; unitId?: string } = {}): Promise<MasteryMatrix> {
  const { cls, tree } = await loadClass(user, classId);
  const groupBy = options.groupBy ?? "objective";
  const students = await getRoster(user, classId);
  const ids = students.map((s) => s.id);
  const states = ids.length
    ? await asUser(user as Actor, (tx) =>
        tx
          .select({ userId: t.masteryStates.userId, skillId: t.masteryStates.skillId, level: t.masteryStates.level, estimate: t.masteryStates.estimate, needsReview: t.masteryStates.needsReview })
          .from(t.masteryStates)
          .where(and(eq(t.masteryStates.courseId, cls.courseId), inArray(t.masteryStates.userId, ids))),
      )
    : [];
  const byStudent = new Map<string, Map<string, (typeof states)[number]>>();
  for (const s of states) {
    const m = byStudent.get(s.userId) ?? new Map();
    m.set(s.skillId, s);
    byStudent.set(s.userId, m);
  }

  const baseCols = columnsFor(tree, groupBy, options.unitId);
  const cells: MasteryMatrix["cells"] = {};
  const columns: MatrixColumn[] = baseCols.map((c) => ({ ...c, distribution: Object.fromEntries(MASTERY_LEVELS.map((l) => [l, 0])) as Record<MasteryLevel, number>, needsReview: 0 }));
  for (const student of students) {
    const mine = byStudent.get(student.id) ?? new Map();
    cells[student.id] = {};
    for (const col of columns) {
      const r: Rollup = rollup(col.skillIds, mine);
      const withEvidence = col.skillIds.map((sid) => mine.get(sid)).filter((x): x is (typeof states)[number] => Boolean(x));
      cells[student.id][col.id] = {
        level: r.level,
        needsReview: r.needsReview > 0,
        skillsWithEvidence: r.skillsWithEvidence,
        totalSkills: r.totalSkills,
        estimate: withEvidence.length ? withEvidence.reduce((s, x) => s + x.estimate, 0) / withEvidence.length : null,
      };
      col.distribution[r.level] += 1;
      if (r.needsReview > 0) col.needsReview += 1;
    }
  }

  return {
    classId,
    className: cls.name,
    courseId: cls.courseId,
    courseName: tree.course.name,
    groupBy,
    units: tree.units.filter((u) => u.status === "available").map((u) => ({ id: u.id, title: u.title, number: u.number })),
    columns,
    students,
    cells,
  };
}

export interface AttentionItem {
  columnId: string;
  label: string;
  description: string;
  /** Students with evidence who are below Proficient. */
  struggling: number;
  /** Students with no evidence at all — unknown, not weak. */
  noEvidence: number;
  proficient: number;
}

/** Objectives where the most students with evidence are below Proficient. */
export function objectivesNeedingAttention(matrix: MasteryMatrix, limit = 4): AttentionItem[] {
  return matrix.columns
    .map((c) => ({
      columnId: c.id,
      label: c.label,
      description: c.description,
      struggling: c.distribution.developing + c.distribution.approaching,
      noEvidence: c.distribution.not_started,
      proficient: c.distribution.proficient + c.distribution.mastered,
    }))
    .filter((x) => x.struggling > 0)
    .sort((a, b) => b.struggling - a.struggling || a.proficient - b.proficient)
    .slice(0, limit);
}

export interface InterventionPlan {
  column: MatrixColumn;
  /** Evidence shows difficulty: below Proficient with graded work. */
  needsSupport: { student: RosterStudent; cell: MatrixCell }[];
  /** No graded work yet — assign practice to find out, don't assume weakness. */
  insufficientEvidence: RosterStudent[];
  /** Proficient but flagged for review. */
  needsReview: RosterStudent[];
  onTrack: RosterStudent[];
  suggestedLessons: { id: string; title: string }[];
  suggestedAssessments: { id: string; title: string }[];
  skills: { id: string; name: string }[];
}

/**
 * A temporary, evidence-based grouping for ONE objective or skill, recomputed
 * from current mastery every time it is opened. It is never stored as a
 * standing "ability group".
 */
export async function getInterventionPlan(user: StaffUser, classId: string, columnId: string): Promise<InterventionPlan> {
  const { tree } = await loadClass(user, classId);
  const groupBy = tree.objectives.has(columnId) ? "objective" : "skill";
  const matrix = await getMasteryMatrix(user, classId, { groupBy });
  const column = matrix.columns.find((c) => c.id === columnId);
  if (!column) throw new DomainError("not_found", "Objective or skill not found in this class's course.");
  const plan: InterventionPlan = { column, needsSupport: [], insufficientEvidence: [], needsReview: [], onTrack: [], suggestedLessons: [], suggestedAssessments: [], skills: [] };
  for (const s of matrix.students) {
    const cell = matrix.cells[s.id][columnId];
    if (cell.skillsWithEvidence === 0) plan.insufficientEvidence.push(s);
    else if (LEVEL_RANK[cell.level] < LEVEL_RANK.proficient) plan.needsSupport.push({ student: s, cell });
    else if (cell.needsReview) plan.needsReview.push(s);
    else plan.onTrack.push(s);
  }
  plan.needsSupport.sort((a, b) => LEVEL_RANK[a.cell.level] - LEVEL_RANK[b.cell.level]);
  const lessonIds = new Set(column.skillIds.flatMap((sid) => tree.skills.get(sid)?.lessonIds ?? []));
  plan.suggestedLessons = tree.lessonOrder.filter((id) => lessonIds.has(id)).map((id) => ({ id, title: tree.lessons.get(id)!.title }));
  plan.suggestedAssessments = tree.assessments.filter((a) => a.skillIds.some((s) => column.skillIds.includes(s)) && a.kind !== "exam_practice").map((a) => ({ id: a.id, title: a.title }));
  plan.skills = column.skillIds.map((id) => ({ id, name: tree.skills.get(id)?.name ?? id }));
  return plan;
}

// ──────────────────────────────── engagement ────────────────────────────────

export interface StudentEngagement {
  studentId: string;
  activeMs: number;
  openMs: number;
  byKind: Record<t.ActivityKind, number>;
  /** Active ms per day, oldest → newest, covering `days`. */
  daily: number[];
  lessonsCompleted: number;
  lastActiveDay: string | null;
}

export interface ClassEngagement {
  days: number;
  dayLabels: string[];
  students: Record<string, StudentEngagement>;
  totalActiveMs: number;
  idleThresholdSeconds: number;
}

const DAY_MS = 86_400_000;

export async function getClassEngagement(user: StaffUser, classId: string, days = 14, now: Date = new Date()): Promise<ClassEngagement> {
  const { cls } = await loadClass(user, classId);
  const students = await getRoster(user, classId);
  const ids = students.map((s) => s.id);
  const dayLabels = Array.from({ length: days }, (_, i) => new Date(now.getTime() - (days - 1 - i) * DAY_MS).toISOString().slice(0, 10));
  const from = dayLabels[0];

  const { aggregates, lessons } = ids.length
    ? await asUser(user as Actor, async (tx) => ({
        aggregates: await tx
          .select()
          .from(t.activityAggregates)
          .where(and(eq(t.activityAggregates.courseId, cls.courseId), inArray(t.activityAggregates.userId, ids), gte(t.activityAggregates.day, from))),
        lessons: await tx
          .select({ userId: t.lessonProgress.userId, n: sql<number>`count(*)::int` })
          .from(t.lessonProgress)
          .where(and(eq(t.lessonProgress.courseId, cls.courseId), inArray(t.lessonProgress.userId, ids), eq(t.lessonProgress.status, "completed")))
          .groupBy(t.lessonProgress.userId),
      }))
    : { aggregates: [], lessons: [] };

  const out: Record<string, StudentEngagement> = {};
  for (const s of students)
    out[s.id] = { studentId: s.id, activeMs: 0, openMs: 0, byKind: { lesson: 0, practice: 0, assessment: 0, simulation: 0 }, daily: dayLabels.map(() => 0), lessonsCompleted: lessons.find((l) => l.userId === s.id)?.n ?? 0, lastActiveDay: null };
  let total = 0;
  for (const a of aggregates) {
    const e = out[a.userId];
    if (!e) continue;
    e.activeMs += a.activeMs;
    e.openMs += a.openMs;
    e.byKind[a.activityKind] += a.activeMs;
    const idx = dayLabels.indexOf(a.day);
    if (idx >= 0) e.daily[idx] += a.activeMs;
    if (a.activeMs > 0 && (!e.lastActiveDay || a.day > e.lastActiveDay)) e.lastActiveDay = a.day;
    total += a.activeMs;
  }
  return { days, dayLabels, students: out, totalActiveMs: total, idleThresholdSeconds: Number(process.env.ACTIVE_TIME_IDLE_THRESHOLD_SECONDS ?? 60) };
}

// ───────────────────────────── class overview ───────────────────────────────

export interface RecentActivityItem {
  at: Date;
  studentId: string;
  studentName: string;
  type: t.LearningEventType;
  summary: string;
}

const EVENT_SUMMARY: Partial<Record<t.LearningEventType, (p: Record<string, unknown>, activityType: string | null) => string>> = {
  LESSON_COMPLETED: () => "completed a lesson",
  ASSESSMENT_SUBMITTED: (p, kind) => `submitted ${kind === "unit_test" ? "a unit test" : kind === "exam_practice" ? "an exam practice set" : kind === "guided_practice" ? "a practice set" : "a quiz"} (${p.score ?? "?"}/${p.maxScore ?? "?"})`,
  REVIEW_COMPLETED: (p) => `finished a mixed review (${p.score ?? "?"}/${p.maxScore ?? "?"})`,
  NOTE_CREATED: () => "added a note to their vault",
};

export async function getRecentActivity(user: StaffUser, classId: string, limit = 12): Promise<RecentActivityItem[]> {
  const { cls } = await loadClass(user, classId);
  const students = await getRoster(user, classId);
  if (students.length === 0) return [];
  const names = new Map(students.map((s) => [s.id, s.name]));
  const rows = await asUser(user as Actor, (tx) =>
    tx
      .select()
      .from(t.learningEvents)
      .where(and(eq(t.learningEvents.courseId, cls.courseId), inArray(t.learningEvents.userId, [...names.keys()]), inArray(t.learningEvents.type, ["LESSON_COMPLETED", "ASSESSMENT_SUBMITTED", "REVIEW_COMPLETED"])))
      .orderBy(desc(t.learningEvents.occurredAt))
      .limit(limit),
  );
  return rows.map((r) => ({ at: r.occurredAt, studentId: r.userId, studentName: names.get(r.userId) ?? "Student", type: r.type, summary: EVENT_SUMMARY[r.type]?.(r.payload, r.activityType) ?? r.type.toLowerCase() }));
}

export interface StudentAttemptRow {
  id: string;
  mode: t.AttemptMode;
  title: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  startedAt: Date;
  submittedAt: Date | null;
  assignmentId: string | null;
}

/** A student's attempts in the class's course (RLS-scoped). */
export async function getStudentAttempts(user: StaffUser, courseId: string, studentId: string, limit = 30): Promise<StudentAttemptRow[]> {
  const rows = await asUser(user as Actor, (tx) =>
    tx
      .select()
      .from(t.attempts)
      .where(and(eq(t.attempts.userId, studentId), eq(t.attempts.courseId, courseId), sql`${t.attempts.mode} <> 'lesson_check'`))
      .orderBy(desc(t.attempts.startedAt))
      .limit(limit),
  );
  if (rows.length === 0) return [];
  const db = await getDb();
  const assessmentIds = [...new Set(rows.map((r) => r.assessmentId).filter((x): x is string => Boolean(x)))];
  const skillIds = [...new Set(rows.map((r) => r.skillId).filter((x): x is string => Boolean(x)))];
  const assessments = assessmentIds.length ? await db.select({ id: t.assessments.id, title: t.assessments.title }).from(t.assessments).where(inArray(t.assessments.id, assessmentIds)) : [];
  const skills = skillIds.length ? await db.select({ id: t.skills.id, name: t.skills.name }).from(t.skills).where(inArray(t.skills.id, skillIds)) : [];
  return rows.map((r) => ({
    id: r.id,
    mode: r.mode,
    title:
      assessments.find((a) => a.id === r.assessmentId)?.title ??
      (r.mode === "guided_practice" ? `Practice: ${skills.find((s) => s.id === r.skillId)?.name ?? "skill"}` : r.mode === "course_review" ? "Mixed review" : r.mode === "exam_practice" ? "Exam practice set" : "Attempt"),
    status: r.status,
    score: r.score,
    maxScore: r.maxScore,
    startedAt: r.startedAt,
    submittedAt: r.submittedAt,
    assignmentId: r.assignmentId,
  }));
}

/** Which of this teacher's classes (if any) a student belongs to. Used to authorise the student page. */
export async function classesSharedWithStudent(user: StaffUser, studentId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(studentId)) return [];
  return asUser(user as Actor, (tx) =>
    tx
      .select({ classId: t.classes.id, className: t.classes.name, courseId: t.classes.courseId, studentName: t.users.name, studentEmail: t.users.email, isDemo: t.users.isDemo })
      .from(t.classEnrollments)
      .innerJoin(t.classes, eq(t.classes.id, t.classEnrollments.classId))
      .innerJoin(t.users, eq(t.users.id, t.classEnrollments.studentId))
      .where(and(eq(t.classEnrollments.studentId, studentId), eq(t.classEnrollments.status, "active"), sql`${t.classes.archivedAt} is null`)),
  );
}
