/**
 * Gradebook: classroom grades derived from evidence, plus teacher adjustments.
 *
 *  - Grades are COMPUTED on read from projections (submissions, mastery_states)
 *    with the class's active grading policy (see ./policy.ts). Nothing here
 *    writes to evidence or mastery tables.
 *  - Teacher adjustments (override, comment, excused) live in
 *    gradebook_entries and every change appends an audit_logs row holding the
 *    previous value.
 *  - Student-private rows are read through `asUser`, so row-level security
 *    decides what the requester may see; staff access is checked first with
 *    `assertClassStaff`.
 */
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { asUser, getDb, type Actor, type Db } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { assertClassStaff, type StaffUser } from "@/modules/classrooms/service";
import { MASTERY_LEVELS, type MasteryLevel } from "@/modules/mastery/types";
import {
  DEFAULT_GRADING_POLICY,
  applyOverride,
  gradeFromCompletion,
  gradeFromMastery,
  gradeFromScore,
  gradingPolicySchema,
  type ComputedGrade,
  type GradeSource,
  type GradingPolicyConfig,
} from "./policy";

type ClassRow = typeof t.classes.$inferSelect;
type AssignmentRow = typeof t.assignments.$inferSelect;
type SubmissionRow = typeof t.submissions.$inferSelect;
type EntryRow = typeof t.gradebookEntries.$inferSelect;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const round1 = (x: number) => Math.round(x * 10) / 10;
const key = (assignmentId: string, studentId: string) => `${assignmentId}:${studentId}`;

// ─────────────────────────────────── types ──────────────────────────────────

export type GradeCellStatus = "not_submitted" | "submitted" | "late" | "awaiting_grading" | "excused" | "missing";

export interface GradeOverrideView {
  grade: number;
  reason: string | null;
  by: string | null;
  at: Date | null;
}

export interface GradebookCell {
  /** Displayed percent (0–100+, override applied) or null when there is nothing to grade. */
  percent: number | null;
  /** percent × assignment points / 100. */
  points: number | null;
  /** How the percent was produced. For overrides, `source.replaced` keeps the computed value. */
  source: GradeSource;
  status: GradeCellStatus;
  /** Number of submissions. */
  attempts: number;
  comment: string | null;
  override: GradeOverrideView | null;
  /** Due date for this student, accommodations applied. */
  dueAt: Date | null;
}

export interface GradebookAssignment {
  id: string;
  title: string;
  kind: t.AssignmentKind;
  gradingMethod: AssignmentRow["gradingMethod"];
  points: number;
  dueAt: Date | null;
  skillIds: string[];
}

export interface GradebookAverage {
  percent: number | null;
  /** Cells that contributed. */
  counted: number;
}

export interface GradingPolicyRef {
  /** Null only for a class created before grading policies existed (platform default applied). */
  id: string | null;
  version: number;
  config: GradingPolicyConfig;
}

export interface Gradebook {
  class: { id: string; name: string; courseId: string; organizationId: string };
  policy: GradingPolicyRef;
  assignments: GradebookAssignment[];
  students: { id: string; name: string }[];
  /**
   * cells[studentId][assignmentId]. A cell is absent when the assignment is
   * targeted at other students only (not assigned to this student).
   */
  cells: Record<string, Record<string, GradebookCell>>;
  averages: {
    /** Points-weighted percent per student. */
    students: Record<string, GradebookAverage>;
    /** Mean percent per assignment. */
    assignments: Record<string, GradebookAverage>;
    /** Plain-language description of how averages are formed. */
    method: string;
  };
  generatedAt: Date;
}

export const AVERAGE_METHOD =
  "Averages ignore cells with no grade (null) and excused cells; missing work is not counted as zero. Student averages are weighted by assignment points; assignment averages are the mean across students.";

// ──────────────────────────────── data loading ──────────────────────────────

interface StateLite {
  level: MasteryLevel;
  peak: MasteryLevel;
}

interface GradebookData {
  cls: ClassRow;
  policy: GradingPolicyRef;
  assignments: AssignmentRow[];
  students: { id: string; name: string }[];
  /** Assignment → targeted students (absent = whole class). */
  targets: Map<string, Set<string>>;
  dueOverrides: Map<string, Date | null>;
  submissions: Map<string, SubmissionRow[]>;
  entries: Map<string, EntryRow>;
  states: Map<string, Map<string, StateLite>>;
}

const isLevel = (x: unknown): x is MasteryLevel => typeof x === "string" && (MASTERY_LEVELS as readonly string[]).includes(x);

function pushTo<T>(map: Map<string, T[]>, k: string, value: T): void {
  const list = map.get(k);
  if (list) list.push(value);
  else map.set(k, [value]);
}

function groupBy<T>(rows: T[], keyOf: (row: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const r of rows) pushTo(out, keyOf(r), r);
  return out;
}

async function loadActivePolicy(tx: Db, classId: string): Promise<GradingPolicyRef> {
  const [row] = await tx
    .select()
    .from(t.gradingPolicies)
    .where(and(eq(t.gradingPolicies.classId, classId), eq(t.gradingPolicies.isActive, true)))
    .orderBy(desc(t.gradingPolicies.version))
    .limit(1);
  return row ? { id: row.id, version: row.version, config: row.config } : { id: null, version: 0, config: DEFAULT_GRADING_POLICY };
}

/**
 * Load everything a gradebook needs in a handful of batched queries. `tx` must
 * be an `asUser` transaction so RLS applies. `onlyStudentId` restricts the
 * roster to one student (student-facing view).
 */
async function loadGradebookData(tx: Db, cls: ClassRow, onlyStudentId: string | null): Promise<GradebookData> {
  const policy = await loadActivePolicy(tx, cls.id);
  const students = await tx
    .select({ id: t.users.id, name: t.users.name })
    .from(t.classEnrollments)
    .innerJoin(t.users, eq(t.users.id, t.classEnrollments.studentId))
    .where(
      and(
        eq(t.classEnrollments.classId, cls.id),
        eq(t.classEnrollments.status, "active"),
        onlyStudentId ? eq(t.classEnrollments.studentId, onlyStudentId) : undefined,
      ),
    )
    .orderBy(asc(t.users.name), asc(t.users.id));
  const assignments = await tx
    .select()
    .from(t.assignments)
    .where(and(eq(t.assignments.classId, cls.id), sql`${t.assignments.archivedAt} is null`))
    .orderBy(asc(t.assignments.dueAt), asc(t.assignments.createdAt));

  const empty: GradebookData = { cls, policy, assignments, students, targets: new Map(), dueOverrides: new Map(), submissions: new Map(), entries: new Map(), states: new Map() };
  if (assignments.length === 0 || students.length === 0) return empty;

  const aIds = assignments.map((a) => a.id);
  const sIds = students.map((s) => s.id);
  const masterySkillIds = [...new Set(assignments.filter((a) => a.gradingMethod === "mastery").flatMap((a) => a.skillIds))];

  const [targetRows, overrideRows, submissionRows, entryRows, stateRows] = await Promise.all([
    tx.select().from(t.assignmentTargets).where(inArray(t.assignmentTargets.assignmentId, aIds)),
    tx
      .select({ assignmentId: t.assignmentOverrides.assignmentId, studentId: t.assignmentOverrides.studentId, dueAt: t.assignmentOverrides.dueAt })
      .from(t.assignmentOverrides)
      .where(and(inArray(t.assignmentOverrides.assignmentId, aIds), inArray(t.assignmentOverrides.studentId, sIds))),
    tx.select().from(t.submissions).where(and(inArray(t.submissions.assignmentId, aIds), inArray(t.submissions.studentId, sIds))),
    tx.select().from(t.gradebookEntries).where(and(inArray(t.gradebookEntries.assignmentId, aIds), inArray(t.gradebookEntries.studentId, sIds))),
    masterySkillIds.length
      ? tx
          .select({ userId: t.masteryStates.userId, skillId: t.masteryStates.skillId, level: t.masteryStates.level, peak: sql<string | null>`${t.masteryStates.explanation}->>'peakLevel'` })
          .from(t.masteryStates)
          .where(and(eq(t.masteryStates.courseId, cls.courseId), inArray(t.masteryStates.userId, sIds), inArray(t.masteryStates.skillId, masterySkillIds)))
      : Promise.resolve([] as { userId: string; skillId: string; level: MasteryLevel; peak: string | null }[]),
  ]);

  const targets = new Map<string, Set<string>>();
  for (const r of targetRows) {
    const set = targets.get(r.assignmentId) ?? new Set<string>();
    set.add(r.studentId);
    targets.set(r.assignmentId, set);
  }
  const states = new Map<string, Map<string, StateLite>>();
  for (const s of stateRows) {
    const m = states.get(s.userId) ?? new Map<string, StateLite>();
    m.set(s.skillId, { level: s.level, peak: isLevel(s.peak) ? s.peak : s.level });
    states.set(s.userId, m);
  }
  return {
    ...empty,
    targets,
    dueOverrides: new Map(overrideRows.filter((o) => o.dueAt).map((o) => [key(o.assignmentId, o.studentId), o.dueAt])),
    submissions: groupBy(submissionRows, (s) => key(s.assignmentId, s.studentId)),
    entries: new Map(entryRows.map((e) => [key(e.assignmentId, e.studentId), e])),
    states,
  };
}

// ──────────────────────────────── computation ───────────────────────────────

function isAssigned(data: GradebookData, assignmentId: string, studentId: string): boolean {
  const tg = data.targets.get(assignmentId);
  return !tg || tg.size === 0 || tg.has(studentId);
}

/** The grade the evidence supports, before any teacher override. */
function computeGrade(a: AssignmentRow, subs: SubmissionRow[], states: Map<string, StateLite> | undefined, policy: GradingPolicyConfig): ComputedGrade {
  switch (a.gradingMethod) {
    case "score":
      return gradeFromScore(
        subs.map((s) => ({ score: s.score, maxScore: s.maxScore, late: s.status === "late", submittedAt: s.submittedAt })),
        policy,
      );
    case "mastery":
      // No submission and no evidence on any assigned skill = nothing to grade yet (missing work is not a zero).
      if (subs.length === 0 && !a.skillIds.some((id) => states?.has(id))) return { percent: null, source: { kind: "none", reason: "not_submitted" } };
      // Skills with no evidence count as not_started — never averaged away.
      return gradeFromMastery(
        a.skillIds.map((skillId) => {
          const s = states?.get(skillId);
          return { skillId, current: s?.level ?? "not_started", peak: s?.peak ?? "not_started" };
        }),
        policy,
      );
    case "completion":
      return gradeFromCompletion(subs.length > 0);
  }
}

function cellStatus(a: AssignmentRow, subs: SubmissionRow[], excused: boolean, due: Date | null, now: Date): GradeCellStatus {
  if (excused) return "excused";
  if (subs.length === 0) return due && now.getTime() > due.getTime() ? "missing" : "not_submitted";
  const latest = subs.reduce((x, y) => (y.submittedAt.getTime() >= x.submittedAt.getTime() ? y : x));
  if (a.gradingMethod === "score" && latest.score === null) return "awaiting_grading";
  return latest.status === "late" ? "late" : "submitted";
}

function overrideView(e: EntryRow | undefined): GradeOverrideView | null {
  return e && e.overrideGrade !== null ? { grade: e.overrideGrade, reason: e.overrideReason, by: e.overrideBy, at: e.overrideAt } : null;
}

function computeCell(data: GradebookData, a: AssignmentRow, studentId: string, policy: GradingPolicyConfig, now: Date): GradebookCell {
  const k = key(a.id, studentId);
  const subs = data.submissions.get(k) ?? [];
  const entry = data.entries.get(k);
  const due = data.dueOverrides.get(k) ?? a.dueAt;
  const computed = computeGrade(a, subs, data.states.get(studentId), policy);
  const final = applyOverride(computed, { grade: entry?.overrideGrade ?? null, by: entry?.overrideBy ?? null, reason: entry?.overrideReason ?? null });
  return {
    percent: final.percent,
    points: final.percent === null ? null : round1((final.percent * a.points) / 100),
    source: final.source,
    status: cellStatus(a, subs, Boolean(entry?.excused), due, now),
    attempts: subs.length,
    comment: entry?.comment ?? null,
    override: overrideView(entry),
    dueAt: due,
  };
}

function averageOf(items: { percent: number; weight: number }[]): GradebookAverage {
  const total = items.reduce((s, x) => s + x.weight, 0);
  if (items.length === 0 || total === 0) return { percent: null, counted: items.length };
  return { percent: round1(items.reduce((s, x) => s + x.percent * x.weight, 0) / total), counted: items.length };
}

/** Pure: build the gradebook from loaded data under `policy`. */
function computeGradebook(data: GradebookData, policy: GradingPolicyRef, now: Date): Gradebook {
  const cells: Gradebook["cells"] = {};
  const perStudent = new Map<string, { percent: number; weight: number }[]>();
  const perAssignment = new Map<string, { percent: number; weight: number }[]>();
  for (const s of data.students) {
    cells[s.id] = {};
    for (const a of data.assignments) {
      if (!isAssigned(data, a.id, s.id)) continue;
      const cell = computeCell(data, a, s.id, policy.config, now);
      cells[s.id][a.id] = cell;
      if (cell.percent === null || cell.status === "excused") continue;
      pushTo(perStudent, s.id, { percent: cell.percent, weight: a.points });
      pushTo(perAssignment, a.id, { percent: cell.percent, weight: 1 });
    }
  }
  return {
    class: { id: data.cls.id, name: data.cls.name, courseId: data.cls.courseId, organizationId: data.cls.organizationId },
    policy,
    assignments: data.assignments.map((a) => ({ id: a.id, title: a.title, kind: a.kind, gradingMethod: a.gradingMethod, points: a.points, dueAt: a.dueAt, skillIds: a.skillIds })),
    students: data.students,
    cells,
    averages: {
      students: Object.fromEntries(data.students.map((s) => [s.id, averageOf(perStudent.get(s.id) ?? [])])),
      assignments: Object.fromEntries(data.assignments.map((a) => [a.id, averageOf(perAssignment.get(a.id) ?? [])])),
      method: AVERAGE_METHOD,
    },
    generatedAt: now,
  };
}

async function loadForStaff(user: StaffUser, classId: string): Promise<GradebookData> {
  const db = await getDb();
  const cls = await assertClassStaff(db, user, classId);
  return asUser(user as Actor, (tx) => loadGradebookData(tx, cls, null));
}

function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid", result.error.issues[0]?.message ?? "Invalid input.");
  return result.data;
}

// ───────────────────────────────── read API ─────────────────────────────────

/** The class gradebook for its teacher, a school admin of its organisation, or a platform admin. */
export async function getGradebook(user: StaffUser, classId: string, options: { now?: Date } = {}): Promise<Gradebook> {
  const data = await loadForStaff(user, classId);
  return computeGradebook(data, data.policy, options.now ?? new Date());
}

export interface PolicyPreviewRow {
  studentId: string;
  studentName: string;
  /** Computed (pre-override) percent under the current and proposed policy. */
  before: number | null;
  after: number | null;
  /** after − before, when both exist. */
  change: number | null;
  /** An override keeps the displayed grade fixed whatever the policy says. */
  overridden: boolean;
  excused: boolean;
}

export interface PolicyPreview {
  classId: string;
  current: GradingPolicyRef;
  proposed: GradingPolicyConfig;
  /** Mastery- and score-graded assignments (completion grades don't depend on the policy). */
  assignments: { id: string; title: string; gradingMethod: AssignmentRow["gradingMethod"]; rows: PolicyPreviewRow[] }[];
  summary: {
    compared: number;
    /** Displayed grades that would change (overridden cells excluded). */
    changed: number;
    increased: number;
    decreased: number;
    /** Computed grade would change, but an override keeps the displayed grade. */
    unchangedBecauseOverridden: number;
    maxIncrease: number;
    maxDecrease: number;
    meanAbsoluteChange: number;
  };
}

const computedPercent = (c: GradebookCell) => (c.source.kind === "override" ? c.source.replaced : c.percent);

/** Before/after grades for a proposed policy. Persists nothing. */
export async function previewGradingPolicy(user: StaffUser, classId: string, config: unknown, options: { now?: Date } = {}): Promise<PolicyPreview> {
  const proposed = parse(gradingPolicySchema, config);
  const data = await loadForStaff(user, classId);
  const now = options.now ?? new Date();
  const before = computeGradebook(data, data.policy, now);
  const after = computeGradebook(data, { id: null, version: data.policy.version + 1, config: proposed }, now);

  const summary = { compared: 0, changed: 0, increased: 0, decreased: 0, unchangedBecauseOverridden: 0, maxIncrease: 0, maxDecrease: 0, meanAbsoluteChange: 0 };
  let absTotal = 0;
  const assignments = before.assignments
    .filter((a) => a.gradingMethod !== "completion")
    .map((a) => {
      const rows: PolicyPreviewRow[] = [];
      for (const s of before.students) {
        const b = before.cells[s.id]?.[a.id];
        const n = after.cells[s.id]?.[a.id];
        if (!b || !n) continue;
        const pb = computedPercent(b);
        const pa = computedPercent(n);
        const change = pb !== null && pa !== null ? round1(pa - pb) : null;
        const differs = pb !== pa;
        rows.push({ studentId: s.id, studentName: s.name, before: pb, after: pa, change, overridden: b.override !== null, excused: b.status === "excused" });
        summary.compared += 1;
        if (!differs) continue;
        if (b.override) {
          summary.unchangedBecauseOverridden += 1;
          continue;
        }
        summary.changed += 1;
        if (change !== null) {
          absTotal += Math.abs(change);
          if (change > 0) summary.increased += 1;
          if (change < 0) summary.decreased += 1;
          summary.maxIncrease = Math.max(summary.maxIncrease, change);
          summary.maxDecrease = Math.max(summary.maxDecrease, -change);
        }
      }
      return { id: a.id, title: a.title, gradingMethod: a.gradingMethod, rows };
    });
  summary.meanAbsoluteChange = summary.changed ? round1(absTotal / summary.changed) : 0;
  return { classId, current: data.policy, proposed, assignments, summary };
}

// ───────────────────────────── grading policies ─────────────────────────────

export interface GradingPolicyVersion {
  id: string;
  classId: string;
  version: number;
  config: GradingPolicyConfig;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
}

const toVersion = (r: typeof t.gradingPolicies.$inferSelect): GradingPolicyVersion => ({
  id: r.id,
  classId: r.classId,
  version: r.version,
  config: r.config,
  isActive: r.isActive,
  createdBy: r.createdBy,
  createdAt: r.createdAt,
});

/**
 * Validate and publish a new policy version. Earlier versions are kept
 * (inactive); evidence and mastery are untouched — only displayed grades change.
 */
export async function publishGradingPolicy(user: StaffUser, classId: string, config: unknown): Promise<GradingPolicyVersion> {
  const parsed = parse(gradingPolicySchema, config);
  const db = await getDb();
  const cls = await assertClassStaff(db, user, classId);
  return db.transaction(async (tx) => {
    const [previous] = await tx
      .select()
      .from(t.gradingPolicies)
      .where(and(eq(t.gradingPolicies.classId, classId), eq(t.gradingPolicies.isActive, true)))
      .orderBy(desc(t.gradingPolicies.version))
      .limit(1);
    const [{ max }] = await tx.select({ max: sql<number>`coalesce(max(${t.gradingPolicies.version}), 0)::int` }).from(t.gradingPolicies).where(eq(t.gradingPolicies.classId, classId));
    await tx.update(t.gradingPolicies).set({ isActive: false }).where(eq(t.gradingPolicies.classId, classId));
    const [row] = await tx.insert(t.gradingPolicies).values({ classId, version: max + 1, config: parsed, isActive: true, createdBy: user.id }).returning();
    await tx.insert(t.auditLogs).values({
      actorId: user.id,
      action: "grading_policy.published",
      entityType: "grading_policy",
      entityId: row.id,
      organizationId: cls.organizationId,
      metadata: { classId, version: row.version, previousVersion: previous?.version ?? null, previousConfig: previous?.config ?? null, config: parsed },
    });
    return toVersion(row);
  });
}

/** Every policy version for the class, newest first. */
export async function listGradingPolicyVersions(user: StaffUser, classId: string): Promise<GradingPolicyVersion[]> {
  await assertClassStaff(await getDb(), user, classId);
  const rows = await asUser(user as Actor, (tx) => tx.select().from(t.gradingPolicies).where(eq(t.gradingPolicies.classId, classId)).orderBy(desc(t.gradingPolicies.version)));
  return rows.map(toVersion);
}

// ──────────────────────────── teacher adjustments ───────────────────────────

const entryTarget = { assignmentId: z.string().uuid("Unknown assignment."), studentId: z.string().uuid("Unknown student.") };

export const gradeOverrideSchema = z
  .object({
    ...entryTarget,
    /** Percent; null clears the override. Up to 150 allows extra credit. */
    grade: z.number().finite().min(0, "Grades can't be negative.").max(150, "Grades can't exceed 150%.").nullable(),
    reason: z.string().trim().max(500).optional().default(""),
  })
  .superRefine((v, ctx) => {
    if (v.grade !== null && !v.reason) ctx.addIssue({ code: "custom", path: ["reason"], message: "Give a reason for the override." });
  });

export const gradeCommentSchema = z.object({ ...entryTarget, comment: z.string().trim().max(2000).nullable() });

export const excusedSchema = z.object({ ...entryTarget, excused: z.boolean(), reason: z.string().trim().max(500).optional().default("") });

export interface GradebookEntryView {
  assignmentId: string;
  studentId: string;
  override: GradeOverrideView | null;
  comment: string | null;
  excused: boolean;
  updatedAt: Date;
}

const toEntryView = (e: EntryRow): GradebookEntryView => ({ assignmentId: e.assignmentId, studentId: e.studentId, override: overrideView(e), comment: e.comment, excused: e.excused, updatedAt: e.updatedAt });

/** Authorise a gradebook-entry change and load the current entry. */
async function loadEntryContext(user: StaffUser, assignmentId: string, studentId: string) {
  const db = await getDb();
  const [assignment] = await db.select().from(t.assignments).where(eq(t.assignments.id, assignmentId));
  if (!assignment || assignment.archivedAt) throw new DomainError("not_found", "Assignment not found.");
  const cls = await assertClassStaff(db, user, assignment.classId);
  const [enrolled] = await db
    .select({ studentId: t.classEnrollments.studentId })
    .from(t.classEnrollments)
    .where(and(eq(t.classEnrollments.classId, cls.id), eq(t.classEnrollments.studentId, studentId), eq(t.classEnrollments.status, "active")));
  if (!enrolled) throw new DomainError("invalid", "That student isn't actively enrolled in this class.");
  const targets = await db.select({ studentId: t.assignmentTargets.studentId }).from(t.assignmentTargets).where(eq(t.assignmentTargets.assignmentId, assignmentId));
  if (targets.length && !targets.some((x) => x.studentId === studentId)) throw new DomainError("invalid", "This assignment isn't assigned to that student.");
  const [previous] = await db
    .select()
    .from(t.gradebookEntries)
    .where(and(eq(t.gradebookEntries.assignmentId, assignmentId), eq(t.gradebookEntries.studentId, studentId)));
  return { db, cls, previous: previous ?? null };
}

type EntryPatch = Partial<Pick<EntryRow, "overrideGrade" | "overrideReason" | "overrideBy" | "overrideAt" | "comment" | "excused">>;

/** Upsert the entry and append an audit row in one transaction. */
async function writeEntry(
  user: StaffUser,
  ctx: Awaited<ReturnType<typeof loadEntryContext>>,
  target: { assignmentId: string; studentId: string },
  patch: EntryPatch,
  audit: { action: string; previous: unknown; next: unknown; reason?: string | null },
): Promise<GradebookEntryView> {
  const now = new Date();
  return ctx.db.transaction(async (tx) => {
    const [row] = await tx
      .insert(t.gradebookEntries)
      .values({ ...target, ...patch, updatedAt: now })
      .onConflictDoUpdate({ target: [t.gradebookEntries.assignmentId, t.gradebookEntries.studentId], set: { ...patch, updatedAt: now } })
      .returning();
    await tx.insert(t.auditLogs).values({
      actorId: user.id,
      action: audit.action,
      entityType: "gradebook_entry",
      entityId: key(target.assignmentId, target.studentId),
      organizationId: ctx.cls.organizationId,
      metadata: { ...target, classId: ctx.cls.id, previous: audit.previous, next: audit.next, reason: audit.reason ?? null },
    });
    return toEntryView(row);
  });
}

/** Set (or, with grade null, clear) a teacher override. The computed grade and evidence are untouched. */
export async function setGradeOverride(user: StaffUser, input: z.input<typeof gradeOverrideSchema>): Promise<GradebookEntryView> {
  const v = parse(gradeOverrideSchema, input);
  const ctx = await loadEntryContext(user, v.assignmentId, v.studentId);
  const clearing = v.grade === null;
  const patch: EntryPatch = clearing
    ? { overrideGrade: null, overrideReason: null, overrideBy: null, overrideAt: null }
    : { overrideGrade: v.grade, overrideReason: v.reason, overrideBy: user.id, overrideAt: new Date() };
  return writeEntry(user, ctx, v, patch, {
    action: clearing ? "gradebook.override_cleared" : "gradebook.override_set",
    previous: overrideView(ctx.previous ?? undefined),
    next: clearing ? null : { grade: v.grade, reason: v.reason },
    reason: v.reason || null,
  });
}

/** Set or clear (null / empty) the teacher's comment on one cell. */
export async function setGradeComment(user: StaffUser, input: z.input<typeof gradeCommentSchema>): Promise<GradebookEntryView> {
  const v = parse(gradeCommentSchema, input);
  const ctx = await loadEntryContext(user, v.assignmentId, v.studentId);
  const comment = v.comment ? v.comment : null;
  return writeEntry(user, ctx, v, { comment }, { action: "gradebook.comment_set", previous: ctx.previous?.comment ?? null, next: comment });
}

/** Mark a cell excused (dropped from averages, never "missing") or un-excuse it. */
export async function setExcused(user: StaffUser, input: z.input<typeof excusedSchema>): Promise<GradebookEntryView> {
  const v = parse(excusedSchema, input);
  const ctx = await loadEntryContext(user, v.assignmentId, v.studentId);
  return writeEntry(user, ctx, { assignmentId: v.assignmentId, studentId: v.studentId }, { excused: v.excused }, {
    action: "gradebook.excused_set",
    previous: ctx.previous?.excused ?? false,
    next: v.excused,
    reason: v.reason || null,
  });
}

// ──────────────────────────────────── CSV ───────────────────────────────────

/**
 * One RFC 4180 field. Text starting with = + - @ (or tab / CR) is prefixed
 * with a single quote so spreadsheet apps don't evaluate it as a formula.
 */
export function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let s = value;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map(csvField).join(",")).join("\r\n") + "\r\n";
}

function noteFor(c: GradebookCell): string | null {
  const parts: string[] = [];
  if (c.override) {
    const replaced = c.source.kind === "override" ? c.source.replaced : null;
    parts.push(`Overridden to ${c.override.grade}% (computed: ${replaced === null ? "no grade" : `${replaced}%`})${c.override.reason ? ` — ${c.override.reason}` : ""}`);
  }
  if (c.status === "excused") parts.push("Excused");
  return parts.length ? parts.join("; ") : null;
}

/**
 * CSV with one row per student and a percent column per assignment (blank =
 * no grade / not assigned). Assignments with any override or excused cell get
 * an extra note column describing the source.
 */
export async function exportGradebookCsv(user: StaffUser, classId: string, options: { now?: Date } = {}): Promise<string> {
  const gb = await getGradebook(user, classId, options);
  const withNotes = new Set(gb.assignments.filter((a) => gb.students.some((s) => { const c = gb.cells[s.id]?.[a.id]; return c ? noteFor(c) !== null : false; })).map((a) => a.id));
  const header: string[] = ["Student"];
  for (const a of gb.assignments) {
    header.push(`${a.title} (%)`);
    if (withNotes.has(a.id)) header.push(`${a.title} (note)`);
  }
  header.push("Average (%)");
  const rows: (string | number | null)[][] = [header];
  for (const s of gb.students) {
    const row: (string | number | null)[] = [s.name];
    for (const a of gb.assignments) {
      const c = gb.cells[s.id]?.[a.id];
      row.push(c?.percent ?? null);
      if (withNotes.has(a.id)) row.push(c ? noteFor(c) : null);
    }
    row.push(gb.averages.students[s.id]?.percent ?? null);
    rows.push(row);
  }
  return toCsv(rows);
}

// ─────────────────────────────── student view ───────────────────────────────

export interface StudentGrades {
  class: { id: string; name: string; courseId: string };
  student: { id: string; name: string };
  policy: { version: number; config: GradingPolicyConfig };
  /** Only assignments that reach this student. */
  assignments: (GradebookAssignment & { cell: GradebookCell })[];
  average: GradebookAverage;
  averageMethod: string;
}

/**
 * A student's own grades in one class. Students may only request their own;
 * staff of the class may request any enrolled student's. Reads go through RLS.
 */
export async function getStudentGrades(actor: Actor, studentId: string, classId: string, options: { now?: Date } = {}): Promise<StudentGrades> {
  if (!UUID.test(studentId) || !UUID.test(classId)) throw new DomainError("not_found", "Class not found.");
  if (actor.role === "student" && actor.id !== studentId) throw new DomainError("forbidden", "You can only view your own grades.");
  if (actor.id !== studentId) await assertClassStaff(await getDb(), actor, classId);
  const data = await asUser(actor, async (tx) => {
    const [cls] = await tx.select().from(t.classes).where(eq(t.classes.id, classId));
    return cls ? loadGradebookData(tx, cls, studentId) : null;
  });
  if (!data || data.students.length === 0) throw new DomainError("not_found", "Class not found.");
  const gb = computeGradebook(data, data.policy, options.now ?? new Date());
  const student = gb.students[0];
  const mine = gb.cells[student.id] ?? {};
  return {
    class: { id: gb.class.id, name: gb.class.name, courseId: gb.class.courseId },
    student,
    policy: { version: gb.policy.version, config: gb.policy.config },
    assignments: gb.assignments.filter((a) => mine[a.id]).map((a) => ({ ...a, cell: mine[a.id] })),
    average: gb.averages.students[student.id],
    averageMethod: AVERAGE_METHOD,
  };
}
