/**
 * Account deletion workflow (framework-free).
 *
 * 1. requestAccountDeletion(user, { password, confirmation })
 *    Self-service. Requires the current password and the word DELETE.
 *    Soft-deletes (`users.deleted_at`), revokes every session, removes class
 *    enrolments (status "removed" — teachers immediately lose access through
 *    RLS), deletes LMS identity mappings, Canvas roster review proposals that
 *    point at the account and unused reset tokens, and writes an
 *    `account.deletion_requested` audit row. A soft-deleted account cannot sign
 *    in, use a session, or request a reset (auth filters `deleted_at`).
 *
 * 2. purgeDeletedAccounts(now)
 *    Hard-deletes accounts whose grace period (ACCOUNT_PURGE_GRACE_DAYS,
 *    default 30) has passed. Foreign keys cascade to the user's private
 *    records (attempts, responses, evidence, mastery, snapshots, vault notes,
 *    events, sessions, submissions, gradebook rows, AI usage …). Pending LMS
 *    grade-sync jobs for the user are deleted too. Audit rows are kept: they
 *    hold only uuids (never names or emails), which no longer resolve to a
 *    person once the user row is gone. Idempotent.
 *
 * Teachers who own classes (decision, see docs/SECURITY.md): self-deletion is
 * BLOCKED while the account owns any class or authored any assignment. Classes
 * carry other people's records (students' submissions and grades) that belong
 * to the school, so they must not disappear with the teacher. There is no
 * class-transfer feature yet, so the message tells the teacher to ask their
 * school administrator or AceAP support. The purge re-checks this and skips
 * (reports "blocked") rather than failing.
 *
 * Demo accounts (`is_demo`) are shared fictional accounts and can't be deleted.
 */
import { and, eq, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { getDb, type Db } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { DUMMY_HASH, verifyPassword } from "@/modules/auth/password";
import { AccountFieldError } from "./errors";
import type { SessionUser } from "@/modules/auth/service";

export { AccountFieldError };

export const DELETE_CONFIRMATION_WORD = "DELETE";
const DAY_MS = 24 * 60 * 60 * 1000;

export function purgeGraceDays(): number {
  const raw = Number(process.env.ACCOUNT_PURGE_GRACE_DAYS ?? 30);
  return Number.isFinite(raw) && raw >= 0 ? raw : 30;
}

export const purgeDateFor = (deletedAt: Date) => new Date(deletedAt.getTime() + purgeGraceDays() * DAY_MS);

export interface DeletionBlockers {
  classesOwned: number;
  assignmentsAuthored: number;
  isDemo: boolean;
}

export async function deletionBlockers(userId: string, db?: Db): Promise<DeletionBlockers> {
  const conn = db ?? (await getDb());
  const [{ classesOwned }] = await conn.select({ classesOwned: sql<number>`count(*)::int` }).from(t.classes).where(eq(t.classes.teacherId, userId));
  const [{ assignmentsAuthored }] = await conn
    .select({ assignmentsAuthored: sql<number>`count(*)::int` })
    .from(t.assignments)
    .where(eq(t.assignments.createdBy, userId));
  const [u] = await conn.select({ isDemo: t.users.isDemo }).from(t.users).where(eq(t.users.id, userId));
  return { classesOwned, assignmentsAuthored, isDemo: u?.isDemo ?? false };
}

/** A plain-language reason the account can't be deleted yet, or null. */
export function blockerMessage(b: DeletionBlockers): string | null {
  if (b.isDemo) return "Demo accounts are shared fictional accounts and can't be deleted.";
  if (b.classesOwned > 0)
    return `You still own ${b.classesOwned} class${b.classesOwned === 1 ? "" : "es"}. Classes hold your students' work and grades, which belong to your school, so they can't be deleted with your account. Ask your school administrator or AceAP support to transfer or remove them, then try again.`;
  if (b.assignmentsAuthored > 0)
    return `You authored ${b.assignmentsAuthored} assignment${b.assignmentsAuthored === 1 ? "" : "s"} in a class. Ask your school administrator or AceAP support to reassign them, then try again.`;
  return null;
}

export const DELETION_LIMIT = { limit: 5, windowMs: 15 * 60_000 } as const;

export interface DeletionResult {
  deletedAt: Date;
  purgeAfter: Date;
  enrolmentsRemoved: number;
  identityMappingsRemoved: number;
  sessionsRevoked: number;
}

export async function requestAccountDeletion(
  user: Pick<SessionUser, "id">,
  input: { password: string; confirmation: string },
  now: Date = new Date(),
): Promise<DeletionResult> {
  if ((input.confirmation ?? "").trim() !== DELETE_CONFIRMATION_WORD)
    throw new AccountFieldError("confirmation", `Type ${DELETE_CONFIRMATION_WORD} in capital letters to confirm.`);

  const limit = rateLimit(`account-delete:${user.id}`, DELETION_LIMIT.limit, DELETION_LIMIT.windowMs, now.getTime());
  if (!limit.allowed) throw new DomainError("rate_limited", "Too many attempts. Please wait a few minutes and try again.");

  const db = await getDb();
  const [row] = await db
    .select({ passwordHash: t.users.passwordHash })
    .from(t.users)
    .where(and(eq(t.users.id, user.id), isNull(t.users.deletedAt)));
  if (!row) throw new DomainError("unauthenticated", "Sign in to continue.");
  const ok = await verifyPassword(input.password ?? "", row.passwordHash ?? DUMMY_HASH);
  if (!ok) throw new AccountFieldError("password", "That password isn't right.");

  const blocked = blockerMessage(await deletionBlockers(user.id, db));
  if (blocked) throw new DomainError("conflict", blocked);

  return db.transaction(async (tx) => {
    const [marked] = await tx
      .update(t.users)
      .set({ deletedAt: now })
      .where(and(eq(t.users.id, user.id), isNull(t.users.deletedAt)))
      .returning({ id: t.users.id });
    if (!marked) throw new DomainError("unauthenticated", "Sign in to continue.");
    const sessions = await tx.delete(t.sessions).where(eq(t.sessions.userId, user.id)).returning({ id: t.sessions.id });
    const enrolments = await tx
      .update(t.classEnrollments)
      .set({ status: "removed" })
      .where(and(eq(t.classEnrollments.studentId, user.id), eq(t.classEnrollments.status, "active")))
      .returning({ classId: t.classEnrollments.classId });
    const mappings = await tx
      .delete(t.externalIdentityMappings)
      .where(eq(t.externalIdentityMappings.userId, user.id))
      .returning({ id: t.externalIdentityMappings.externalUserId });
    await tx.delete(t.passwordResetTokens).where(eq(t.passwordResetTokens.userId, user.id));
    // Canvas roster review proposals that point at this account (suggestion / existing link).
    await tx.delete(t.lmsRosterProposals).where(or(eq(t.lmsRosterProposals.suggestedUserId, user.id), eq(t.lmsRosterProposals.linkedUserId, user.id)));
    const purgeAfter = purgeDateFor(now);
    await tx.insert(t.auditLogs).values({
      actorId: user.id,
      action: "account.deletion_requested",
      entityType: "user",
      entityId: user.id,
      metadata: { purgeAfter: purgeAfter.toISOString(), enrolmentsRemoved: enrolments.length, identityMappingsRemoved: mappings.length },
    });
    return { deletedAt: now, purgeAfter, enrolmentsRemoved: enrolments.length, identityMappingsRemoved: mappings.length, sessionsRevoked: sessions.length };
  });
}

export interface PurgeResult {
  /** Soft-deleted accounts past their grace period. */
  eligible: number;
  purged: string[];
  /** Still own classes/assignments — left in place and reported. */
  blocked: string[];
}

/** Soft-deleted accounts whose grace period has passed at `now`. */
async function purgeCandidates(db: Db, now: Date): Promise<string[]> {
  const cutoff = new Date(now.getTime() - purgeGraceDays() * DAY_MS);
  const rows = await db
    .select({ id: t.users.id })
    .from(t.users)
    .where(and(isNotNull(t.users.deletedAt), lte(t.users.deletedAt, cutoff)));
  return rows.map((r) => r.id);
}

export async function purgeDeletedAccounts(now: Date = new Date(), opts: { dryRun?: boolean } = {}): Promise<PurgeResult> {
  const db = await getDb();
  const candidates = await purgeCandidates(db, now);
  const result: PurgeResult = { eligible: candidates.length, purged: [], blocked: [] };

  for (const userId of candidates) {
    const b = await deletionBlockers(userId, db);
    if (b.classesOwned > 0 || b.assignmentsAuthored > 0) {
      result.blocked.push(userId);
      continue;
    }
    if (opts.dryRun) {
      result.purged.push(userId);
      continue;
    }
    await db.transaction(async (tx) => {
      const orgIds = (
        await tx.select({ id: t.organizationMemberships.organizationId }).from(t.organizationMemberships).where(eq(t.organizationMemberships.userId, userId))
      ).map((r) => r.id);
      // sync_jobs.student_id has no foreign key (jobs outlive enrolments); remove this user's jobs explicitly.
      await tx.delete(t.syncJobs).where(eq(t.syncJobs.studentId, userId));
      const [gone] = await tx
        .delete(t.users)
        .where(and(eq(t.users.id, userId), isNotNull(t.users.deletedAt)))
        .returning({ id: t.users.id });
      if (!gone) return;
      // A teacher's personal organisation ("<name>'s classes") is removed once nothing else uses it.
      if (orgIds.length) {
        const unused = await tx
          .select({ id: t.organizations.id })
          .from(t.organizations)
          .where(
            and(
              inArray(t.organizations.id, orgIds),
              sql`not exists (select 1 from ${t.organizationMemberships} m where m.organization_id = ${t.organizations.id})`,
              sql`not exists (select 1 from ${t.classes} c where c.organization_id = ${t.organizations.id})`,
              sql`not exists (select 1 from ${t.lmsConnections} l where l.organization_id = ${t.organizations.id})`,
            ),
          );
        if (unused.length) await tx.delete(t.organizations).where(inArray(t.organizations.id, unused.map((o) => o.id)));
      }
      await tx.insert(t.auditLogs).values({ actorId: null, action: "account.purged", entityType: "user", entityId: userId, metadata: {} });
      result.purged.push(userId);
    });
  }
  return result;
}
