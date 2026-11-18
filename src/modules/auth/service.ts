/**
 * Accounts and sessions (database side). Framework-free so it can be tested
 * without Next.js; cookie handling lives in ./session.ts.
 */
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { DUMMY_HASH, PASSWORD_MIN_LENGTH, hashPassword, verifyPassword } from "./password";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: t.UserRole;
  isDemo: boolean;
}

const sessionTtlMs = () => Math.max(1, Number(process.env.SESSION_TTL_DAYS ?? 14)) * 24 * 60 * 60 * 1000;
/** SHA-256 (hex) of an opaque token — sessions and password-reset tokens store only this. */
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(200),
  password: z.string().min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`).max(200),
  role: z.enum(["student", "teacher"]),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(200),
  password: z.string().min(1, "Enter your password.").max(200),
});

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: t.UserRole;
  isDemo?: boolean;
  /** Self-registered teachers get a personal organisation; seeded users are placed explicitly. */
  createPersonalOrganization?: boolean;
}

export async function createUser(input: CreateUserInput): Promise<SessionUser> {
  const db = await getDb();
  const email = input.email.trim().toLowerCase();
  const [existing] = await db.select({ id: t.users.id }).from(t.users).where(sql`lower(${t.users.email}) = ${email}`);
  if (existing) throw new DomainError("conflict", "An account with that email already exists.");
  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(t.users)
    .values({ email, name: input.name.trim(), passwordHash, role: input.role, isDemo: input.isDemo ?? false })
    .returning();

  if (user.role === "teacher" && input.createPersonalOrganization) {
    const base = user.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "teacher";
    const [org] = await db.insert(t.organizations).values({ name: `${user.name}'s classes`, slug: `${base}-${user.id.slice(0, 6)}` }).returning();
    await db.insert(t.organizationMemberships).values({ organizationId: org.id, userId: user.id, role: "teacher" });
  }
  await db.insert(t.auditLogs).values({ actorId: user.id, action: "user.created", entityType: "user", entityId: user.id, metadata: { role: user.role } });
  return { id: user.id, email: user.email, name: user.name, role: user.role, isDemo: user.isDemo };
}

/** Verify credentials. Attempts are rate limited per email and per client address. */
export async function authenticate(input: z.infer<typeof signInSchema>, clientKey: string): Promise<SessionUser> {
  const email = input.email.toLowerCase();
  const byEmail = await rateLimit(`login:email:${email}`, 8, 10 * 60_000);
  const byClient = await rateLimit(`login:client:${clientKey}`, 40, 10 * 60_000);
  if (!byEmail.allowed || !byClient.allowed) {
    const wait = Math.ceil(Math.max(byEmail.retryAfterSeconds, byClient.retryAfterSeconds) / 60);
    throw new DomainError("rate_limited", `Too many sign-in attempts. Try again in about ${wait} minute${wait === 1 ? "" : "s"}.`);
  }

  const db = await getDb();
  const [user] = await db
    .select()
    .from(t.users)
    .where(and(sql`lower(${t.users.email}) = ${email}`, sql`${t.users.deletedAt} is null`));
  // Always run a hash comparison so response time doesn't reveal whether the account exists.
  const ok = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    await db.insert(t.auditLogs).values({ actorId: user?.id ?? null, action: "auth.sign_in_failed", entityType: "user", entityId: user?.id ?? null, metadata: {} });
    throw new DomainError("unauthenticated", "That email and password don't match.");
  }
  return { id: user.id, email: user.email, name: user.name, role: user.role, isDemo: user.isDemo };
}

export async function createSession(userId: string, now: Date = new Date()): Promise<{ token: string; expiresAt: Date }> {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + sessionTtlMs());
  await db.insert(t.sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  await db.delete(t.sessions).where(lt(t.sessions.expiresAt, now));
  await db.insert(t.auditLogs).values({ actorId: userId, action: "auth.sign_in", entityType: "session", metadata: {} });
  return { token, expiresAt };
}

export async function getUserBySessionToken(token: string | undefined | null, now: Date = new Date()): Promise<SessionUser | null> {
  if (!token || token.length < 20 || token.length > 200) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: t.users.id, email: t.users.email, name: t.users.name, role: t.users.role, isDemo: t.users.isDemo })
    .from(t.sessions)
    .innerJoin(t.users, eq(t.users.id, t.sessions.userId))
    .where(and(eq(t.sessions.tokenHash, hashToken(token)), gt(t.sessions.expiresAt, now), sql`${t.users.deletedAt} is null`));
  return row ?? null;
}

export async function destroySession(token: string | undefined | null): Promise<void> {
  if (!token) return;
  const db = await getDb();
  await db.delete(t.sessions).where(eq(t.sessions.tokenHash, hashToken(token)));
}
