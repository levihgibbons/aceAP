/**
 * Profile edits and the "account basics" export (framework-free).
 */
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { z } from "zod";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import type { SessionUser } from "@/modules/auth/service";

export const profileNameSchema = z.string().trim().min(2, "Enter your name (at least 2 characters).").max(80, "Use at most 80 characters.");

export async function updateProfileName(user: Pick<SessionUser, "id">, rawName: string): Promise<{ name: string }> {
  const parsed = profileNameSchema.safeParse(rawName);
  if (!parsed.success) throw new DomainError("invalid", parsed.error.issues[0]?.message ?? "Enter your name.");
  const db = await getDb();
  const [row] = await db
    .update(t.users)
    .set({ name: parsed.data })
    .where(and(eq(t.users.id, user.id), isNull(t.users.deletedAt)))
    .returning({ name: t.users.name });
  if (!row) throw new DomainError("unauthenticated", "Sign in to continue.");
  // The audit row records that the name changed, not the name itself.
  await db.insert(t.auditLogs).values({ actorId: user.id, action: "user.profile_updated", entityType: "user", entityId: user.id, metadata: { fields: ["name"] } });
  return row;
}

/** When the account was created (null if it no longer exists). */
export async function memberSince(userId: string): Promise<Date | null> {
  const db = await getDb();
  const [row] = await db.select({ createdAt: t.users.createdAt }).from(t.users).where(eq(t.users.id, userId));
  return row?.createdAt ?? null;
}

export const ACCOUNT_EXPORT_SCHEMA = "aceap.account-export";
export const ACCOUNT_EXPORT_SCHEMA_VERSION = "1.0.0";

export interface AccountExport {
  schema: typeof ACCOUNT_EXPORT_SCHEMA;
  schemaVersion: typeof ACCOUNT_EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  account: { id: string; name: string; email: string; role: t.UserRole; isDemo: boolean; createdAt: string };
  organizations: { name: string; role: string; joinedAt: string }[];
  classEnrolments: { className: string; courseId: string; status: string; joinedAt: string }[];
  classesTaught: { className: string; courseId: string; createdAt: string; archivedAt: string | null }[];
  courses: { courseId: string; addedAt: string }[];
  counts: Record<string, number>;
  notes: string[];
}

/** Account basics as JSON. Learning records and notes come from the vault export. */
export async function getAccountExport(user: Pick<SessionUser, "id">, now: Date = new Date()): Promise<AccountExport> {
  const db = await getDb();
  const [account] = await db
    .select({ id: t.users.id, name: t.users.name, email: t.users.email, role: t.users.role, isDemo: t.users.isDemo, createdAt: t.users.createdAt })
    .from(t.users)
    .where(and(eq(t.users.id, user.id), isNull(t.users.deletedAt)));
  if (!account) throw new DomainError("unauthenticated", "Sign in to continue.");

  const organizations = await db
    .select({ name: t.organizations.name, role: t.organizationMemberships.role, joinedAt: t.organizationMemberships.createdAt })
    .from(t.organizationMemberships)
    .innerJoin(t.organizations, eq(t.organizations.id, t.organizationMemberships.organizationId))
    .where(eq(t.organizationMemberships.userId, user.id))
    .orderBy(asc(t.organizations.name));
  const classEnrolments = await db
    .select({ className: t.classes.name, courseId: t.classes.courseId, status: t.classEnrollments.status, joinedAt: t.classEnrollments.joinedAt })
    .from(t.classEnrollments)
    .innerJoin(t.classes, eq(t.classes.id, t.classEnrollments.classId))
    .where(eq(t.classEnrollments.studentId, user.id))
    .orderBy(asc(t.classEnrollments.joinedAt));
  const classesTaught = await db
    .select({ className: t.classes.name, courseId: t.classes.courseId, createdAt: t.classes.createdAt, archivedAt: t.classes.archivedAt })
    .from(t.classes)
    .where(eq(t.classes.teacherId, user.id))
    .orderBy(asc(t.classes.createdAt));
  const courses = await db
    .select({ courseId: t.courseEnrollments.courseId, addedAt: t.courseEnrollments.createdAt })
    .from(t.courseEnrollments)
    .where(eq(t.courseEnrollments.userId, user.id))
    .orderBy(asc(t.courseEnrollments.createdAt));

  const count = async (table: PgTable, col: AnyPgColumn) => {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(table).where(eq(col, user.id));
    return n;
  };

  return {
    schema: ACCOUNT_EXPORT_SCHEMA,
    schemaVersion: ACCOUNT_EXPORT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    account: { ...account, createdAt: account.createdAt.toISOString() },
    organizations: organizations.map((o) => ({ ...o, joinedAt: o.joinedAt.toISOString() })),
    classEnrolments: classEnrolments.map((e) => ({ ...e, joinedAt: e.joinedAt.toISOString() })),
    classesTaught: classesTaught.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), archivedAt: c.archivedAt?.toISOString() ?? null })),
    courses: courses.map((c) => ({ ...c, addedAt: c.addedAt.toISOString() })),
    counts: {
      vaultNotes: await count(t.vaultNotes, t.vaultNotes.userId),
      attempts: await count(t.attempts, t.attempts.userId),
      masteryEvidence: await count(t.masteryEvidence, t.masteryEvidence.userId),
      learningEvents: await count(t.learningEvents, t.learningEvents.userId),
    },
    notes: [
      "Your password is never exported (only a one-way hash is stored).",
      "Students: your notes, mastery levels, evidence summary and mastery history are in the vault export (/app/vault/export).",
    ],
  };
}
