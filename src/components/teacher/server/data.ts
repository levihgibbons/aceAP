/**
 * Server-only data helpers for the teacher pages. Authorisation always goes
 * through the domain services (assertClassStaff / row-level security); a
 * DomainError not_found/forbidden becomes a 404 "not available" page so the
 * existence of another school's class or student is never revealed.
 */
import "server-only";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray, lt } from "drizzle-orm";
import { asUser, getDb, type Actor } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { assertClassStaff, type StaffUser } from "@/modules/classrooms/service";
import { getCourseTree } from "@/modules/curriculum/queries";
import { rollup, type SkillStateLite } from "@/modules/mastery/aggregation";
import type { MasteryLevel } from "@/modules/mastery/types";
import { getGradebook, type Gradebook } from "@/modules/gradebook/service";

export function isAccessError(e: unknown): boolean {
  return e instanceof DomainError && (e.code === "not_found" || e.code === "forbidden");
}

/** Await a service call; access errors become a 404. */
export async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (isAccessError(e)) notFound();
    throw e;
  }
}

export interface ClassContext {
  id: string;
  name: string;
  courseId: string;
  courseName: string;
  versionLabel: string;
  verificationStatus: string;
  joinCode: string;
  aiPolicy: t.AiPolicy;
  organizationId: string;
  organizationName: string;
  studentCount: number;
  tree: NonNullable<Awaited<ReturnType<typeof getCourseTree>>>;
}

/** Authorise the class for this staff member and load its header data (404 otherwise). */
export async function loadClassContext(user: StaffUser, classId: string): Promise<ClassContext> {
  const db = await getDb();
  const cls = await orNotFound(assertClassStaff(db, user, classId));
  const tree = await getCourseTree(cls.courseId);
  if (!tree) notFound();
  const [version] = await db.select().from(t.courseVersions).where(eq(t.courseVersions.id, cls.courseVersionId));
  const [org] = await db.select({ name: t.organizations.name }).from(t.organizations).where(eq(t.organizations.id, cls.organizationId));
  const enrolled = await db
    .select({ id: t.classEnrollments.studentId })
    .from(t.classEnrollments)
    .where(and(eq(t.classEnrollments.classId, cls.id), eq(t.classEnrollments.status, "active")));
  return {
    id: cls.id,
    name: cls.name,
    courseId: cls.courseId,
    courseName: tree.course.name,
    versionLabel: version?.label ?? tree.version.label,
    verificationStatus: version?.verificationStatus ?? tree.version.verificationStatus,
    joinCode: cls.joinCode,
    aiPolicy: cls.aiPolicy,
    organizationId: cls.organizationId,
    organizationName: org?.name ?? "",
    studentCount: enrolled.length,
    tree,
  };
}

/** A student's current mastery states in one course (RLS-scoped to the teacher). */
export async function studentStates(user: StaffUser, studentId: string, courseId: string) {
  return asUser(user as Actor, (tx) =>
    tx
      .select({ skillId: t.masteryStates.skillId, level: t.masteryStates.level, needsReview: t.masteryStates.needsReview, estimate: t.masteryStates.estimate })
      .from(t.masteryStates)
      .where(and(eq(t.masteryStates.userId, studentId), eq(t.masteryStates.courseId, courseId))),
  );
}

export interface SnapshotRow {
  userId: string;
  skillId: string;
  level: MasteryLevel;
  needsReview: boolean;
  estimate: number;
  createdAt: Date;
}

/** Append-only mastery history for students in a course (RLS-scoped), oldest first. */
export async function loadSnapshots(user: StaffUser, courseId: string, studentIds: string[], opts: { skillIds?: string[]; before?: Date } = {}): Promise<SnapshotRow[]> {
  if (studentIds.length === 0) return [];
  return asUser(user as Actor, (tx) =>
    tx
      .select({
        userId: t.masterySnapshots.userId,
        skillId: t.masterySnapshots.skillId,
        level: t.masterySnapshots.level,
        needsReview: t.masterySnapshots.needsReview,
        estimate: t.masterySnapshots.estimate,
        createdAt: t.masterySnapshots.createdAt,
      })
      .from(t.masterySnapshots)
      .where(
        and(
          eq(t.masterySnapshots.courseId, courseId),
          inArray(t.masterySnapshots.userId, studentIds),
          opts.skillIds?.length ? inArray(t.masterySnapshots.skillId, opts.skillIds) : undefined,
          opts.before ? lt(t.masterySnapshots.createdAt, opts.before) : undefined,
        ),
      )
      .orderBy(asc(t.masterySnapshots.createdAt)),
  );
}

/** The latest state per skill from an oldest-first snapshot list. */
export function latestBySkill(rows: SnapshotRow[]): Map<string, SkillStateLite> {
  const m = new Map<string, SkillStateLite>();
  for (const r of rows) m.set(r.skillId, { skillId: r.skillId, level: r.level, estimate: r.estimate, needsReview: r.needsReview });
  return m;
}

/**
 * Replay a student's snapshots and record each change of the rolled-up level
 * for a set of skills (an objective). Oldest first.
 */
export function rollupHistory(rows: SnapshotRow[], skillIds: string[]): { at: Date; level: MasteryLevel }[] {
  const relevant = new Set(skillIds);
  const current = new Map<string, SkillStateLite>();
  const out: { at: Date; level: MasteryLevel }[] = [];
  for (const r of rows) {
    if (!relevant.has(r.skillId)) continue;
    current.set(r.skillId, { skillId: r.skillId, level: r.level, estimate: r.estimate, needsReview: r.needsReview });
    const level = rollup(skillIds, current).level;
    if (out.length === 0 || out[out.length - 1].level !== level) out.push({ at: r.createdAt, level });
  }
  return out;
}

/** First attempt each student started on an assignment (RLS-scoped). */
export async function firstAssignmentAttempts(user: StaffUser, assignmentId: string, studentIds: string[]): Promise<Map<string, Date>> {
  if (studentIds.length === 0) return new Map();
  const rows = await asUser(user as Actor, (tx) =>
    tx
      .select({ userId: t.attempts.userId, startedAt: t.attempts.startedAt })
      .from(t.attempts)
      .where(and(eq(t.attempts.assignmentId, assignmentId), inArray(t.attempts.userId, studentIds)))
      .orderBy(asc(t.attempts.startedAt)),
  );
  const out = new Map<string, Date>();
  for (const r of rows) if (!out.has(r.userId)) out.set(r.userId, r.startedAt);
  return out;
}

/** Assignments of a class (RLS-scoped), newest due first. */
export async function classAssignments(user: StaffUser, classId: string) {
  return asUser(user as Actor, (tx) =>
    tx
      .select({ id: t.assignments.id, title: t.assignments.title, kind: t.assignments.kind, skillIds: t.assignments.skillIds, dueAt: t.assignments.dueAt, createdAt: t.assignments.createdAt, archivedAt: t.assignments.archivedAt })
      .from(t.assignments)
      .where(eq(t.assignments.classId, classId))
      .orderBy(asc(t.assignments.createdAt)),
  );
}

export interface AssignmentStatus {
  id: string;
  title: string;
  kind: t.AssignmentKind;
  dueAt: Date | null;
  assigned: number;
  submitted: number;
  late: number;
  missing: number;
}

/** Submission counts per assignment from a computed gradebook (accommodations applied). */
export function assignmentStatuses(gb: Gradebook): AssignmentStatus[] {
  return gb.assignments.map((a) => {
    const cells = gb.students.map((s) => gb.cells[s.id]?.[a.id]).filter((c): c is NonNullable<typeof c> => Boolean(c));
    return {
      id: a.id,
      title: a.title,
      kind: a.kind,
      dueAt: a.dueAt,
      assigned: cells.filter((c) => c.status !== "excused").length,
      submitted: cells.filter((c) => c.attempts > 0).length,
      late: cells.filter((c) => c.status === "late").length,
      missing: cells.filter((c) => c.status === "missing").length,
    };
  });
}

/** The gradebook, or null if it can't be computed (the page still renders). */
export async function gradebookOrNull(user: StaffUser, classId: string): Promise<Gradebook | null> {
  try {
    return await getGradebook(user, classId);
  } catch (e) {
    if (!isAccessError(e)) console.error("[teacher] gradebook unavailable", e);
    return null;
  }
}

/** Request time for server rendering (kept out of component bodies). */
export function requestTime(): number {
  return Date.now();
}
