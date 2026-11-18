/**
 * Password recovery and password changes (database side, framework-free).
 *
 *  - requestPasswordReset(email, clientKey)  always answers the same way for
 *    known and unknown addresses (no account enumeration); rate limited per
 *    email and per client. For a live account it invalidates earlier unused
 *    tokens, stores the SHA-256 of a new 32-byte token (30-minute expiry) and
 *    emails a link through the email adapter.
 *  - resetPasswordWithToken({ token, password })  single-use: marks the token
 *    used, sets the new hash, deletes ALL of the user's sessions and writes an
 *    `auth.password_reset` audit row. The caller then starts a fresh session.
 *  - changePassword(user, { currentPassword, newPassword }, currentSessionToken)
 *    requires the current password and revokes every other session.
 */
import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { DUMMY_HASH, PASSWORD_MIN_LENGTH, hashPassword, verifyPassword } from "@/modules/auth/password";
import { hashToken, type SessionUser } from "@/modules/auth/service";
import { getEmailSender } from "@/modules/notifications/email";
import { AccountFieldError } from "./errors";

export const RESET_TOKEN_TTL_MS = 30 * 60_000;
export const RESET_LIMITS = {
  perEmail: { limit: 3, windowMs: 15 * 60_000 },
  perClient: { limit: 10, windowMs: 15 * 60_000 },
  /** Token redemption attempts per client (tokens are unguessable; this only caps noise). */
  redeemPerClient: { limit: 20, windowMs: 15 * 60_000 },
  /** Wrong current-password attempts when changing a password while signed in. */
  changePerUser: { limit: 5, windowMs: 15 * 60_000 },
} as const;

/** The one message shown after any well-formed reset request. */
export const RESET_REQUEST_MESSAGE = "If an account exists for that email, we've sent a link to reset the password. It expires in 30 minutes.";

export const appBaseUrl = () => (process.env.APP_BASE_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.").max(200);
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(200, "Use at most 200 characters.");

export type ResetRequestResult = { status: "sent" } | { status: "email_unavailable" };

function minutes(seconds: number) {
  const m = Math.max(1, Math.ceil(seconds / 60));
  return `${m} minute${m === 1 ? "" : "s"}`;
}

function resetEmail(name: string, link: string) {
  return {
    subject: "Reset your AceAP password",
    text: [
      `Hi ${name},`,
      "",
      "Someone (hopefully you) asked to reset the password for your AceAP account.",
      "Open this link within 30 minutes to choose a new password:",
      "",
      link,
      "",
      "The link works once. Resetting your password signs you out on every device.",
      "If you didn't ask for this, you can ignore this email — your password won't change.",
    ].join("\n"),
  };
}

export async function requestPasswordReset(rawEmail: string, clientKey: string, now: Date = new Date()): Promise<ResetRequestResult> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) throw new DomainError("invalid", parsed.error.issues[0]?.message ?? "Enter a valid email address.");
  const email = parsed.data;

  const byEmail = rateLimit(`reset:email:${email}`, RESET_LIMITS.perEmail.limit, RESET_LIMITS.perEmail.windowMs, now.getTime());
  const byClient = rateLimit(`reset:client:${clientKey}`, RESET_LIMITS.perClient.limit, RESET_LIMITS.perClient.windowMs, now.getTime());
  if (!byEmail.allowed || !byClient.allowed) {
    const wait = Math.max(byEmail.retryAfterSeconds, byClient.retryAfterSeconds);
    throw new DomainError("rate_limited", `Too many reset requests. Try again in about ${minutes(wait)}.`);
  }

  // Checked before looking the account up, so the answer is identical for every address.
  const sender = getEmailSender();
  if (!sender.configured) return { status: "email_unavailable" };

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);

  const db = await getDb();
  const [user] = await db
    .select({ id: t.users.id, name: t.users.name, email: t.users.email })
    .from(t.users)
    .where(and(sql`lower(${t.users.email}) = ${email}`, isNull(t.users.deletedAt)));
  if (!user) return { status: "sent" };

  await db.transaction(async (tx) => {
    // Only the newest link works.
    await tx.delete(t.passwordResetTokens).where(and(eq(t.passwordResetTokens.userId, user.id), isNull(t.passwordResetTokens.usedAt)));
    await tx.insert(t.passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS), createdAt: now });
    await tx.insert(t.auditLogs).values({ actorId: user.id, action: "auth.password_reset_requested", entityType: "user", entityId: user.id, metadata: {} });
  });

  const link = `${appBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  try {
    await sender.send({ to: user.email, ...resetEmail(user.name, link) });
  } catch (err) {
    // Same answer as for unknown addresses; the failure is for operators to see.
    console.error("[password-reset] email delivery failed", err instanceof Error ? err.message : err);
  }
  return { status: "sent" };
}

async function findUsableToken(token: string, now: Date) {
  if (!token || token.length < 20 || token.length > 200) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: t.passwordResetTokens.id, userId: t.passwordResetTokens.userId })
    .from(t.passwordResetTokens)
    .innerJoin(t.users, eq(t.users.id, t.passwordResetTokens.userId))
    .where(
      and(
        eq(t.passwordResetTokens.tokenHash, hashToken(token)),
        isNull(t.passwordResetTokens.usedAt),
        gt(t.passwordResetTokens.expiresAt, now),
        isNull(t.users.deletedAt),
      ),
    );
  return row ?? null;
}

/** Whether a reset link can still be used (for showing the form vs. an "expired" notice). */
export async function isResetTokenUsable(token: string, now: Date = new Date()): Promise<boolean> {
  return (await findUsableToken(token, now)) !== null;
}

const INVALID_LINK = "This reset link is invalid, has expired or was already used. Request a new one.";

export async function resetPasswordWithToken(
  input: { token: string; password: string },
  clientKey: string,
  now: Date = new Date(),
): Promise<SessionUser> {
  const limit = rateLimit(`reset:redeem:${clientKey}`, RESET_LIMITS.redeemPerClient.limit, RESET_LIMITS.redeemPerClient.windowMs, now.getTime());
  if (!limit.allowed) throw new DomainError("rate_limited", `Too many attempts. Try again in about ${minutes(limit.retryAfterSeconds)}.`);

  const password = newPasswordSchema.safeParse(input.password);
  if (!password.success) throw new DomainError("invalid", password.error.issues[0]?.message ?? "Choose a longer password.");

  const found = await findUsableToken(input.token, now);
  if (!found) throw new DomainError("invalid", INVALID_LINK);
  const passwordHash = await hashPassword(password.data);

  const db = await getDb();
  const user = await db.transaction(async (tx) => {
    // Claim the token atomically: a second concurrent redemption finds it used.
    const [claimed] = await tx
      .update(t.passwordResetTokens)
      .set({ usedAt: now })
      .where(and(eq(t.passwordResetTokens.id, found.id), isNull(t.passwordResetTokens.usedAt), gt(t.passwordResetTokens.expiresAt, now)))
      .returning({ id: t.passwordResetTokens.id });
    if (!claimed) return null;
    const [updated] = await tx
      .update(t.users)
      .set({ passwordHash })
      .where(and(eq(t.users.id, found.userId), isNull(t.users.deletedAt)))
      .returning({ id: t.users.id, email: t.users.email, name: t.users.name, role: t.users.role, isDemo: t.users.isDemo });
    if (!updated) return null;
    await tx.delete(t.sessions).where(eq(t.sessions.userId, updated.id));
    await tx.delete(t.passwordResetTokens).where(and(eq(t.passwordResetTokens.userId, updated.id), isNull(t.passwordResetTokens.usedAt)));
    await tx.insert(t.auditLogs).values({ actorId: updated.id, action: "auth.password_reset", entityType: "user", entityId: updated.id, metadata: { sessionsRevoked: true } });
    return updated;
  });
  if (!user) throw new DomainError("invalid", INVALID_LINK);
  return user;
}

/** Delete a user's sessions, optionally keeping the one with this cookie token. Returns how many were removed. */
export async function revokeSessions(userId: string, opts: { exceptToken?: string | null } = {}): Promise<number> {
  const db = await getDb();
  const rows = await db
    .delete(t.sessions)
    .where(and(eq(t.sessions.userId, userId), opts.exceptToken ? ne(t.sessions.tokenHash, hashToken(opts.exceptToken)) : undefined))
    .returning({ id: t.sessions.id });
  return rows.length;
}

export async function changePassword(
  user: Pick<SessionUser, "id">,
  input: { currentPassword: string; newPassword: string },
  currentSessionToken: string | null | undefined,
  now: Date = new Date(),
): Promise<{ otherSessionsRevoked: number }> {
  const next = newPasswordSchema.safeParse(input.newPassword);
  if (!next.success) throw new DomainError("invalid", next.error.issues[0]?.message ?? "Choose a longer password.");

  const db = await getDb();
  const [row] = await db
    .select({ passwordHash: t.users.passwordHash })
    .from(t.users)
    .where(and(eq(t.users.id, user.id), isNull(t.users.deletedAt)));
  if (!row) throw new DomainError("unauthenticated", "Sign in to continue.");

  // Every attempt counts, so the limit also caps guessing of the current password.
  const limit = rateLimit(`password-change:${user.id}`, RESET_LIMITS.changePerUser.limit, RESET_LIMITS.changePerUser.windowMs, now.getTime());
  if (!limit.allowed) throw new DomainError("rate_limited", `Too many attempts. Try again in about ${minutes(limit.retryAfterSeconds)}.`);
  const ok = await verifyPassword(input.currentPassword ?? "", row.passwordHash ?? DUMMY_HASH);
  if (!ok) throw new AccountFieldError("currentPassword", "Your current password isn't right.");

  const passwordHash = await hashPassword(next.data);
  await db.update(t.users).set({ passwordHash }).where(eq(t.users.id, user.id));
  const otherSessionsRevoked = await revokeSessions(user.id, { exceptToken: currentSessionToken });
  await db.delete(t.passwordResetTokens).where(and(eq(t.passwordResetTokens.userId, user.id), isNull(t.passwordResetTokens.usedAt)));
  await db.insert(t.auditLogs).values({ actorId: user.id, action: "auth.password_changed", entityType: "user", entityId: user.id, metadata: { otherSessionsRevoked } });
  return { otherSessionsRevoked };
}
