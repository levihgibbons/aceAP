/**
 * Teacher-approved grade passback (gradebook → LMS) and the background sync
 * worker. Orchestration only: grades come from the gradebook service
 * (`getGradebook`, overrides applied), queueing and delivery from the LMS
 * service (`enqueueGradeSync`, `processSyncJob`), the wire protocol from the
 * adapter. The adapter, `fetch` and the clock are injectable for tests.
 *
 * Honesty rules (see docs/CANVAS_INTEGRATION.md):
 *  - nothing is sent unless the class's organisation has an LMS connection
 *    whose diagnostics passed (and the tool key is still configured);
 *  - a grade is "synced" only after the platform answered 2xx;
 *  - excused and ungraded cells are skipped, never sent as zero;
 *  - unmapped assignments / unlinked students produce "blocked" jobs with a
 *    reason (they re-queue automatically once the mapping exists).
 *
 * Authorisation: every entry point takes the signed-in staff user and checks
 * `assertClassStaff` (teacher of the class, school admin of its organisation,
 * platform admin) before touching anything.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb, type Db } from "@/db/client";
import { assignments, auditLogs, externalAssignmentMappings, externalCourseMappings, externalIdentityMappings, lmsConnections, syncJobs } from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { assertClassStaff, type StaffUser } from "@/modules/classrooms/service";
import { getGradebook, type Gradebook } from "@/modules/gradebook/service";
import { createCanvasAdapter } from "./canvasAdapter";
import { getToolKeyStatus } from "./lti/keys";
import {
  enqueueGradeSync,
  getSyncStatusForGrades,
  processSyncJob,
  retrySyncJob,
  type GradeSyncState,
  type GradeSyncStatusRow,
  type ProcessOutcome,
  type ProcessSummary,
} from "./service";
import { systemClock, type Clock, type FetchLike, type LmsAdapter } from "./types";

type ConnectionRow = typeof lmsConnections.$inferSelect;
type JobRow = typeof syncJobs.$inferSelect;

export interface PassbackDeps {
  /** Defaults to a Canvas adapter using `fetch`. */
  adapter?: LmsAdapter;
  fetch?: FetchLike;
  now?: Clock;
  maxAttempts?: number;
}

const DEFAULT_MAX_ATTEMPTS = 5;

function adapterFor(deps: PassbackDeps): LmsAdapter {
  return deps.adapter ?? createCanvasAdapter({ fetch: deps.fetch, now: deps.now });
}

// ───────────────────────────────── Back-off ─────────────────────────────────

/** First retry after one minute, doubling per failed attempt, capped at one hour. */
export const RETRY_BASE_MS = 60_000;
export const RETRY_MAX_MS = 60 * 60_000;

/**
 * Wait before the next attempt of a pending job that has already failed
 * `attempts` times with a retryable error: 0 → now, 1 → 1 min, 2 → 2 min,
 * 3 → 4 min, 4 → 8 min, … capped at 60 min. With the default limit of 5
 * attempts a job is marked failed after the 5th try (~15 min after the first).
 */
export function retryDelayMs(attempts: number): number {
  if (!Number.isFinite(attempts) || attempts <= 0) return 0;
  return Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** (attempts - 1));
}

/** When a pending job may be attempted again (`updatedAt` is the time of its last attempt). */
export function nextAttemptAt(job: Pick<JobRow, "attempts" | "updatedAt">): Date {
  return new Date(job.updatedAt.getTime() + retryDelayMs(job.attempts));
}

export function isDue(job: Pick<JobRow, "attempts" | "updatedAt">, now: Date): boolean {
  return nextAttemptAt(job).getTime() <= now.getTime();
}

// ──────────────────────────────── Connection ────────────────────────────────

export type PassbackBlockReason = "no_connection" | "connection_unverified" | "assignment_not_linked" | "line_item_unknown" | "students_unlinked";

export const PASSBACK_REASON_TEXT: Record<PassbackBlockReason, string> = {
  no_connection: "This school has no Canvas connection. An administrator can set one up on the Integrations page.",
  connection_unverified: "The Canvas connection hasn't passed diagnostics, so nothing can be sent. Run diagnostics on the Integrations page.",
  assignment_not_linked: "This assignment isn't linked to a Canvas assignment. Add it in Canvas with the AceAP assignment picker, then open it once from Canvas as the teacher.",
  line_item_unknown: "This assignment is linked, but Canvas hasn't told AceAP which grade column to use yet. Open it once from Canvas as the teacher.",
  students_unlinked: "None of the students on this assignment has linked their Canvas account yet. Each student links once by opening AceAP from Canvas.",
};

export interface PassbackConnection {
  id: string;
  issuer: string;
  /** Diagnostics passed and the tool key is configured. */
  verified: boolean;
  /** Stored status (not_configured / configured_unverified / verified / error). */
  status: ConnectionRow["status"];
}

function effectiveVerified(row: ConnectionRow): boolean {
  return row.status === "verified" && getToolKeyStatus().configured;
}

/**
 * The connection grades for this class go to: the one its course is mapped
 * to, otherwise the organisation's only connection, otherwise the oldest
 * verified one (then the oldest). Null when the organisation has none.
 */
async function resolveClassConnection(db: Db, classId: string, organizationId: string): Promise<ConnectionRow | null> {
  const rows = await db.select().from(lmsConnections).where(eq(lmsConnections.organizationId, organizationId)).orderBy(asc(lmsConnections.createdAt));
  if (rows.length === 0) return null;
  const mapped = await db
    .select({ connectionId: externalCourseMappings.connectionId })
    .from(externalCourseMappings)
    .where(and(eq(externalCourseMappings.classId, classId), inArray(externalCourseMappings.connectionId, rows.map((r) => r.id))));
  const byCourse = rows.find((r) => mapped.some((m) => m.connectionId === r.id));
  if (byCourse) return byCourse;
  if (rows.length === 1) return rows[0];
  return rows.find(effectiveVerified) ?? rows[0];
}

function connectionView(row: ConnectionRow): PassbackConnection {
  return { id: row.id, issuer: row.issuer, verified: effectiveVerified(row), status: row.status };
}

// ─────────────────────────────── Eligibility ────────────────────────────────

export interface AssignmentPassbackEligibility {
  assignmentId: string;
  canSend: boolean;
  reason: PassbackBlockReason | null;
  /** Human-readable reason (or a warning about some unlinked students when sending is possible). */
  message: string | null;
  /** Students this assignment is assigned to (from the gradebook). */
  assignedStudents: number;
  /** Of those, students with an explicit LMS account link on the connection. */
  linkedStudents: number;
}

export interface ClassPassbackState {
  classId: string;
  organizationId: string;
  connection: PassbackConnection | null;
  /** Connection-level reason nothing can be sent (no_connection / connection_unverified), else null. */
  reason: PassbackBlockReason | null;
  message: string | null;
  assignments: Record<string, AssignmentPassbackEligibility>;
  /** Assignments that can be sent right now. */
  sendableAssignmentIds: string[];
}

function assignedStudentIds(gb: Gradebook, assignmentId: string): string[] {
  return gb.students.filter((s) => gb.cells[s.id]?.[assignmentId] !== undefined).map((s) => s.id);
}

/** What can be sent for each assignment of a class, and why not. Staff of the class only. */
export async function getClassPassbackState(user: StaffUser, classId: string, options: { gradebook?: Gradebook } = {}): Promise<ClassPassbackState> {
  const db = await getDb();
  const cls = await assertClassStaff(db, user, classId);
  const gb = options.gradebook && options.gradebook.class.id === cls.id ? options.gradebook : await getGradebook(user, cls.id);
  const row = await resolveClassConnection(db, cls.id, cls.organizationId);
  const connection = row ? connectionView(row) : null;
  const classReason: PassbackBlockReason | null = !connection ? "no_connection" : !connection.verified ? "connection_unverified" : null;

  const assignmentIds = gb.assignments.map((a) => a.id);
  const mappings =
    row && assignmentIds.length > 0
      ? await db
          .select({ assignmentId: externalAssignmentMappings.assignmentId, lineItemUrl: externalAssignmentMappings.lineItemUrl })
          .from(externalAssignmentMappings)
          .where(and(eq(externalAssignmentMappings.connectionId, row.id), inArray(externalAssignmentMappings.assignmentId, assignmentIds)))
      : [];
  const studentIds = gb.students.map((s) => s.id);
  const links =
    row && studentIds.length > 0
      ? await db
          .select({ userId: externalIdentityMappings.userId })
          .from(externalIdentityMappings)
          .where(and(eq(externalIdentityMappings.connectionId, row.id), inArray(externalIdentityMappings.userId, studentIds)))
      : [];
  const linked = new Set(links.map((l) => l.userId));
  const mappingBy = new Map(mappings.map((m) => [m.assignmentId, m]));

  const result: Record<string, AssignmentPassbackEligibility> = {};
  for (const a of gb.assignments) {
    const assigned = assignedStudentIds(gb, a.id);
    const linkedCount = assigned.filter((id) => linked.has(id)).length;
    const mapping = mappingBy.get(a.id);
    const reason: PassbackBlockReason | null =
      classReason ?? (!mapping ? "assignment_not_linked" : !mapping.lineItemUrl ? "line_item_unknown" : assigned.length > 0 && linkedCount === 0 ? "students_unlinked" : null);
    const unlinked = assigned.length - linkedCount;
    const message = reason
      ? PASSBACK_REASON_TEXT[reason]
      : unlinked > 0
        ? `${unlinked} of ${assigned.length} students haven't linked their Canvas account; their grades will be held as blocked until they do.`
        : null;
    result[a.id] = { assignmentId: a.id, canSend: reason === null, reason, message, assignedStudents: assigned.length, linkedStudents: linkedCount };
  }
  return {
    classId: cls.id,
    organizationId: cls.organizationId,
    connection,
    reason: classReason,
    message: classReason ? PASSBACK_REASON_TEXT[classReason] : null,
    assignments: result,
    sendableAssignmentIds: gb.assignments.filter((a) => result[a.id].canSend).map((a) => a.id),
  };
}

// ────────────────────────────────── Sending ─────────────────────────────────

/** Points for a gradebook percent, rounded to two decimals (percent may exceed 100 with extra credit). */
export function scoreFromPercent(percent: number, points: number): number {
  return Math.round(percent * points) / 100;
}

export type SkipReason = "excused" | "ungraded" | "no_points";

export interface StudentSendOutcome {
  studentId: string;
  studentName: string;
  /** queued = new job · requeued = an earlier job for this exact grade was put back · unchanged = this grade was already queued/sent · skipped. */
  action: "queued" | "requeued" | "unchanged" | "skipped";
  skipReason?: SkipReason;
  scoreGiven?: number;
  scoreMaximum?: number;
  jobId?: string;
  /** Job status right after queueing (before delivery). */
  queuedStatus?: GradeSyncState;
}

export interface AssignmentSendSummary {
  assignmentId: string;
  title: string;
  queued: number;
  requeued: number;
  unchanged: number;
  skipped: number;
  outcomes: StudentSendOutcome[];
}

export interface SendGradesResult {
  connectionId: string;
  assignments: AssignmentSendSummary[];
  /** Delivery attempts made during this request. */
  delivery: ProcessSummary;
  /** Latest job status per student, after delivery, across the sent assignments. */
  statusCounts: Record<GradeSyncState, number>;
}

interface ResolvedTarget {
  gb: Gradebook;
  connection: ConnectionRow;
  organizationId: string;
}

async function resolveTarget(user: StaffUser, classId: string): Promise<ResolvedTarget> {
  const db = await getDb();
  const cls = await assertClassStaff(db, user, classId);
  const connection = await resolveClassConnection(db, cls.id, cls.organizationId);
  if (!connection) throw new DomainError("conflict", PASSBACK_REASON_TEXT.no_connection);
  if (!effectiveVerified(connection)) throw new DomainError("conflict", PASSBACK_REASON_TEXT.connection_unverified);
  const gb = await getGradebook(user, cls.id);
  return { gb, connection, organizationId: cls.organizationId };
}

async function enqueueAssignment(target: ResolvedTarget, assignmentId: string, options: { includeComments: boolean; now: Clock }): Promise<AssignmentSendSummary> {
  const a = target.gb.assignments.find((x) => x.id === assignmentId);
  if (!a) throw new DomainError("not_found", "Assignment not found in this class.");
  const summary: AssignmentSendSummary = { assignmentId: a.id, title: a.title, queued: 0, requeued: 0, unchanged: 0, skipped: 0, outcomes: [] };
  for (const s of target.gb.students) {
    const cell = target.gb.cells[s.id]?.[a.id];
    if (!cell) continue; // not assigned to this student
    const skip: SkipReason | null = cell.status === "excused" ? "excused" : cell.percent === null ? "ungraded" : a.points <= 0 ? "no_points" : null;
    if (skip || cell.percent === null) {
      summary.skipped += 1;
      summary.outcomes.push({ studentId: s.id, studentName: s.name, action: "skipped", skipReason: skip ?? "ungraded" });
      continue;
    }
    const scoreGiven = scoreFromPercent(cell.percent, a.points);
    const comment = options.includeComments && cell.comment ? cell.comment.slice(0, 1000) : undefined;
    const queued = await enqueueGradeSync({ connectionId: target.connection.id, assignmentId: a.id, studentId: s.id, scoreGiven, scoreMaximum: a.points, comment }, { now: options.now });
    if (!queued.ok) throw new DomainError("invalid", queued.error.message);
    const action = queued.value.created ? "queued" : queued.value.requeued ? "requeued" : "unchanged";
    summary[action] += 1;
    summary.outcomes.push({ studentId: s.id, studentName: s.name, action, scoreGiven, scoreMaximum: a.points, jobId: queued.value.job.id, queuedStatus: queued.value.job.status });
  }
  return summary;
}

/** Jobs of this request that are waiting to be delivered (new, re-queued, or still pending from before). */
function pendingJobIds(summaries: AssignmentSendSummary[]): string[] {
  return summaries.flatMap((s) => s.outcomes.filter((o) => o.jobId && o.queuedStatus === "pending").map((o) => o.jobId as string));
}

function emptySummary(): ProcessSummary {
  return { processed: 0, synced: 0, blocked: 0, failed: 0, pending: 0, outcomes: [] };
}

function addOutcome(summary: ProcessSummary, outcome: ProcessOutcome): void {
  summary.processed += 1;
  summary[outcome.status] += 1;
  summary.outcomes.push(outcome);
}

/**
 * Deliver: first the jobs this request queued (the teacher asked for them, so
 * no back-off), then any other pending job of the connection that is due.
 */
async function deliver(connectionId: string, jobIds: string[], deps: PassbackDeps): Promise<ProcessSummary> {
  const now = deps.now ?? systemClock;
  const adapter = adapterFor(deps);
  const maxAttempts = deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const summary = emptySummary();
  const seen = new Set<string>();
  for (const id of jobIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const outcome = await processSyncJob(id, adapter, { maxAttempts, now });
    if (outcome.ok) addOutcome(summary, outcome.value);
  }
  const db = await getDb();
  const others = await db
    .select()
    .from(syncJobs)
    .where(and(eq(syncJobs.connectionId, connectionId), eq(syncJobs.status, "pending")))
    .orderBy(asc(syncJobs.createdAt))
    .limit(200);
  for (const job of others) {
    if (seen.has(job.id) || !isDue(job, now())) continue;
    const outcome = await processSyncJob(job.id, adapter, { maxAttempts, now });
    if (outcome.ok) addOutcome(summary, outcome.value);
  }
  return summary;
}

async function statusCountsFor(connectionId: string, assignmentIds: string[]): Promise<Record<GradeSyncState, number>> {
  const counts: Record<GradeSyncState, number> = { not_queued: 0, pending: 0, synced: 0, failed: 0, blocked: 0 };
  for (const id of assignmentIds) {
    const status = await getSyncStatusForGrades(connectionId, id);
    if (!status.ok) continue;
    for (const row of status.value.students) counts[row.status] += 1;
  }
  return counts;
}

async function audit(user: StaffUser, action: string, entityType: string, entityId: string, organizationId: string, metadata: Record<string, unknown>): Promise<void> {
  const db = await getDb();
  await db.insert(auditLogs).values({ actorId: user.id, action, entityType, entityId, organizationId, metadata });
}

function auditCounts(result: SendGradesResult): Record<string, unknown> {
  const sum = (k: "queued" | "requeued" | "unchanged" | "skipped") => result.assignments.reduce((n, a) => n + a[k], 0);
  return {
    connectionId: result.connectionId,
    assignments: result.assignments.map((a) => a.assignmentId),
    queued: sum("queued"),
    requeued: sum("requeued"),
    unchanged: sum("unchanged"),
    skipped: sum("skipped"),
    delivered: result.delivery.synced,
    blocked: result.delivery.blocked,
    failed: result.delivery.failed,
    pending: result.delivery.pending,
  };
}

/**
 * Teacher action: send the current gradebook grades of one assignment.
 * Excused/ungraded cells are skipped; identical grades are not re-queued.
 */
export async function sendAssignmentGrades(
  user: StaffUser,
  input: { classId: string; assignmentId: string; includeComments?: boolean },
  deps: PassbackDeps = {},
): Promise<SendGradesResult> {
  const now = deps.now ?? systemClock;
  const target = await resolveTarget(user, input.classId);
  const summary = await enqueueAssignment(target, input.assignmentId, { includeComments: input.includeComments === true, now });
  const jobIds = pendingJobIds([summary]);
  const delivery = await deliver(target.connection.id, jobIds, deps);
  const result: SendGradesResult = { connectionId: target.connection.id, assignments: [summary], delivery, statusCounts: await statusCountsFor(target.connection.id, [summary.assignmentId]) };
  await audit(user, "lms.grades_sent", "assignment", summary.assignmentId, target.organizationId, auditCounts(result));
  return result;
}

/** Teacher action: send every assignment of the class that is linked to a Canvas grade column. */
export async function sendClassGrades(user: StaffUser, input: { classId: string; includeComments?: boolean }, deps: PassbackDeps = {}): Promise<SendGradesResult> {
  const now = deps.now ?? systemClock;
  const target = await resolveTarget(user, input.classId);
  const db = await getDb();
  const ids = target.gb.assignments.map((a) => a.id);
  const linked =
    ids.length > 0
      ? await db
          .select({ assignmentId: externalAssignmentMappings.assignmentId, lineItemUrl: externalAssignmentMappings.lineItemUrl })
          .from(externalAssignmentMappings)
          .where(and(eq(externalAssignmentMappings.connectionId, target.connection.id), inArray(externalAssignmentMappings.assignmentId, ids)))
      : [];
  const sendable = target.gb.assignments.filter((a) => linked.some((m) => m.assignmentId === a.id && m.lineItemUrl));
  if (sendable.length === 0) throw new DomainError("conflict", "No assignment in this class is linked to a Canvas grade column yet. " + PASSBACK_REASON_TEXT.assignment_not_linked);
  const summaries: AssignmentSendSummary[] = [];
  for (const a of sendable) summaries.push(await enqueueAssignment(target, a.id, { includeComments: input.includeComments === true, now }));
  const jobIds = pendingJobIds(summaries);
  const delivery = await deliver(target.connection.id, jobIds, deps);
  const result: SendGradesResult = {
    connectionId: target.connection.id,
    assignments: summaries,
    delivery,
    statusCounts: await statusCountsFor(
      target.connection.id,
      summaries.map((s) => s.assignmentId),
    ),
  };
  await audit(user, "lms.class_grades_sent", "class", input.classId, target.organizationId, auditCounts(result));
  return result;
}

// ─────────────────────────────── Status & retry ─────────────────────────────

export interface PassbackStudentRow extends GradeSyncStatusRow {
  /** Score the gradebook shows now (null when excused/ungraded). */
  currentScore: number | null;
  skipReason: SkipReason | null;
  /** The last queued/sent score differs from the gradebook — sending again would update it. */
  outOfDate: boolean;
  /** "superseded" is shown separately from a real failure. */
  superseded: boolean;
}

export interface AssignmentPassbackView {
  classId: string;
  assignmentId: string;
  points: number;
  connection: PassbackConnection | null;
  eligibility: AssignmentPassbackEligibility;
  rows: PassbackStudentRow[];
}

/** Per-student sync status for one assignment (gradebook drawer and assignment page). Staff of the class only. */
export async function getAssignmentPassback(user: StaffUser, assignmentId: string, options: { gradebook?: Gradebook } = {}): Promise<AssignmentPassbackView> {
  const db = await getDb();
  if (!/^[0-9a-f-]{36}$/i.test(assignmentId)) throw new DomainError("not_found", "Assignment not found.");
  const [assignment] = await db.select({ id: assignments.id, classId: assignments.classId }).from(assignments).where(eq(assignments.id, assignmentId));
  if (!assignment) throw new DomainError("not_found", "Assignment not found.");
  const cls = await assertClassStaff(db, user, assignment.classId);
  const gb = options.gradebook && options.gradebook.class.id === cls.id ? options.gradebook : await getGradebook(user, cls.id);
  const state = await getClassPassbackState(user, cls.id, { gradebook: gb });
  const col = gb.assignments.find((a) => a.id === assignmentId);
  const eligibility: AssignmentPassbackEligibility = state.assignments[assignmentId] ?? {
    assignmentId,
    canSend: false,
    reason: state.reason ?? "assignment_not_linked",
    message: state.message ?? "This assignment is archived, so it isn't in the gradebook.",
    assignedStudents: 0,
    linkedStudents: 0,
  };
  const points = col?.points ?? 0;
  const view: AssignmentPassbackView = { classId: cls.id, assignmentId, points, connection: state.connection, eligibility, rows: [] };
  if (!state.connection) return view;

  const status = await getSyncStatusForGrades(state.connection.id, assignmentId);
  if (!status.ok) return view;
  view.rows = status.value.students.map((row) => {
    const cell = gb.cells[row.studentId]?.[assignmentId];
    const skipReason: SkipReason | null = !cell ? null : cell.status === "excused" ? "excused" : cell.percent === null ? "ungraded" : null;
    const currentScore = cell && !skipReason && cell.percent !== null && points > 0 ? scoreFromPercent(cell.percent, points) : null;
    const superseded = row.status === "failed" && (row.lastError ?? "").startsWith("superseded:");
    const outOfDate = currentScore !== null && (row.scoreGiven !== currentScore || row.scoreMaximum !== points);
    return { ...row, currentScore, skipReason, outOfDate, superseded };
  });
  return view;
}

/**
 * Retry a failed or blocked job from the gradebook: re-queue it (audited by
 * `retrySyncJob`) and, when the connection is verified, attempt it right away.
 */
export async function retryGradeSync(user: StaffUser, jobId: string, deps: PassbackDeps = {}): Promise<ProcessOutcome | { jobId: string; status: "pending"; attempted: false; attempts: number; error: string | null }> {
  const db = await getDb();
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) throw new DomainError("not_found", "Sync job not found.");
  const [job] = await db
    .select({ id: syncJobs.id, connectionId: syncJobs.connectionId, classId: assignments.classId })
    .from(syncJobs)
    .innerJoin(assignments, eq(assignments.id, syncJobs.assignmentId))
    .where(eq(syncJobs.id, jobId));
  if (!job) throw new DomainError("not_found", "Sync job not found.");
  const cls = await assertClassStaff(db, user, job.classId);
  const [connection] = await db.select().from(lmsConnections).where(eq(lmsConnections.id, job.connectionId));
  if (!connection || connection.organizationId !== cls.organizationId) throw new DomainError("not_found", "Sync job not found.");

  const retried = await retrySyncJob(jobId, user.id, { now: deps.now });
  if (!retried.ok) throw new DomainError(retried.error.code === "forbidden" ? "forbidden" : retried.error.code === "not_found" ? "not_found" : "conflict", retried.error.message);
  if (!effectiveVerified(connection)) return { jobId, status: "pending", attempted: false, attempts: 0, error: null };
  const outcome = await processSyncJob(jobId, adapterFor(deps), { maxAttempts: deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS, now: deps.now });
  if (!outcome.ok) throw new DomainError("not_found", outcome.error.message);
  return outcome.value;
}

// ───────────────────────────── Background worker ────────────────────────────

export interface WorkerJobPlan {
  jobId: string;
  assignmentId: string;
  studentId: string;
  attempts: number;
  nextAttemptAt: Date;
}

export interface WorkerConnectionReport {
  connectionId: string;
  issuer: string;
  /** Not processed because diagnostics haven't passed (or the tool key is missing). */
  skipped: boolean;
  skipReason: string | null;
  due: WorkerJobPlan[];
  waiting: WorkerJobPlan[];
  /** Only with `apply: true`. */
  summary: ProcessSummary | null;
}

export interface WorkerRunOptions extends PassbackDeps {
  /** Send for real. Default false (dry run: report what is due, contact nobody). */
  apply?: boolean;
  connectionId?: string;
  /** Max pending jobs examined per connection (default 500). */
  limit?: number;
}

/**
 * One pass of the background sync worker (`npm run lms:sync`): for every
 * verified connection, attempt the pending jobs whose back-off has elapsed.
 */
export async function runSyncWorker(options: WorkerRunOptions = {}): Promise<WorkerConnectionReport[]> {
  const now = options.now ?? systemClock;
  const db = await getDb();
  const connections = options.connectionId
    ? await db.select().from(lmsConnections).where(eq(lmsConnections.id, options.connectionId))
    : await db.select().from(lmsConnections).orderBy(asc(lmsConnections.createdAt));
  const adapter = options.apply ? adapterFor(options) : null;
  const reports: WorkerConnectionReport[] = [];

  for (const connection of connections) {
    const pending = await db
      .select()
      .from(syncJobs)
      .where(and(eq(syncJobs.connectionId, connection.id), eq(syncJobs.status, "pending")))
      .orderBy(asc(syncJobs.createdAt))
      .limit(Math.max(1, options.limit ?? 500));
    const at = now();
    const plan = (j: JobRow): WorkerJobPlan => ({ jobId: j.id, assignmentId: j.assignmentId, studentId: j.studentId, attempts: j.attempts, nextAttemptAt: nextAttemptAt(j) });
    const report: WorkerConnectionReport = {
      connectionId: connection.id,
      issuer: connection.issuer,
      skipped: false,
      skipReason: null,
      due: pending.filter((j) => isDue(j, at)).map(plan),
      waiting: pending.filter((j) => !isDue(j, at)).map(plan),
      summary: null,
    };
    if (!effectiveVerified(connection)) {
      report.skipped = true;
      report.skipReason = getToolKeyStatus().configured ? `connection status is "${connection.status}" (diagnostics have not passed)` : "the LTI tool key is not configured";
    } else if (adapter) {
      const summary = emptySummary();
      for (const job of report.due) {
        const outcome = await processSyncJob(job.jobId, adapter, { maxAttempts: options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS, now });
        if (outcome.ok) addOutcome(summary, outcome.value);
      }
      report.summary = summary;
    }
    reports.push(report);
  }
  return reports;
}
