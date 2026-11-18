/**
 * Canvas roster review (NRPS) — PROPOSALS ONLY.
 *
 * A teacher of a class whose Canvas course is mapped (external_course_mappings
 * with a memberships URL) can ask AceAP to fetch the Canvas roster and compare
 * it with the class. The result is stored as a short-lived snapshot in
 * `lms_roster_proposals` and shown on /teacher/classes/[classId]/canvas-roster.
 *
 * Hard rules (see docs/CANVAS_INTEGRATION.md → "Roster review"):
 *  - Nothing here creates identity links or enrolments. There is no teacher or
 *    admin action that links accounts; a student links their own account by
 *    launching AceAP from Canvas and confirming on /lti/link.
 *  - An existing explicit identity link is the only thing that makes a member
 *    "linked". A suggestion is made ONLY by exact (case-insensitive, trimmed)
 *    e-mail equality with a student actively enrolled in this class who has no
 *    link on the connection — never by name, never across classes, never when
 *    the e-mail is ambiguous, and never applied automatically.
 *  - Name and e-mail are stored only when Canvas sent them (privacy level).
 *  - Each review replaces the class's previous snapshot for that connection;
 *    snapshots older than 30 days are hidden here and purged by the retention
 *    job; class or connection deletion cascades.
 *  - Every outbound request goes through the LMS URL policy and the
 *    DNS-rebinding guard (lti/urlPolicy.ts, lti/dnsGuard.ts via safeFetch).
 *
 * Authorisation: `assertClassStaff` (class teacher, school admin of the
 * class's organisation, platform admin) on every entry point.
 */
import { and, asc, eq, gte, inArray, isNull, notInArray } from "drizzle-orm";
import { getDb, type Db } from "@/db/client";
import { auditLogs, classEnrollments, externalCourseMappings, externalIdentityMappings, lmsConnections, lmsRosterProposals, users, type RosterMatchState } from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { ROSTER_PROPOSAL_RETENTION_DAYS } from "@/modules/accounts/retention";
import { rateLimit } from "@/lib/rate-limit";
import { assertClassStaff, type StaffUser } from "@/modules/classrooms/service";
import { createCanvasAdapter } from "./canvasAdapter";
import type { HostResolver } from "./lti/dnsGuard";
import { isLearner } from "./lti/launch";
import { systemClock, type Clock, type FetchLike, type LmsAdapter, type LmsConnectionConfig, type RosterMember } from "./types";

export { ROSTER_PROPOSAL_RETENTION_DAYS };
const DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_LIMIT = { count: 10, windowMs: 10 * 60_000 };

export interface RosterReviewDeps {
  /** Defaults to a Canvas adapter using `fetch` / `resolveHost`. */
  adapter?: LmsAdapter;
  fetch?: FetchLike;
  resolveHost?: HostResolver;
  now?: Clock;
}

export type RosterMemberStatus = "active" | "inactive";

export interface ClassifiedMember {
  externalUserId: string;
  roles: string[];
  status: RosterMemberStatus;
  name: string | null;
  email: string | null;
  matchState: RosterMatchState;
  suggestedUserId: string | null;
  linkedUserId: string | null;
}

export interface ClassificationContext {
  /** Students actively enrolled in the class (id + account e-mail). */
  enrolled: { id: string; email: string }[];
  /** Explicit identity links on the connection: external user id → AceAP user id. */
  linksByExternalId: Map<string, string>;
  /** AceAP users that already have an identity link on the connection. */
  linkedUserIds: Set<string>;
}

/** The comparison key for e-mail equality: trimmed and lower-cased. Never used for names. */
export function normaliseEmail(value: string | null | undefined): string | null {
  const v = (value ?? "").trim().toLowerCase();
  return v.includes("@") ? v : null;
}

function displayName(member: RosterMember): string | null {
  if (member.name) return member.name;
  const parts = [member.givenName, member.familyName].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

/**
 * Pure matching rules (exported for tests). See the module comment; names
 * are carried through for display only and never consulted.
 */
export function classifyRosterMembers(members: RosterMember[], ctx: ClassificationContext): ClassifiedMember[] {
  const enrolledIds = new Set(ctx.enrolled.map((s) => s.id));
  const studentsByEmail = new Map<string, string[]>();
  for (const s of ctx.enrolled) {
    const key = normaliseEmail(s.email);
    if (key) studentsByEmail.set(key, [...(studentsByEmail.get(key) ?? []), s.id]);
  }
  const memberEmailCounts = new Map<string, number>();
  for (const m of members) {
    const key = normaliseEmail(m.email);
    if (key) memberEmailCounts.set(key, (memberEmailCounts.get(key) ?? 0) + 1);
  }

  return members.map((m) => {
    const status: RosterMemberStatus = m.status.toLowerCase() === "active" ? "active" : "inactive";
    const base = { externalUserId: m.userId, roles: m.roles, status, name: displayName(m), email: m.email ?? null };
    const linked = ctx.linksByExternalId.get(m.userId);
    if (linked) {
      return enrolledIds.has(linked)
        ? { ...base, matchState: "already_linked" as const, suggestedUserId: null, linkedUserId: linked }
        : { ...base, matchState: "linked_elsewhere" as const, suggestedUserId: null, linkedUserId: null };
    }
    const key = normaliseEmail(m.email);
    const candidates = key ? (studentsByEmail.get(key) ?? []) : [];
    const suggestible = key !== null && status === "active" && isLearner(m.roles) && memberEmailCounts.get(key) === 1 && candidates.length === 1 && !ctx.linkedUserIds.has(candidates[0]);
    return suggestible
      ? { ...base, matchState: "suggested" as const, suggestedUserId: candidates[0], linkedUserId: null }
      : { ...base, matchState: "no_match" as const, suggestedUserId: null, linkedUserId: null };
  });
}

// ───────────────────────────────── Review ───────────────────────────────────

interface RosterSource {
  connection: LmsConnectionConfig;
  mappings: { externalCourseId: string; membershipsUrl: string }[];
}

async function rosterSources(db: Db, classId: string, organizationId: string): Promise<RosterSource[]> {
  const rows = await db
    .select({ mapping: externalCourseMappings, connection: lmsConnections })
    .from(externalCourseMappings)
    .innerJoin(lmsConnections, eq(lmsConnections.id, externalCourseMappings.connectionId))
    .where(and(eq(externalCourseMappings.classId, classId), eq(lmsConnections.organizationId, organizationId)))
    .orderBy(asc(externalCourseMappings.createdAt));
  const byConnection = new Map<string, RosterSource>();
  for (const { mapping, connection } of rows) {
    if (!mapping.membershipsUrl) continue;
    const source = byConnection.get(connection.id) ?? {
      connection: {
        id: connection.id,
        organizationId: connection.organizationId,
        platform: connection.platform,
        issuer: connection.issuer,
        clientId: connection.clientId,
        deploymentId: connection.deploymentId,
        authLoginUrl: connection.authLoginUrl,
        authTokenUrl: connection.authTokenUrl,
        jwksUrl: connection.jwksUrl,
      },
      mappings: [],
    };
    source.mappings.push({ externalCourseId: mapping.externalCourseId, membershipsUrl: mapping.membershipsUrl });
    byConnection.set(connection.id, source);
  }
  return [...byConnection.values()];
}

/** Merge members of several (cross-listed) courses: one entry per user, roles united. */
function mergeMembers(lists: RosterMember[][]): RosterMember[] {
  const merged = new Map<string, RosterMember>();
  for (const list of lists) {
    for (const m of list) {
      const existing = merged.get(m.userId);
      if (!existing) merged.set(m.userId, { ...m, roles: [...m.roles] });
      else {
        existing.roles = [...new Set([...existing.roles, ...m.roles])];
        if (m.status.toLowerCase() === "active") existing.status = m.status;
        existing.name ??= m.name;
        existing.givenName ??= m.givenName;
        existing.familyName ??= m.familyName;
        existing.email ??= m.email;
      }
    }
  }
  return [...merged.values()];
}

async function activeStudents(db: Db, classId: string): Promise<{ id: string; name: string; email: string; isDemo: boolean }[]> {
  return db
    .select({ id: users.id, name: users.name, email: users.email, isDemo: users.isDemo })
    .from(classEnrollments)
    .innerJoin(users, eq(users.id, classEnrollments.studentId))
    .where(and(eq(classEnrollments.classId, classId), eq(classEnrollments.status, "active"), isNull(users.deletedAt)))
    .orderBy(asc(users.name));
}

export interface RosterReviewSourceResult {
  connectionId: string;
  externalCourseIds: string[];
  ok: boolean;
  /** Staff-facing reason when the roster could not be fetched (the previous snapshot is kept). */
  error: string | null;
  members: number;
}

export interface RosterReviewOutcome {
  classId: string;
  reviewedAt: Date;
  sources: RosterReviewSourceResult[];
  counts: Record<RosterMatchState, number>;
}

const emptyCounts = (): Record<RosterMatchState, number> => ({ already_linked: 0, linked_elsewhere: 0, suggested: 0, no_match: 0 });

/**
 * "Review Canvas roster": fetch NRPS memberships for every Canvas course mapped
 * to the class and store a fresh proposal snapshot. Creates no identity link
 * and no enrolment. Audited as `lms.roster_reviewed` (counts only — no names
 * or e-mail addresses in the audit row).
 */
export async function reviewCanvasRoster(user: StaffUser, classId: string, deps: RosterReviewDeps = {}): Promise<RosterReviewOutcome> {
  const db = await getDb();
  const cls = await assertClassStaff(db, user, classId);
  const sources = await rosterSources(db, cls.id, cls.organizationId);
  if (sources.length === 0) {
    throw new DomainError("conflict", "This class isn't linked to a Canvas course with a roster yet. It is linked the first time you open an AceAP assignment from that Canvas course as the teacher.");
  }
  const limit = rateLimit(`roster-review:${user.id}`, REVIEW_LIMIT.count, REVIEW_LIMIT.windowMs);
  if (!limit.allowed) throw new DomainError("rate_limited", "Too many roster reviews. Please wait a few minutes and try again.");

  const now = deps.now ?? systemClock;
  const adapter = deps.adapter ?? createCanvasAdapter({ fetch: deps.fetch, resolveHost: deps.resolveHost, now });
  const reviewedAt = now();
  const enrolled = await activeStudents(db, cls.id);
  const counts = emptyCounts();
  const results: RosterReviewSourceResult[] = [];

  for (const source of sources) {
    const lists: RosterMember[][] = [];
    let error: string | null = null;
    for (const mapping of source.mappings) {
      const roster = await adapter.fetchRoster(source.connection, mapping.membershipsUrl);
      if (!roster.ok) {
        error = roster.error.message;
        break;
      }
      lists.push(roster.value.members);
    }
    const externalCourseIds = source.mappings.map((m) => m.externalCourseId);
    if (error !== null) {
      results.push({ connectionId: source.connection.id, externalCourseIds, ok: false, error, members: 0 });
      continue;
    }
    const members = mergeMembers(lists);
    const memberIds = members.map((m) => m.userId);
    const enrolledIds = enrolled.map((s) => s.id);
    const [byExternal, byUser] = await Promise.all([
      memberIds.length
        ? db
            .select({ externalUserId: externalIdentityMappings.externalUserId, userId: externalIdentityMappings.userId })
            .from(externalIdentityMappings)
            .where(and(eq(externalIdentityMappings.connectionId, source.connection.id), inArray(externalIdentityMappings.externalUserId, memberIds)))
        : Promise.resolve([]),
      enrolledIds.length
        ? db
            .select({ userId: externalIdentityMappings.userId })
            .from(externalIdentityMappings)
            .where(and(eq(externalIdentityMappings.connectionId, source.connection.id), inArray(externalIdentityMappings.userId, enrolledIds)))
        : Promise.resolve([]),
    ]);
    const classified = classifyRosterMembers(members, {
      enrolled,
      linksByExternalId: new Map(byExternal.map((r) => [r.externalUserId, r.userId])),
      linkedUserIds: new Set(byUser.map((r) => r.userId)),
    });

    await db.transaction(async (tx) => {
      await tx.delete(lmsRosterProposals).where(and(eq(lmsRosterProposals.classId, cls.id), eq(lmsRosterProposals.connectionId, source.connection.id)));
      for (let i = 0; i < classified.length; i += 200) {
        const chunk = classified.slice(i, i + 200);
        await tx.insert(lmsRosterProposals).values(chunk.map((c) => ({ ...c, connectionId: source.connection.id, classId: cls.id, createdAt: reviewedAt })));
      }
    });
    for (const c of classified) counts[c.matchState] += 1;
    results.push({ connectionId: source.connection.id, externalCourseIds, ok: true, error: null, members: classified.length });
  }

  // Snapshots of connections no longer mapped to this class are dropped.
  await db.delete(lmsRosterProposals).where(
    and(
      eq(lmsRosterProposals.classId, cls.id),
      notInArray(
        lmsRosterProposals.connectionId,
        sources.map((s) => s.connection.id),
      ),
    ),
  );

  await db.insert(auditLogs).values({
    actorId: user.id,
    action: "lms.roster_reviewed",
    entityType: "class",
    entityId: cls.id,
    organizationId: cls.organizationId,
    metadata: {
      connections: results.map((r) => ({ connectionId: r.connectionId, ok: r.ok, members: r.members })),
      ...counts,
      identityLinksCreated: 0,
    },
  });
  return { classId: cls.id, reviewedAt, sources: results, counts };
}

// ──────────────────────────────── Read model ────────────────────────────────

export interface CanvasMemberView {
  externalUserId: string;
  /** Only when Canvas sent it. */
  canvasName: string | null;
  /** Only when Canvas sent it. */
  canvasEmail: string | null;
  status: RosterMemberStatus;
}

export interface RosterReviewView {
  classId: string;
  /** The class has at least one mapped Canvas course with a memberships URL. */
  canReview: boolean;
  /** Mapped Canvas courses (any connection of the class's organisation). */
  courses: { connectionId: string; issuer: string; externalCourseId: string; hasRoster: boolean }[];
  /** When the shown snapshot was taken (most recent review), null when none within the retention window. */
  snapshotAt: Date | null;
  /** Canvas members explicitly linked to a student enrolled in the class. */
  linkedEnrolled: (CanvasMemberView & { userId: string; studentName: string })[];
  /** Enrolled AceAP students without an identity link on the class's Canvas connection(s) — live. */
  enrolledUnlinked: { userId: string; studentName: string; isDemo: boolean; suggestion: CanvasMemberView | null }[];
  /** Canvas learners who are not (linked to) a student of this class. */
  canvasNotInClass: (CanvasMemberView & { linkedElsewhere: boolean })[];
  /** E-mail suggestions still applicable (student still enrolled and unlinked). */
  suggestions: (CanvasMemberView & { userId: string; studentName: string })[];
  /** Canvas members without the Learner role (teachers, TAs, designers …); not listed. */
  canvasStaffCount: number;
}

/** What the roster review page shows. Staff of the class only. */
export async function getRosterReview(user: StaffUser, classId: string, options: { now?: Clock } = {}): Promise<RosterReviewView> {
  const db = await getDb();
  const cls = await assertClassStaff(db, user, classId);
  const now = (options.now ?? systemClock)();
  const mappings = await db
    .select({ connectionId: externalCourseMappings.connectionId, issuer: lmsConnections.issuer, externalCourseId: externalCourseMappings.externalCourseId, membershipsUrl: externalCourseMappings.membershipsUrl })
    .from(externalCourseMappings)
    .innerJoin(lmsConnections, eq(lmsConnections.id, externalCourseMappings.connectionId))
    .where(and(eq(externalCourseMappings.classId, cls.id), eq(lmsConnections.organizationId, cls.organizationId)))
    .orderBy(asc(externalCourseMappings.createdAt));
  const connectionIds = [...new Set(mappings.map((m) => m.connectionId))];

  const cutoff = new Date(now.getTime() - ROSTER_PROPOSAL_RETENTION_DAYS * DAY_MS);
  const [students, links, proposals] = await Promise.all([
    activeStudents(db, cls.id),
    connectionIds.length
      ? db.select({ userId: externalIdentityMappings.userId }).from(externalIdentityMappings).where(inArray(externalIdentityMappings.connectionId, connectionIds))
      : Promise.resolve([]),
    connectionIds.length
      ? db
          .select()
          .from(lmsRosterProposals)
          .where(and(eq(lmsRosterProposals.classId, cls.id), inArray(lmsRosterProposals.connectionId, connectionIds), gte(lmsRosterProposals.createdAt, cutoff)))
      : Promise.resolve([]),
  ]);
  const studentById = new Map(students.map((s) => [s.id, s]));
  const linked = new Set(links.map((l) => l.userId));
  const member = (p: (typeof proposals)[number]): CanvasMemberView => ({ externalUserId: p.externalUserId, canvasName: p.name, canvasEmail: p.email, status: p.status });

  const learners = proposals.filter((p) => isLearner(p.roles));
  const linkedEnrolled = learners
    .filter((p) => p.matchState === "already_linked" && p.linkedUserId && studentById.has(p.linkedUserId))
    .map((p) => ({ ...member(p), userId: p.linkedUserId as string, studentName: studentById.get(p.linkedUserId as string)?.name ?? "" }));
  const suggestions = learners
    .filter((p) => p.matchState === "suggested" && p.suggestedUserId && studentById.has(p.suggestedUserId) && !linked.has(p.suggestedUserId))
    .map((p) => ({ ...member(p), userId: p.suggestedUserId as string, studentName: studentById.get(p.suggestedUserId as string)?.name ?? "" }));
  const shownElsewhere = new Set([...linkedEnrolled, ...suggestions].map((m) => m.externalUserId));
  const canvasNotInClass = learners
    .filter((p) => !shownElsewhere.has(p.externalUserId))
    // A member linked to a student who has since left the class counts as linked elsewhere.
    .map((p) => ({ ...member(p), linkedElsewhere: p.matchState === "linked_elsewhere" || p.matchState === "already_linked" }));
  const suggestionFor = new Map(suggestions.map((s) => [s.userId, s]));

  return {
    classId: cls.id,
    canReview: mappings.some((m) => m.membershipsUrl),
    courses: mappings.map((m) => ({ connectionId: m.connectionId, issuer: m.issuer, externalCourseId: m.externalCourseId, hasRoster: Boolean(m.membershipsUrl) })),
    snapshotAt: proposals.length ? new Date(Math.max(...proposals.map((p) => p.createdAt.getTime()))) : null,
    linkedEnrolled,
    enrolledUnlinked:
      connectionIds.length === 0
        ? []
        : students
            .filter((s) => !linked.has(s.id))
            .map((s) => {
              const suggestion = suggestionFor.get(s.id);
              return {
                userId: s.id,
                studentName: s.name,
                isDemo: s.isDemo,
                suggestion: suggestion ? { externalUserId: suggestion.externalUserId, canvasName: suggestion.canvasName, canvasEmail: suggestion.canvasEmail, status: suggestion.status } : null,
              };
            }),
    canvasNotInClass,
    suggestions,
    canvasStaffCount: proposals.length - learners.length,
  };
}
