/**
 * LMS integration application service (database-backed).
 *
 * Runs as the trusted database role (`getDb()`): callers — route handlers and
 * server actions — must authorise the signed-in user first. The two functions
 * that take an `actorId` (`saveConnection`, `retrySyncJob`) additionally check
 * that the actor is staff of the organisation.
 *
 * Honesty rules enforced here:
 *  - a connection is "verified" only after `runDiagnostics` passed every check
 *    against the configured endpoints;
 *  - a sync job is "synced" only after the adapter reported a 2xx from the
 *    platform's score endpoint;
 *  - nothing is dropped silently: unmapped grades become "blocked" jobs with a
 *    reason, and every transition appends a `sync_logs` row;
 *  - identity links are only ever created explicitly, never inferred.
 */
import { createHash } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, like, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type Db } from "@/db/client";
import {
  assignmentTargets,
  assignments,
  auditLogs,
  classEnrollments,
  classes,
  externalAssignmentMappings,
  externalCourseMappings,
  externalIdentityMappings,
  lmsConnections,
  organizationMemberships,
  organizations,
  syncJobs,
  syncLogs,
  users,
  type LmsConnectionStatus,
  type SyncStatus,
} from "@/db/schema";
import { createCanvasAdapter } from "./canvasAdapter";
import { AGS_SCOPE } from "./lti/ags";
import { getToolKeyStatus, type ToolKeyStatus } from "./lti/keys";
import { toolEndpoints } from "./lti/oidc";
import { checkLmsUrl, checkServiceUrl } from "./lti/urlPolicy";
import { systemClock, type Clock, type FetchLike, type LmsAdapter, type LmsConnectionConfig, type LmsError } from "./types";

// ───────────────────────────────── Results ──────────────────────────────────

export type ServiceErrorCode = "validation" | "not_found" | "forbidden" | "conflict";

export interface ServiceError {
  code: ServiceErrorCode;
  message: string;
  /** Field-level problems for `validation` errors. */
  issues?: { path: string; message: string }[];
}

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: ServiceError };

function success<T>(value: T): ServiceResult<T> {
  return { ok: true, value };
}

function failure(code: ServiceErrorCode, message: string, issues?: ServiceError["issues"]): { ok: false; error: ServiceError } {
  return { ok: false, error: issues ? { code, message, issues } : { code, message } };
}

// ────────────────────────────────── Shapes ──────────────────────────────────

type ConnectionRow = typeof lmsConnections.$inferSelect;
type JobRow = typeof syncJobs.$inferSelect;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbLike = Db | Tx;

export interface ConnectionView extends LmsConnectionConfig {
  /**
   * Effective status. "verified" is reported only when diagnostics passed AND
   * the tool key is still configured; see `statusNote` when it was downgraded.
   */
  status: LmsConnectionStatus;
  statusNote: string | null;
  lastVerifiedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
}

export type IntegrationWarningKind = "tool_key_missing" | "class_unmapped" | "assignments_unmapped" | "students_unlinked";

export interface IntegrationWarning {
  kind: IntegrationWarningKind;
  message: string;
  connectionId?: string;
  classId?: string;
  count?: number;
}

export interface SyncJobCounts {
  pending: number;
  synced: number;
  /** Excludes superseded jobs. */
  failed: number;
  blocked: number;
  /** Grades replaced by a newer grade before they were delivered. */
  superseded: number;
  total: number;
}

export interface IntegrationOverview {
  organizationId: string;
  /** "not_configured" when no connection exists; otherwise the least healthy connection status. */
  status: LmsConnectionStatus;
  statusLabel: string;
  toolKey: ToolKeyStatus;
  /** URLs an LMS administrator must register (derived from APP_BASE_URL). */
  toolEndpoints: { loginUrl: string; launchUrl: string; jwksUrl: string };
  connections: ConnectionView[];
  jobCounts: SyncJobCounts;
  warnings: IntegrationWarning[];
}

export interface SyncJobView {
  id: string;
  connectionId: string;
  kind: "grade_passback";
  assignmentId: string;
  studentId: string;
  scoreGiven: number;
  scoreMaximum: number;
  comment: string | null;
  status: SyncStatus;
  /** True when a newer grade replaced this one before delivery (stored as "failed"). */
  superseded: boolean;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  syncedAt: Date | null;
}

export interface SyncLogLine {
  level: "info" | "error";
  message: string;
  createdAt: Date;
}

export interface SyncJobListItem extends SyncJobView {
  assignmentTitle: string | null;
  studentName: string | null;
  /** Most recent first. */
  recentLogs: SyncLogLine[];
}

export interface DiagnosticCheck {
  check: "tool_key" | "platform_jwks" | "token_grant";
  ok: boolean;
  detail: string;
}

export interface DiagnosticsReport {
  connectionId: string;
  status: LmsConnectionStatus;
  checkedAt: Date;
  checks: DiagnosticCheck[];
}

export interface ProcessOutcome {
  jobId: string;
  status: SyncStatus;
  /** Whether a request was sent to the platform during this call. */
  attempted: boolean;
  attempts: number;
  error: string | null;
}

export interface ProcessSummary {
  processed: number;
  synced: number;
  blocked: number;
  failed: number;
  /** Jobs left pending for a later retry. */
  pending: number;
  outcomes: ProcessOutcome[];
}

export type GradeSyncState = SyncStatus | "not_queued";

export interface GradeSyncStatusRow {
  studentId: string;
  studentName: string | null;
  status: GradeSyncState;
  /** Whether the student has an explicit link to an LMS user on this connection. */
  identityLinked: boolean;
  jobId: string | null;
  scoreGiven: number | null;
  scoreMaximum: number | null;
  attempts: number;
  lastError: string | null;
  syncedAt: Date | null;
  updatedAt: Date | null;
}

export interface GradeSyncStatus {
  connectionId: string;
  assignmentId: string;
  assignmentMapped: boolean;
  lineItemKnown: boolean;
  students: GradeSyncStatusRow[];
}

// ───────────────────────────────── Helpers ──────────────────────────────────

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value: unknown): value is string => typeof value === "string" && UUID.test(value);

export const MISSING_MAPPING_PREFIX = "missing_mapping:";
export const SUPERSEDED_PREFIX = "superseded:";
const SUPERSEDED_MESSAGE = `${SUPERSEDED_PREFIX} a newer grade was queued before this one was delivered.`;
const DEFAULT_MAX_ATTEMPTS = 5;

const isSuperseded = (job: Pick<JobRow, "status" | "lastError">): boolean => job.status === "failed" && (job.lastError ?? "").startsWith(SUPERSEDED_PREFIX);

function toConfig(row: ConnectionRow): LmsConnectionConfig {
  return {
    id: row.id,
    organizationId: row.organizationId,
    platform: row.platform,
    issuer: row.issuer,
    clientId: row.clientId,
    deploymentId: row.deploymentId,
    authLoginUrl: row.authLoginUrl,
    authTokenUrl: row.authTokenUrl,
    jwksUrl: row.jwksUrl,
  };
}

function toConnectionView(row: ConnectionRow, toolKey: ToolKeyStatus): ConnectionView {
  const downgraded = row.status === "verified" && !toolKey.configured;
  return {
    ...toConfig(row),
    status: downgraded ? "configured_unverified" : row.status,
    statusNote: downgraded ? "Diagnostics passed earlier, but the LTI tool key is no longer configured. Run diagnostics again." : null,
    lastVerifiedAt: row.lastVerifiedAt,
    lastError: row.lastError,
    createdAt: row.createdAt,
  };
}

function toJobView(row: JobRow): SyncJobView {
  return {
    id: row.id,
    connectionId: row.connectionId,
    kind: row.kind,
    assignmentId: row.assignmentId,
    studentId: row.studentId,
    scoreGiven: row.payload.scoreGiven,
    scoreMaximum: row.payload.scoreMaximum,
    comment: row.payload.comment ?? null,
    status: row.status,
    superseded: isSuperseded(row),
    attempts: row.attempts,
    lastError: row.lastError,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    syncedAt: row.syncedAt,
  };
}

/** Strictly increasing timestamps for log rows so "most recent first" is well defined. */
let lastLogTime = 0;
function nextLogTime(now: Clock): Date {
  lastLogTime = Math.max(now().getTime(), lastLogTime + 1);
  return new Date(lastLogTime);
}

async function appendLog(db: DbLike, jobId: string, level: "info" | "error", message: string, now: Clock): Promise<void> {
  await db.insert(syncLogs).values({ jobId, level, message, createdAt: nextLogTime(now) });
}

async function isOrganizationStaff(db: DbLike, organizationId: string, userId: string): Promise<boolean> {
  if (!isUuid(userId)) return false;
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return false;
  if (user.role === "platform_admin") return true;
  const [membership] = await db
    .select({ role: organizationMemberships.role })
    .from(organizationMemberships)
    .where(and(eq(organizationMemberships.organizationId, organizationId), eq(organizationMemberships.userId, userId)))
    .limit(1);
  return membership?.role === "teacher" || membership?.role === "school_admin";
}

async function loadConnection(db: DbLike, connectionId: string): Promise<ConnectionRow | null> {
  if (!isUuid(connectionId)) return null;
  const [row] = await db.select().from(lmsConnections).where(eq(lmsConnections.id, connectionId)).limit(1);
  return row ?? null;
}

// ──────────────────────────────── Connections ───────────────────────────────

/** Connection config by id (for adapters, routes and jobs). */
export async function getConnectionConfig(connectionId: string): Promise<LmsConnectionConfig | null> {
  const row = await loadConnection(await getDb(), connectionId);
  return row ? toConfig(row) : null;
}

/**
 * Database-backed `ConnectionSource`: the connections registered for an issuer
 * (and client id, when known). Used by the login and launch routes.
 */
export async function findConnectionsForIssuer(issuer: string, clientId: string | null): Promise<LmsConnectionConfig[]> {
  const db = await getDb();
  const where = clientId === null ? eq(lmsConnections.issuer, issuer) : and(eq(lmsConnections.issuer, issuer), eq(lmsConnections.clientId, clientId));
  const rows = await db.select().from(lmsConnections).where(where);
  return rows.map(toConfig);
}

function isHttpsOrLocalhost(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

/** The issuer is an identifier (never fetched): https, or localhost for development. */
const issuerUrl = z
  .string()
  .trim()
  .min(1, "Required.")
  .max(2000)
  .refine(isHttpsOrLocalhost, "Must be an https:// URL (http:// is allowed for localhost only).");

/**
 * Endpoints AceAP fetches or redirects to: must pass the LMS URL policy
 * (https, host on LTI_ALLOWED_HOSTS, no private IP literals; localhost only
 * outside production). See lti/urlPolicy.ts.
 */
const endpointUrl = z
  .string()
  .trim()
  .min(1, "Required.")
  .max(2000)
  .superRefine((value, ctx) => {
    const checked = checkLmsUrl(value);
    if (!checked.ok) ctx.addIssue({ code: "custom", message: `The URL ${checked.reason}` });
  });

export const connectionInputSchema = z.object({
  /** Set to update an existing connection of the organisation. */
  id: z.string().regex(UUID, "Invalid id.").optional(),
  platform: z.literal("canvas").default("canvas"),
  issuer: issuerUrl,
  clientId: z.string().trim().min(1, "Required.").max(255),
  deploymentId: z.string().trim().min(1, "Required.").max(255),
  authLoginUrl: endpointUrl,
  authTokenUrl: endpointUrl,
  jwksUrl: endpointUrl,
});

export type ConnectionInput = z.input<typeof connectionInputSchema>;

const CONNECTION_FIELDS = ["platform", "issuer", "clientId", "deploymentId", "authLoginUrl", "authTokenUrl", "jwksUrl"] as const;

/**
 * Create or update an LMS connection. The connection is stored as
 * "configured_unverified": saving never contacts the platform and never
 * implies that it works. Writes an audit log row.
 */
export async function saveConnection(organizationId: string, actorId: string, input: unknown): Promise<ServiceResult<ConnectionView>> {
  const parsed = connectionInputSchema.safeParse(input);
  if (!parsed.success) {
    return failure(
      "validation",
      "The connection settings are invalid.",
      parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    );
  }
  const data = parsed.data;
  if (!isUuid(organizationId)) return failure("not_found", "Organisation not found.");

  const db = await getDb();
  const [organization] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  if (!organization) return failure("not_found", "Organisation not found.");
  if (!(await isOrganizationStaff(db, organizationId, actorId))) return failure("forbidden", "Only staff of this organisation can change LMS connections.");

  const [sameTriple] = await db
    .select()
    .from(lmsConnections)
    .where(and(eq(lmsConnections.issuer, data.issuer), eq(lmsConnections.clientId, data.clientId), eq(lmsConnections.deploymentId, data.deploymentId)))
    .limit(1);

  let existing: ConnectionRow | null = null;
  if (data.id) {
    existing = await loadConnection(db, data.id);
    if (!existing || existing.organizationId !== organizationId) return failure("not_found", "Connection not found.");
    if (sameTriple && sameTriple.id !== existing.id) return failure("conflict", "Another connection already uses this issuer, client id and deployment id.");
  } else if (sameTriple) {
    if (sameTriple.organizationId !== organizationId) return failure("conflict", "This issuer, client id and deployment id are already registered.");
    existing = sameTriple;
  }

  const values = {
    platform: data.platform,
    issuer: data.issuer,
    clientId: data.clientId,
    deploymentId: data.deploymentId,
    authLoginUrl: data.authLoginUrl,
    authTokenUrl: data.authTokenUrl,
    jwksUrl: data.jwksUrl,
  };

  let saved: ConnectionRow;
  let action: "lms_connection.created" | "lms_connection.updated";
  try {
    if (existing) {
      const previous = existing;
      const changed = CONNECTION_FIELDS.some((field) => previous[field] !== values[field]);
      // Any change invalidates an earlier verification.
      const reset = changed ? { status: "configured_unverified" as const, lastVerifiedAt: null, lastError: null } : {};
      [saved] = await db
        .update(lmsConnections)
        .set({ ...values, ...reset })
        .where(eq(lmsConnections.id, previous.id))
        .returning();
      action = "lms_connection.updated";
    } else {
      [saved] = await db
        .insert(lmsConnections)
        .values({ ...values, organizationId, status: "configured_unverified", createdBy: actorId })
        .returning();
      action = "lms_connection.created";
    }
  } catch {
    // Unique (issuer, client id, deployment id) raced with another save.
    return failure("conflict", "This issuer, client id and deployment id are already registered.");
  }

  await db.insert(auditLogs).values({
    actorId,
    action,
    entityType: "lms_connection",
    entityId: saved.id,
    organizationId,
    metadata: { platform: saved.platform, issuer: saved.issuer, clientId: saved.clientId, deploymentId: saved.deploymentId, status: saved.status },
  });
  return success(toConnectionView(saved, getToolKeyStatus()));
}

// ───────────────────────────────── Overview ─────────────────────────────────

const STATUS_LABELS: Record<LmsConnectionStatus, string> = {
  not_configured: "Not configured — no LMS connection has been set up.",
  configured_unverified: "Configured but not verified — run diagnostics to check the connection.",
  verified: "Diagnostics passed — the LMS key set and token endpoint responded correctly.",
  error: "Error — the last diagnostics run failed.",
};

function overallStatus(connections: ConnectionView[]): LmsConnectionStatus {
  if (connections.length === 0) return "not_configured";
  if (connections.some((c) => c.status === "error")) return "error";
  if (connections.every((c) => c.status === "verified")) return "verified";
  return "configured_unverified";
}

async function countJobs(db: DbLike, organizationId: string): Promise<SyncJobCounts> {
  const rows = await db
    .select({
      status: syncJobs.status,
      count: sql<number>`count(*)::int`,
      superseded: sql<number>`(count(*) filter (where ${syncJobs.lastError} like ${`${SUPERSEDED_PREFIX}%`}))::int`,
    })
    .from(syncJobs)
    .innerJoin(lmsConnections, eq(lmsConnections.id, syncJobs.connectionId))
    .where(eq(lmsConnections.organizationId, organizationId))
    .groupBy(syncJobs.status);
  const counts: SyncJobCounts = { pending: 0, synced: 0, failed: 0, blocked: 0, superseded: 0, total: 0 };
  for (const row of rows) {
    const total = Number(row.count);
    // Superseded jobs are stored as "failed"; report them separately.
    const superseded = row.status === "failed" ? Number(row.superseded) : 0;
    counts.total += total;
    counts.superseded += superseded;
    counts[row.status] += total - superseded;
  }
  return counts;
}

async function collectWarnings(db: DbLike, organizationId: string, connections: ConnectionRow[], toolKey: ToolKeyStatus): Promise<IntegrationWarning[]> {
  const warnings: IntegrationWarning[] = [];
  if (!toolKey.configured) {
    warnings.push({ kind: "tool_key_missing", message: `LTI tool key is not configured: ${toolKey.reason ?? "unknown reason"} Launches and grade sync cannot work until it is set.` });
  }
  if (connections.length === 0) return warnings;

  const connectionIds = connections.map((c) => c.id);
  const orgClasses = await db
    .select({ id: classes.id, name: classes.name })
    .from(classes)
    .where(and(eq(classes.organizationId, organizationId), sql`${classes.archivedAt} is null`));
  const courseMappings = await db
    .select({ connectionId: externalCourseMappings.connectionId, classId: externalCourseMappings.classId })
    .from(externalCourseMappings)
    .where(inArray(externalCourseMappings.connectionId, connectionIds));

  const mappedClassIds = new Set(courseMappings.map((m) => m.classId));
  for (const cls of orgClasses) {
    if (!mappedClassIds.has(cls.id)) {
      warnings.push({ kind: "class_unmapped", classId: cls.id, message: `Class "${cls.name}" is not linked to an LMS course.` });
    }
  }
  if (courseMappings.length === 0) return warnings;

  const classIds = [...mappedClassIds];
  const classNames = new Map(orgClasses.map((c) => [c.id, c.name]));
  const classAssignments = await db
    .select({ id: assignments.id, classId: assignments.classId })
    .from(assignments)
    .where(and(inArray(assignments.classId, classIds), sql`${assignments.archivedAt} is null`));
  const assignmentMappings = await db
    .select({ connectionId: externalAssignmentMappings.connectionId, assignmentId: externalAssignmentMappings.assignmentId })
    .from(externalAssignmentMappings)
    .where(inArray(externalAssignmentMappings.connectionId, connectionIds));
  const enrollments = await db
    .select({ classId: classEnrollments.classId, studentId: classEnrollments.studentId })
    .from(classEnrollments)
    .where(and(inArray(classEnrollments.classId, classIds), eq(classEnrollments.status, "active")));
  const identities = await db
    .select({ connectionId: externalIdentityMappings.connectionId, userId: externalIdentityMappings.userId })
    .from(externalIdentityMappings)
    .where(inArray(externalIdentityMappings.connectionId, connectionIds));

  const mappedAssignments = new Set(assignmentMappings.map((m) => `${m.connectionId}|${m.assignmentId}`));
  const linkedUsers = new Set(identities.map((m) => `${m.connectionId}|${m.userId}`));
  for (const mapping of courseMappings) {
    const name = classNames.get(mapping.classId) ?? "class";
    const unmapped = classAssignments.filter((a) => a.classId === mapping.classId && !mappedAssignments.has(`${mapping.connectionId}|${a.id}`)).length;
    if (unmapped > 0) {
      warnings.push({
        kind: "assignments_unmapped",
        connectionId: mapping.connectionId,
        classId: mapping.classId,
        count: unmapped,
        message: `${unmapped} assignment(s) in "${name}" are not linked to an LMS assignment; their grades cannot be sent.`,
      });
    }
    const unlinked = enrollments.filter((e) => e.classId === mapping.classId && !linkedUsers.has(`${mapping.connectionId}|${e.studentId}`)).length;
    if (unlinked > 0) {
      warnings.push({
        kind: "students_unlinked",
        connectionId: mapping.connectionId,
        classId: mapping.classId,
        count: unlinked,
        message: `${unlinked} student(s) in "${name}" have not linked their LMS account; their grades cannot be sent.`,
      });
    }
  }
  return warnings;
}

/** Everything the Integrations page needs. Reports "not_configured" when nothing is set up. */
export async function getIntegrationOverview(organizationId: string): Promise<IntegrationOverview> {
  const toolKey = getToolKeyStatus();
  const endpoints = toolEndpoints(process.env.APP_BASE_URL?.trim() || "http://localhost:3000");
  const empty: IntegrationOverview = {
    organizationId,
    status: "not_configured",
    statusLabel: STATUS_LABELS.not_configured,
    toolKey,
    toolEndpoints: endpoints,
    connections: [],
    jobCounts: { pending: 0, synced: 0, failed: 0, blocked: 0, superseded: 0, total: 0 },
    warnings: [],
  };
  const db = await getDb();
  const rows = isUuid(organizationId)
    ? await db.select().from(lmsConnections).where(eq(lmsConnections.organizationId, organizationId)).orderBy(asc(lmsConnections.createdAt))
    : [];
  const warnings = isUuid(organizationId) ? await collectWarnings(db, organizationId, rows, toolKey) : [];
  if (rows.length === 0) return { ...empty, warnings };

  const connections = rows.map((row) => toConnectionView(row, toolKey));
  const status = overallStatus(connections);
  return { ...empty, status, statusLabel: STATUS_LABELS[status], connections, jobCounts: await countJobs(db, organizationId), warnings };
}

// ──────────────────────────────── Diagnostics ───────────────────────────────

/**
 * Check a connection against its configured endpoints:
 *   tool_key       — the tool's signing key is configured;
 *   platform_jwks  — the platform JWKS is reachable and parseable;
 *   token_grant    — the token endpoint grants a token for the AGS score scope.
 * Sets "verified" (+ lastVerifiedAt) only if every check passed; otherwise
 * "error" with the reasons. A fresh adapter is used so no cached token can
 * satisfy a check.
 */
export async function runDiagnostics(connectionId: string, deps: { fetch?: FetchLike; now?: Clock } = {}): Promise<ServiceResult<DiagnosticsReport>> {
  const db = await getDb();
  const row = await loadConnection(db, connectionId);
  if (!row) return failure("not_found", "Connection not found.");
  const connection = toConfig(row);
  const now = deps.now ?? systemClock;
  const adapter = createCanvasAdapter({ fetch: deps.fetch, now });
  const checks: DiagnosticCheck[] = [];

  const toolKey = getToolKeyStatus();
  checks.push({
    check: "tool_key",
    ok: toolKey.configured,
    detail: toolKey.configured ? `Tool signing key "${toolKey.kid}" is configured.` : (toolKey.reason ?? "LTI tool key is not configured."),
  });

  const keys = await adapter.checkPlatformKeys(connection);
  checks.push({
    check: "platform_jwks",
    ok: keys.ok,
    detail: keys.ok ? `Platform key set is reachable and contains ${keys.value.keyCount} key(s).` : keys.error.message,
  });

  if (!toolKey.configured) {
    checks.push({ check: "token_grant", ok: false, detail: "Not attempted: a client assertion cannot be signed without the tool key." });
  } else {
    const token = await adapter.requestAccessToken(connection, [AGS_SCOPE.score]);
    checks.push({
      check: "token_grant",
      ok: token.ok,
      detail: token.ok ? "Token endpoint granted an access token with the AGS score scope." : token.error.message,
    });
  }

  const checkedAt = now();
  const passed = checks.every((c) => c.ok);
  const status: LmsConnectionStatus = passed ? "verified" : "error";
  const lastError = passed
    ? null
    : checks
        .filter((c) => !c.ok)
        .map((c) => `${c.check}: ${c.detail}`)
        .join(" | ");
  await db
    .update(lmsConnections)
    .set(passed ? { status, lastVerifiedAt: checkedAt, lastError: null } : { status, lastError })
    .where(eq(lmsConnections.id, row.id));
  return success({ connectionId: row.id, status, checkedAt, checks });
}

// ────────────────────────────────── Mappings ────────────────────────────────

export interface CourseMappingView {
  connectionId: string;
  externalCourseId: string;
  classId: string;
  membershipsUrl: string | null;
}

/** Link an LMS course (context id) to an AceAP class of the same organisation. */
export async function mapCourse(input: { connectionId: string; externalCourseId: string; classId: string; membershipsUrl?: string | null }): Promise<ServiceResult<CourseMappingView>> {
  const externalCourseId = input.externalCourseId.trim();
  if (!externalCourseId) return failure("validation", "The LMS course id is required.");
  const db = await getDb();
  const connection = await loadConnection(db, input.connectionId);
  if (!connection) return failure("not_found", "Connection not found.");
  if (input.membershipsUrl) {
    const checked = checkServiceUrl(input.membershipsUrl, connection);
    if (!checked.ok) return failure("validation", `The memberships URL ${checked.reason}`);
  }
  const [cls] = isUuid(input.classId) ? await db.select({ id: classes.id, organizationId: classes.organizationId }).from(classes).where(eq(classes.id, input.classId)).limit(1) : [];
  if (!cls) return failure("not_found", "Class not found.");
  if (cls.organizationId !== connection.organizationId) return failure("forbidden", "The class belongs to a different organisation than the connection.");

  const update: { classId: string; membershipsUrl?: string | null } = { classId: cls.id };
  if (input.membershipsUrl !== undefined) update.membershipsUrl = input.membershipsUrl;
  const [row] = await db
    .insert(externalCourseMappings)
    .values({ connectionId: connection.id, externalCourseId, classId: cls.id, membershipsUrl: input.membershipsUrl ?? null })
    .onConflictDoUpdate({ target: [externalCourseMappings.connectionId, externalCourseMappings.externalCourseId], set: update })
    .returning();
  return success({ connectionId: row.connectionId, externalCourseId: row.externalCourseId, classId: row.classId, membershipsUrl: row.membershipsUrl });
}

export interface AssignmentMappingView {
  connectionId: string;
  assignmentId: string;
  resourceLinkId: string;
  lineItemUrl: string | null;
  /** Blocked jobs that were re-queued because the mapping now exists. */
  requeuedJobs: number;
}

async function requeueMissingMappingJobs(db: DbLike, where: ReturnType<typeof and>, reason: string, now: Clock): Promise<number> {
  const rows = await db
    .update(syncJobs)
    .set({ status: "pending", attempts: 0, lastError: null, updatedAt: now() })
    .where(and(where, eq(syncJobs.status, "blocked"), like(syncJobs.lastError, `${MISSING_MAPPING_PREFIX}%`)))
    .returning({ id: syncJobs.id });
  for (const row of rows) await appendLog(db, row.id, "info", reason, now);
  return rows.length;
}

/**
 * Link an AceAP assignment to an LMS resource link (and, when known, its AGS
 * line item URL). Jobs that were blocked only because this mapping was missing
 * are re-queued.
 */
export async function mapAssignment(input: { connectionId: string; assignmentId: string; resourceLinkId: string; lineItemUrl?: string | null }): Promise<ServiceResult<AssignmentMappingView>> {
  const resourceLinkId = input.resourceLinkId.trim();
  if (!resourceLinkId) return failure("validation", "The LMS resource link id is required.");
  const db = await getDb();
  const connection = await loadConnection(db, input.connectionId);
  if (!connection) return failure("not_found", "Connection not found.");
  if (input.lineItemUrl) {
    const checked = checkServiceUrl(input.lineItemUrl, connection);
    if (!checked.ok) return failure("validation", `The line item URL ${checked.reason}`);
  }
  const [assignment] = isUuid(input.assignmentId)
    ? await db
        .select({ id: assignments.id, organizationId: classes.organizationId })
        .from(assignments)
        .innerJoin(classes, eq(classes.id, assignments.classId))
        .where(eq(assignments.id, input.assignmentId))
        .limit(1)
    : [];
  if (!assignment) return failure("not_found", "Assignment not found.");
  if (assignment.organizationId !== connection.organizationId) return failure("forbidden", "The assignment belongs to a different organisation than the connection.");

  const update: { resourceLinkId: string; lineItemUrl?: string | null } = { resourceLinkId };
  if (input.lineItemUrl !== undefined) update.lineItemUrl = input.lineItemUrl;
  const [row] = await db
    .insert(externalAssignmentMappings)
    .values({ connectionId: connection.id, assignmentId: assignment.id, resourceLinkId, lineItemUrl: input.lineItemUrl ?? null })
    .onConflictDoUpdate({ target: [externalAssignmentMappings.connectionId, externalAssignmentMappings.assignmentId], set: update })
    .returning();

  const requeuedJobs = row.lineItemUrl
    ? await requeueMissingMappingJobs(db, and(eq(syncJobs.connectionId, connection.id), eq(syncJobs.assignmentId, assignment.id)), "Assignment mapping added; re-queued.", systemClock)
    : 0;
  return success({ connectionId: row.connectionId, assignmentId: row.assignmentId, resourceLinkId: row.resourceLinkId, lineItemUrl: row.lineItemUrl, requeuedJobs });
}

export interface IdentityLinkView {
  connectionId: string;
  externalUserId: string;
  userId: string;
  linkedVia: "lti_launch_signed_in" | "admin_confirmed";
  /** False when the identical link already existed. */
  created: boolean;
}

/**
 * Explicitly link an LMS user to an AceAP user. Only call this for a launch
 * made while the AceAP user was signed in, or after an administrator confirmed
 * the pairing — never because names or e-mail addresses happen to match.
 * Refuses to re-point an LMS user that is already linked to someone else, and
 * to give one AceAP user two LMS identities on the same connection.
 */
export async function linkIdentity(
  connectionId: string,
  externalUserId: string,
  userId: string,
  linkedVia: "lti_launch_signed_in" | "admin_confirmed",
): Promise<ServiceResult<IdentityLinkView>> {
  const external = externalUserId.trim();
  if (!external) return failure("validation", "The LMS user id is required.");
  if (linkedVia !== "lti_launch_signed_in" && linkedVia !== "admin_confirmed") return failure("validation", "Unknown link method.");
  const db = await getDb();
  const connection = await loadConnection(db, connectionId);
  if (!connection) return failure("not_found", "Connection not found.");
  const [user] = isUuid(userId) ? await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1) : [];
  if (!user) return failure("not_found", "User not found.");

  const [byExternal] = await db
    .select()
    .from(externalIdentityMappings)
    .where(and(eq(externalIdentityMappings.connectionId, connection.id), eq(externalIdentityMappings.externalUserId, external)))
    .limit(1);
  if (byExternal) {
    if (byExternal.userId !== user.id) return failure("conflict", "This LMS user is already linked to a different AceAP account.");
    return success({ connectionId: connection.id, externalUserId: external, userId: user.id, linkedVia: byExternal.linkedVia, created: false });
  }
  const [byUser] = await db
    .select({ externalUserId: externalIdentityMappings.externalUserId })
    .from(externalIdentityMappings)
    .where(and(eq(externalIdentityMappings.connectionId, connection.id), eq(externalIdentityMappings.userId, user.id)))
    .limit(1);
  if (byUser) return failure("conflict", "This AceAP account is already linked to a different LMS user on this connection.");

  const inserted = await db
    .insert(externalIdentityMappings)
    .values({ connectionId: connection.id, externalUserId: external, userId: user.id, linkedVia })
    .onConflictDoNothing()
    .returning();
  if (inserted.length === 0) return failure("conflict", "This LMS user was linked by another request at the same time.");

  await requeueMissingMappingJobs(db, and(eq(syncJobs.connectionId, connection.id), eq(syncJobs.studentId, user.id)), "Student's LMS account linked; re-queued.", systemClock);
  return success({ connectionId: connection.id, externalUserId: external, userId: user.id, linkedVia, created: true });
}

/** The AceAP user explicitly linked to an LMS user on this connection, or null. Never guesses. */
export async function getLinkedUserId(connectionId: string, externalUserId: string): Promise<string | null> {
  if (!isUuid(connectionId) || !externalUserId) return null;
  const db = await getDb();
  const [row] = await db
    .select({ userId: externalIdentityMappings.userId })
    .from(externalIdentityMappings)
    .where(and(eq(externalIdentityMappings.connectionId, connectionId), eq(externalIdentityMappings.externalUserId, externalUserId)))
    .limit(1);
  return row?.userId ?? null;
}

// ──────────────────────────────── Grade sync ────────────────────────────────

export interface EnqueueGradeSyncInput {
  connectionId: string;
  assignmentId: string;
  studentId: string;
  scoreGiven: number;
  scoreMaximum: number;
  comment?: string;
}

export interface EnqueueResult {
  job: SyncJobView;
  /** True when a new job row was created. */
  created: boolean;
  /** True when an earlier job for the same grade was put back in the queue (grade reverted to a previous value). */
  requeued: boolean;
}

/** Stable key: the same connection + assignment + student + score + maximum always hashes to the same value. */
export function gradeIdempotencyKey(input: Pick<EnqueueGradeSyncInput, "connectionId" | "assignmentId" | "studentId" | "scoreGiven" | "scoreMaximum">): string {
  const parts = ["grade_passback:v1", input.connectionId.toLowerCase(), input.assignmentId.toLowerCase(), input.studentId.toLowerCase(), String(Number(input.scoreGiven)), String(Number(input.scoreMaximum))];
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

interface ResolvedMappings {
  lineItemUrl: string | null;
  externalUserId: string | null;
  /** Null when the job can be sent. */
  blockReason: string | null;
}

async function resolveMappings(db: DbLike, connectionId: string, assignmentId: string, studentId: string): Promise<ResolvedMappings> {
  const [assignmentMapping] = await db
    .select({ lineItemUrl: externalAssignmentMappings.lineItemUrl })
    .from(externalAssignmentMappings)
    .where(and(eq(externalAssignmentMappings.connectionId, connectionId), eq(externalAssignmentMappings.assignmentId, assignmentId)))
    .limit(1);
  const [identity] = await db
    .select({ externalUserId: externalIdentityMappings.externalUserId })
    .from(externalIdentityMappings)
    .where(and(eq(externalIdentityMappings.connectionId, connectionId), eq(externalIdentityMappings.userId, studentId)))
    .limit(1);

  const lineItemUrl = assignmentMapping?.lineItemUrl ?? null;
  const externalUserId = identity?.externalUserId ?? null;
  const problems: string[] = [];
  if (!assignmentMapping) problems.push("the assignment is not linked to an LMS assignment");
  else if (!lineItemUrl) problems.push("the LMS grade column (line item) for this assignment is not known yet");
  if (!externalUserId) problems.push("the student has not linked an LMS account");
  return { lineItemUrl, externalUserId, blockReason: problems.length > 0 ? `${MISSING_MAPPING_PREFIX} ${problems.join("; ")}.` : null };
}

async function supersedeOlderJobs(db: DbLike, current: JobRow, now: Clock): Promise<void> {
  const rows = await db
    .update(syncJobs)
    .set({ status: "failed", lastError: SUPERSEDED_MESSAGE, updatedAt: now() })
    .where(
      and(
        eq(syncJobs.connectionId, current.connectionId),
        eq(syncJobs.assignmentId, current.assignmentId),
        eq(syncJobs.studentId, current.studentId),
        ne(syncJobs.id, current.id),
        inArray(syncJobs.status, ["pending", "blocked", "failed"]),
        sql`coalesce(${syncJobs.lastError}, '') not like ${`${SUPERSEDED_PREFIX}%`}`,
      ),
    )
    .returning({ id: syncJobs.id });
  for (const row of rows) await appendLog(db, row.id, "info", "Superseded: a newer grade was queued for this student; this grade will not be sent.", now);
}

/**
 * Queue a grade for passback. Idempotent: re-queuing an identical grade
 * returns the existing job. A changed grade creates a new job and supersedes
 * any undelivered older one, so a stale grade can never overwrite a newer one.
 * Missing mappings produce a "blocked" job with a reason — never a silent drop.
 */
export async function enqueueGradeSync(input: EnqueueGradeSyncInput, options: { now?: Clock } = {}): Promise<ServiceResult<EnqueueResult>> {
  const now = options.now ?? systemClock;
  if (!Number.isFinite(input.scoreGiven) || input.scoreGiven < 0) return failure("validation", "scoreGiven must be a non-negative number.");
  if (!Number.isFinite(input.scoreMaximum) || input.scoreMaximum <= 0) return failure("validation", "scoreMaximum must be a positive number.");
  const db = await getDb();
  const connection = await loadConnection(db, input.connectionId);
  if (!connection) return failure("not_found", "Connection not found.");
  const [assignment] = isUuid(input.assignmentId) ? await db.select({ id: assignments.id }).from(assignments).where(eq(assignments.id, input.assignmentId)).limit(1) : [];
  if (!assignment) return failure("not_found", "Assignment not found.");
  const [student] = isUuid(input.studentId) ? await db.select({ id: users.id }).from(users).where(eq(users.id, input.studentId)).limit(1) : [];
  if (!student) return failure("not_found", "Student not found.");

  const idempotencyKey = gradeIdempotencyKey(input);
  const payload: JobRow["payload"] = { scoreGiven: input.scoreGiven, scoreMaximum: input.scoreMaximum };
  if (input.comment) payload.comment = input.comment;

  return db.transaction(async (tx) => {
    const sameTriple = and(eq(syncJobs.connectionId, connection.id), eq(syncJobs.assignmentId, assignment.id), eq(syncJobs.studentId, student.id));
    const [latest] = await tx.select().from(syncJobs).where(sameTriple).orderBy(desc(syncJobs.createdAt)).limit(1);
    const [existing] = await tx.select().from(syncJobs).where(eq(syncJobs.idempotencyKey, idempotencyKey)).limit(1);

    // Same grade as the most recently queued one: nothing to do.
    if (existing && latest && existing.id === latest.id) return success({ job: toJobView(existing), created: false, requeued: false });

    const mappings = await resolveMappings(tx, connection.id, assignment.id, student.id);
    const status: SyncStatus = mappings.blockReason ? "blocked" : "pending";
    // Queue order must be strict even when two grades arrive within one millisecond.
    const queuedAt = new Date(Math.max(now().getTime(), (latest?.createdAt.getTime() ?? 0) + 1));
    const label = `${input.scoreGiven}/${input.scoreMaximum}`;

    let job: JobRow;
    let created = false;
    if (existing) {
      // The grade went back to a value that was queued before a newer one: queue it again.
      [job] = await tx
        .update(syncJobs)
        .set({ status, attempts: 0, lastError: mappings.blockReason, syncedAt: null, payload, createdAt: queuedAt, updatedAt: queuedAt })
        .where(eq(syncJobs.id, existing.id))
        .returning();
      await appendLog(tx, job.id, "info", `Re-queued grade ${label}: the grade returned to a previously queued value.`, now);
    } else {
      const inserted = await tx
        .insert(syncJobs)
        .values({
          connectionId: connection.id,
          kind: "grade_passback",
          assignmentId: assignment.id,
          studentId: student.id,
          payload,
          status,
          lastError: mappings.blockReason,
          idempotencyKey,
          createdAt: queuedAt,
          updatedAt: queuedAt,
        })
        .onConflictDoNothing({ target: syncJobs.idempotencyKey })
        .returning();
      if (inserted.length === 0) {
        // A concurrent request queued the identical grade first.
        const [raced] = await tx.select().from(syncJobs).where(eq(syncJobs.idempotencyKey, idempotencyKey)).limit(1);
        return success({ job: toJobView(raced), created: false, requeued: false });
      }
      [job] = inserted;
      created = true;
      await appendLog(tx, job.id, "info", `Queued grade ${label}.`, now);
    }
    if (mappings.blockReason) await appendLog(tx, job.id, "error", `Blocked — ${mappings.blockReason}`, now);
    await supersedeOlderJobs(tx, job, now);
    return success({ job: toJobView(job), created, requeued: !created });
  });
}

function describe(error: LmsError): string {
  return `${error.code}: ${error.message}`;
}

/**
 * Send one pending job.
 *   2xx                        → synced (syncedAt set)
 *   permission_denied /
 *   not_configured / unmapped  → blocked (needs someone to fix something)
 *   platform_error             → stays pending, attempts + 1, until
 *                                `maxAttempts`, then failed
 *   bad_request / other        → failed (retrying the same request cannot help)
 * A job that is not pending is returned untouched; a synced job is never re-sent.
 */
export async function processSyncJob(jobId: string, adapter: LmsAdapter, options: { maxAttempts?: number; now?: Clock } = {}): Promise<ServiceResult<ProcessOutcome>> {
  const now = options.now ?? systemClock;
  const maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const db = await getDb();
  const [job] = isUuid(jobId) ? await db.select().from(syncJobs).where(eq(syncJobs.id, jobId)).limit(1) : [];
  if (!job) return failure("not_found", "Sync job not found.");
  const untouched = (row: JobRow): ServiceResult<ProcessOutcome> => success({ jobId: row.id, status: row.status, attempted: false, attempts: row.attempts, error: row.lastError });
  if (job.status !== "pending") return untouched(job);

  const connection = await loadConnection(db, job.connectionId);
  if (!connection) return failure("not_found", "Connection not found.");

  const finish = async (status: SyncStatus, attempted: boolean, attempts: number, error: string | null, level: "info" | "error", message: string): Promise<ServiceResult<ProcessOutcome>> => {
    const at = now();
    const updated = await db
      .update(syncJobs)
      .set({ status, lastError: error, updatedAt: at, ...(status === "synced" ? { syncedAt: at } : {}) })
      .where(and(eq(syncJobs.id, job.id), eq(syncJobs.status, "pending")))
      .returning({ id: syncJobs.id });
    // Only the request that actually moved the job writes the log line.
    if (updated.length > 0) await appendLog(db, job.id, level, message, now);
    return success({ jobId: job.id, status, attempted, attempts, error });
  };

  // Defensive: never deliver a grade that a newer queued grade has replaced.
  const [newer] = await db
    .select({ id: syncJobs.id })
    .from(syncJobs)
    .where(and(eq(syncJobs.connectionId, job.connectionId), eq(syncJobs.assignmentId, job.assignmentId), eq(syncJobs.studentId, job.studentId), gt(syncJobs.createdAt, job.createdAt)))
    .limit(1);
  if (newer) return finish("failed", false, job.attempts, SUPERSEDED_MESSAGE, "info", "Superseded: a newer grade was queued for this student; this grade will not be sent.");

  const mappings = await resolveMappings(db, job.connectionId, job.assignmentId, job.studentId);
  if (mappings.blockReason || !mappings.lineItemUrl || !mappings.externalUserId) {
    const reason = mappings.blockReason ?? `${MISSING_MAPPING_PREFIX} mapping is incomplete.`;
    return finish("blocked", false, job.attempts, reason, "error", `Blocked — ${reason}`);
  }

  // Claim the attempt: only one worker may send for a given attempt number.
  const attempts = job.attempts + 1;
  const claimed = await db
    .update(syncJobs)
    .set({ attempts, updatedAt: now() })
    .where(and(eq(syncJobs.id, job.id), eq(syncJobs.status, "pending"), eq(syncJobs.attempts, job.attempts)))
    .returning({ id: syncJobs.id });
  if (claimed.length === 0) {
    const [current] = await db.select().from(syncJobs).where(eq(syncJobs.id, job.id)).limit(1);
    return untouched(current ?? job);
  }

  const label = `${job.payload.scoreGiven}/${job.payload.scoreMaximum}`;
  let error: LmsError;
  try {
    const result = await adapter.publishScore(toConfig(connection), mappings.lineItemUrl, {
      userId: mappings.externalUserId,
      scoreGiven: job.payload.scoreGiven,
      scoreMaximum: job.payload.scoreMaximum,
      comment: job.payload.comment,
      activityProgress: "Completed",
      gradingProgress: "FullyGraded",
    });
    if (result.ok) {
      return finish("synced", true, attempts, null, "info", `Grade ${label} accepted by the LMS (HTTP ${result.value.status}) on attempt ${attempts}.`);
    }
    error = result.error;
  } catch {
    // Adapters should not throw; treat it as a transient failure without echoing internals.
    error = { code: "platform_error", message: "Unexpected error while contacting the LMS.", retryable: true };
  }

  const detail = describe(error);
  if (error.code === "permission_denied" || error.code === "not_configured") {
    return finish("blocked", true, attempts, detail, "error", `Blocked on attempt ${attempts} — ${detail}`);
  }
  if (error.retryable && attempts < maxAttempts) {
    await db.update(syncJobs).set({ lastError: detail, updatedAt: now() }).where(and(eq(syncJobs.id, job.id), eq(syncJobs.status, "pending")));
    await appendLog(db, job.id, "error", `Attempt ${attempts} of ${maxAttempts} failed — ${detail} Will retry.`, now);
    return success({ jobId: job.id, status: "pending", attempted: true, attempts, error: detail });
  }
  const why = error.retryable ? `Giving up after ${attempts} attempts` : `Failed on attempt ${attempts} (not retryable)`;
  return finish("failed", true, attempts, detail, "error", `${why} — ${detail}`);
}

/** Process the connection's pending jobs, oldest first, one attempt each. */
export async function processPendingJobs(
  connectionId: string,
  adapter: LmsAdapter,
  options: { maxAttempts?: number; limit?: number; now?: Clock } = {},
): Promise<ServiceResult<ProcessSummary>> {
  const db = await getDb();
  const connection = await loadConnection(db, connectionId);
  if (!connection) return failure("not_found", "Connection not found.");
  const pending = await db
    .select({ id: syncJobs.id })
    .from(syncJobs)
    .where(and(eq(syncJobs.connectionId, connection.id), eq(syncJobs.status, "pending")))
    .orderBy(asc(syncJobs.createdAt))
    .limit(Math.max(1, options.limit ?? 100));

  const summary: ProcessSummary = { processed: 0, synced: 0, blocked: 0, failed: 0, pending: 0, outcomes: [] };
  for (const { id } of pending) {
    const outcome = await processSyncJob(id, adapter, { maxAttempts: options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS, now: options.now });
    if (!outcome.ok) continue;
    summary.processed += 1;
    summary[outcome.value.status] += 1;
    summary.outcomes.push(outcome.value);
  }
  return success(summary);
}

/** Put a failed or blocked job back in the queue. Records who asked. */
export async function retrySyncJob(jobId: string, actorId: string, options: { now?: Clock } = {}): Promise<ServiceResult<SyncJobView>> {
  const now = options.now ?? systemClock;
  const db = await getDb();
  const [job] = isUuid(jobId) ? await db.select().from(syncJobs).where(eq(syncJobs.id, jobId)).limit(1) : [];
  if (!job) return failure("not_found", "Sync job not found.");
  const connection = await loadConnection(db, job.connectionId);
  if (!connection) return failure("not_found", "Connection not found.");
  if (!(await isOrganizationStaff(db, connection.organizationId, actorId))) return failure("forbidden", "Only staff of this organisation can retry grade sync.");
  if (isSuperseded(job)) return failure("conflict", "A newer grade has been queued for this student, so this one will not be sent.");
  if (job.status !== "failed" && job.status !== "blocked") return failure("conflict", `Only failed or blocked jobs can be retried (this job is ${job.status}).`);

  const [updated] = await db
    .update(syncJobs)
    .set({ status: "pending", attempts: 0, lastError: null, updatedAt: now() })
    .where(and(eq(syncJobs.id, job.id), eq(syncJobs.status, job.status)))
    .returning();
  if (!updated) return failure("conflict", "The job changed while the retry was requested; reload and try again.");
  await appendLog(db, job.id, "info", `Manual retry requested by user ${actorId} (was ${job.status}).`, now);
  await db.insert(auditLogs).values({
    actorId,
    action: "sync_job.retry_requested",
    entityType: "sync_job",
    entityId: job.id,
    organizationId: connection.organizationId,
    metadata: { previousStatus: job.status, assignmentId: job.assignmentId, studentId: job.studentId },
  });
  return success(toJobView(updated));
}

// ──────────────────────────────── Read models ───────────────────────────────

/**
 * Per-student passback status for one assignment. Students with no job are
 * reported as "not_queued" — absence of a job is never shown as synced.
 */
export async function getSyncStatusForGrades(connectionId: string, assignmentId: string): Promise<ServiceResult<GradeSyncStatus>> {
  const db = await getDb();
  const connection = await loadConnection(db, connectionId);
  if (!connection) return failure("not_found", "Connection not found.");
  const [assignment] = isUuid(assignmentId) ? await db.select({ id: assignments.id, classId: assignments.classId }).from(assignments).where(eq(assignments.id, assignmentId)).limit(1) : [];
  if (!assignment) return failure("not_found", "Assignment not found.");

  const [mapping] = await db
    .select({ lineItemUrl: externalAssignmentMappings.lineItemUrl })
    .from(externalAssignmentMappings)
    .where(and(eq(externalAssignmentMappings.connectionId, connection.id), eq(externalAssignmentMappings.assignmentId, assignment.id)))
    .limit(1);

  // Rows in assignment_targets = assigned to those students only; none = whole class.
  const targets = await db.select({ studentId: assignmentTargets.studentId }).from(assignmentTargets).where(eq(assignmentTargets.assignmentId, assignment.id));
  const enrolled = await db
    .select({ studentId: classEnrollments.studentId })
    .from(classEnrollments)
    .where(and(eq(classEnrollments.classId, assignment.classId), eq(classEnrollments.status, "active")));
  const targetIds = new Set(targets.map((t) => t.studentId));
  const assigned = enrolled.map((e) => e.studentId).filter((id) => targetIds.size === 0 || targetIds.has(id));

  const jobs = await db
    .select()
    .from(syncJobs)
    .where(and(eq(syncJobs.connectionId, connection.id), eq(syncJobs.assignmentId, assignment.id)))
    .orderBy(desc(syncJobs.createdAt));
  const latestByStudent = new Map<string, JobRow>();
  for (const job of jobs) if (!latestByStudent.has(job.studentId)) latestByStudent.set(job.studentId, job);

  const studentIds = [...new Set([...assigned, ...latestByStudent.keys()])];
  const people = studentIds.length > 0 ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, studentIds)) : [];
  const names = new Map(people.map((p) => [p.id, p.name]));
  const links =
    studentIds.length > 0
      ? await db
          .select({ userId: externalIdentityMappings.userId })
          .from(externalIdentityMappings)
          .where(and(eq(externalIdentityMappings.connectionId, connection.id), inArray(externalIdentityMappings.userId, studentIds)))
      : [];
  const linked = new Set(links.map((l) => l.userId));

  const students = studentIds
    .map((studentId): GradeSyncStatusRow => {
      const job = latestByStudent.get(studentId);
      return {
        studentId,
        studentName: names.get(studentId) ?? null,
        status: job ? job.status : "not_queued",
        identityLinked: linked.has(studentId),
        jobId: job?.id ?? null,
        scoreGiven: job?.payload.scoreGiven ?? null,
        scoreMaximum: job?.payload.scoreMaximum ?? null,
        attempts: job?.attempts ?? 0,
        lastError: job?.lastError ?? null,
        syncedAt: job?.syncedAt ?? null,
        updatedAt: job?.updatedAt ?? null,
      };
    })
    .sort((a, b) => (a.studentName ?? "").localeCompare(b.studentName ?? "") || a.studentId.localeCompare(b.studentId));

  return success({ connectionId: connection.id, assignmentId: assignment.id, assignmentMapped: mapping !== undefined, lineItemKnown: Boolean(mapping?.lineItemUrl), students });
}

/** Jobs of an organisation, most recently updated first, with their latest log lines (reconciliation view). */
export async function listSyncJobs(
  organizationId: string,
  options: { status?: SyncStatus; limit?: number; logLines?: number; includeSuperseded?: boolean } = {},
): Promise<SyncJobListItem[]> {
  if (!isUuid(organizationId)) return [];
  const db = await getDb();
  const limit = Math.min(Math.max(1, options.limit ?? 50), 500);
  const logLines = Math.max(0, options.logLines ?? 5);
  const conditions = [eq(lmsConnections.organizationId, organizationId)];
  if (options.status) conditions.push(eq(syncJobs.status, options.status));
  if (!options.includeSuperseded) conditions.push(sql`coalesce(${syncJobs.lastError}, '') not like ${`${SUPERSEDED_PREFIX}%`}`);

  const rows = await db
    .select({ job: syncJobs, assignmentTitle: assignments.title, studentName: users.name })
    .from(syncJobs)
    .innerJoin(lmsConnections, eq(lmsConnections.id, syncJobs.connectionId))
    .leftJoin(assignments, eq(assignments.id, syncJobs.assignmentId))
    .leftJoin(users, eq(users.id, syncJobs.studentId))
    .where(and(...conditions))
    .orderBy(desc(syncJobs.updatedAt))
    .limit(limit);
  if (rows.length === 0) return [];

  const logs =
    logLines > 0
      ? await db
          .select()
          .from(syncLogs)
          .where(
            inArray(
              syncLogs.jobId,
              rows.map((r) => r.job.id),
            ),
          )
          .orderBy(desc(syncLogs.createdAt))
      : [];
  const logsByJob = new Map<string, SyncLogLine[]>();
  for (const log of logs) {
    const lines = logsByJob.get(log.jobId) ?? [];
    if (lines.length < logLines) lines.push({ level: log.level, message: log.message, createdAt: log.createdAt });
    logsByJob.set(log.jobId, lines);
  }
  return rows.map((row) => ({ ...toJobView(row.job), assignmentTitle: row.assignmentTitle, studentName: row.studentName, recentLogs: logsByJob.get(row.job.id) ?? [] }));
}
