/**
 * Account lifecycle: password reset, password change, account deletion,
 * purge after the grace period, and retention enforcement.
 *
 * Runs against the real services on a per-file in-memory PostgreSQL (PGlite)
 * with all migrations (incl. RLS) applied. Email goes through the development
 * "outbox" adapter, so reset links are read back from `email_outbox`.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, isNotNull, lt, or } from "drizzle-orm";
import { asUser } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { resetRateLimit } from "@/lib/rate-limit";
import { purgeDeletedAccounts, requestAccountDeletion } from "@/modules/accounts/deletion";
import { AccountFieldError } from "@/modules/accounts/errors";
import { RESET_LIMITS, RESET_TOKEN_TTL_MS, changePassword, isResetTokenUsable, requestPasswordReset, resetPasswordWithToken } from "@/modules/accounts/password";
import { getAccountExport, updateProfileName } from "@/modules/accounts/profile";
import { runRetention } from "@/modules/accounts/retention";
import { startAttempt } from "@/modules/assessments/service";
import { authenticate, createSession, createUser, getUserBySessionToken, type SessionUser } from "@/modules/auth/service";
import { getEmailSender } from "@/modules/notifications/email";
import { createNote } from "@/modules/vault/service";
import { DAY, MINUTE, TEST_PASSWORD, answerCorrectly, attemptRow, bootWorld, calc, countRows, plus, rejection, type World } from "./helpers/world";

const NEW_PASSWORD = "brand-new-password-42";
let w: World;

async function outboxFor(email: string) {
  return w.db.select().from(t.emailOutbox).where(eq(t.emailOutbox.to, email));
}

/** Request a reset and return the token from the emailed link. */
async function requestToken(email: string, clientKey = "test-client", now = new Date()): Promise<string> {
  const before = (await outboxFor(email)).length;
  const result = await requestPasswordReset(email, clientKey, now);
  expect(result).toEqual({ status: "sent" });
  const messages = await outboxFor(email);
  expect(messages.length).toBe(before + 1);
  const newest = messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1))[0];
  const match = /\/reset-password\?token=([^\s]+)/.exec(newest.text);
  if (!match) throw new Error(`No reset link in: ${newest.text}`);
  return decodeURIComponent(match[1]);
}

async function signIn(email: string, password: string) {
  return authenticate({ email, password }, `signin-${Math.random()}`);
}

async function codeOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof DomainError) return e instanceof AccountFieldError ? `${e.code}:${e.field}` : e.code;
    throw e;
  }
  throw new Error("Expected the operation to be rejected, but it succeeded.");
}

beforeAll(async () => {
  w = await bootWorld();
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetRateLimit();
});

describe("email adapter", () => {
  it("uses the outbox outside production, and refuses honestly in production unless the e2e flag is set", () => {
    expect(getEmailSender()).toMatchObject({ kind: "outbox", configured: true });

    vi.stubEnv("NODE_ENV", "production");
    expect(getEmailSender()).toMatchObject({ kind: "none", configured: false });
    vi.stubEnv("EMAIL_PROVIDER", "outbox");
    expect(getEmailSender().configured).toBe(false);
    vi.stubEnv("ACEAP_DEV_OUTBOX", "1");
    expect(getEmailSender()).toMatchObject({ kind: "outbox", configured: true });

    vi.stubEnv("EMAIL_PROVIDER", "none");
    expect(getEmailSender().configured).toBe(false);
  });

  it("an unconfigured sender throws instead of pretending to send", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "none");
    await expect(getEmailSender().send({ to: "x@world.test", subject: "s", text: "t" })).rejects.toThrow(/not configured/);
  });

  it("the outbox and reset-token tables are invisible to the restricted application role", async () => {
    const actor = { id: w.admin.id, role: w.admin.role };
    expect(await rejection(asUser(actor, (tx) => tx.select().from(t.emailOutbox)))).toMatch(/permission denied/);
    expect(await rejection(asUser(actor, (tx) => tx.select().from(t.passwordResetTokens)))).toMatch(/permission denied/);
  });
});

describe("password reset", () => {
  it("answers an unknown email exactly like a known one, but creates nothing", async () => {
    const tokensBefore = await countRows(t.passwordResetTokens);
    const outboxBefore = await countRows(t.emailOutbox);
    const unknown = await requestPasswordReset("nobody@world.test", "c1");
    expect(unknown).toEqual({ status: "sent" });
    expect(await countRows(t.passwordResetTokens)).toBe(tokensBefore);
    expect(await countRows(t.emailOutbox)).toBe(outboxBefore);

    const known = await requestPasswordReset(w.students.dev.email, "c1");
    expect(known).toEqual(unknown);
    expect(await countRows(t.passwordResetTokens)).toBe(tokensBefore + 1);
    expect(await countRows(t.emailOutbox)).toBe(outboxBefore + 1);
  });

  it("stores only the SHA-256 of the token and emails an absolute link", async () => {
    const token = await requestToken(w.students.dev.email);
    expect(token.length).toBeGreaterThanOrEqual(43); // 32 random bytes, base64url
    const rows = await w.db.select().from(t.passwordResetTokens).where(eq(t.passwordResetTokens.userId, w.students.dev.id));
    expect(rows.some((r) => r.tokenHash === token)).toBe(false);
    expect(rows.every((r) => /^[0-9a-f]{64}$/.test(r.tokenHash))).toBe(true);
    const [mail] = (await outboxFor(w.students.dev.email)).slice(-1);
    expect(mail.text).toMatch(/^Hi Dev Rao,/);
    expect(mail.text).toContain("http://localhost:3000/reset-password?token=");
  });

  it("when email isn't configured, says so for every address and creates no token", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "none");
    const tokensBefore = await countRows(t.passwordResetTokens);
    expect(await requestPasswordReset(w.students.dev.email, "c2")).toEqual({ status: "email_unavailable" });
    expect(await requestPasswordReset("nobody@world.test", "c2")).toEqual({ status: "email_unavailable" });
    expect(await countRows(t.passwordResetTokens)).toBe(tokensBefore);
  });

  it("a token is single-use, a newer request invalidates older links, and links expire after 30 minutes", async () => {
    const quinn = w.students.quinn;
    const first = await requestToken(quinn.email);
    const second = await requestToken(quinn.email);
    expect(await isResetTokenUsable(first)).toBe(false);
    expect(await isResetTokenUsable(second)).toBe(true);
    expect(await codeOf(resetPasswordWithToken({ token: first, password: NEW_PASSWORD }, "r"))).toBe("invalid");

    await resetPasswordWithToken({ token: second, password: NEW_PASSWORD }, "r");
    expect(await codeOf(resetPasswordWithToken({ token: second, password: "another-password-99" }, "r"))).toBe("invalid");
    await expect(signIn(quinn.email, NEW_PASSWORD)).resolves.toMatchObject({ id: quinn.id });

    const issuedAt = new Date();
    const third = await requestToken(quinn.email, "test-client", issuedAt);
    const late = plus(issuedAt, RESET_TOKEN_TTL_MS + MINUTE);
    expect(await isResetTokenUsable(third, late)).toBe(false);
    expect(await codeOf(resetPasswordWithToken({ token: third, password: "too-late-password" }, "r", late))).toBe("invalid");
    expect(await isResetTokenUsable(third, plus(issuedAt, RESET_TOKEN_TTL_MS - MINUTE))).toBe(true);
  });

  it("rejects a too-short password without using up the token", async () => {
    const token = await requestToken(w.students.cleo.email);
    expect(await codeOf(resetPasswordWithToken({ token, password: "short" }, "r"))).toBe("invalid");
    expect(await isResetTokenUsable(token)).toBe(true);
  });

  it("a successful reset revokes every session, changes the password and is audited", async () => {
    const cleo = w.students.cleo;
    const a = await createSession(cleo.id);
    const b = await createSession(cleo.id);
    expect(await getUserBySessionToken(a.token)).not.toBeNull();

    const token = await requestToken(cleo.email);
    const user = await resetPasswordWithToken({ token, password: NEW_PASSWORD }, "r");
    expect(user).toMatchObject({ id: cleo.id, role: "student" });
    expect(await getUserBySessionToken(a.token)).toBeNull();
    expect(await getUserBySessionToken(b.token)).toBeNull();
    expect(await countRows(t.sessions, eq(t.sessions.userId, cleo.id))).toBe(0);
    expect(await codeOf(signIn(cleo.email, TEST_PASSWORD))).toBe("unauthenticated");
    await expect(signIn(cleo.email, NEW_PASSWORD)).resolves.toMatchObject({ id: cleo.id });
    expect(await countRows(t.auditLogs, and(eq(t.auditLogs.action, "auth.password_reset"), eq(t.auditLogs.actorId, cleo.id)))).toBe(1);
  });

  it("demo accounts may reset too", async () => {
    const demo = await createUser({ name: "Demo Person", email: "demo-person@world.test", password: TEST_PASSWORD, role: "student", isDemo: true });
    const token = await requestToken(demo.email);
    await expect(resetPasswordWithToken({ token, password: NEW_PASSWORD }, "r")).resolves.toMatchObject({ id: demo.id, isDemo: true });
  });

  it("is rate limited per email and per client", async () => {
    const email = w.students.ada.email;
    for (let i = 0; i < RESET_LIMITS.perEmail.limit; i++) await requestPasswordReset(email, `client-${i}`);
    expect(await codeOf(requestPasswordReset(email, "client-other"))).toBe("rate_limited");
    // Unknown addresses are limited the same way (no enumeration through limits).
    for (let i = 0; i < RESET_LIMITS.perEmail.limit; i++) await requestPasswordReset("ghost@world.test", `g-${i}`);
    expect(await codeOf(requestPasswordReset("ghost@world.test", "g-x"))).toBe("rate_limited");

    resetRateLimit();
    for (let i = 0; i < RESET_LIMITS.perClient.limit; i++) await requestPasswordReset(`someone-${i}@world.test`, "one-client");
    expect(await codeOf(requestPasswordReset("someone-new@world.test", "one-client"))).toBe("rate_limited");
  });
});

describe("change password and profile", () => {
  it("requires the current password and revokes every other session", async () => {
    const ben = w.students.ben;
    const current = await createSession(ben.id);
    const other = await createSession(ben.id);

    expect(await codeOf(changePassword(ben, { currentPassword: "wrong-password!", newPassword: NEW_PASSWORD }, current.token))).toBe("invalid:currentPassword");
    expect(await codeOf(changePassword(ben, { currentPassword: TEST_PASSWORD, newPassword: "short" }, current.token))).toBe("invalid");
    await expect(signIn(ben.email, TEST_PASSWORD)).resolves.toMatchObject({ id: ben.id });

    const result = await changePassword(ben, { currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD }, current.token);
    expect(result.otherSessionsRevoked).toBeGreaterThanOrEqual(1);
    expect(await getUserBySessionToken(current.token)).toMatchObject({ id: ben.id });
    expect(await getUserBySessionToken(other.token)).toBeNull();
    await expect(signIn(ben.email, NEW_PASSWORD)).resolves.toMatchObject({ id: ben.id });
    expect(await countRows(t.auditLogs, and(eq(t.auditLogs.action, "auth.password_changed"), eq(t.auditLogs.actorId, ben.id)))).toBe(1);
  });

  it("caps guesses of the current password", async () => {
    const dev = w.students.dev;
    for (let i = 0; i < RESET_LIMITS.changePerUser.limit; i++)
      await codeOf(changePassword(dev, { currentPassword: `guess-${i}-guess`, newPassword: NEW_PASSWORD }, null));
    expect(await codeOf(changePassword(dev, { currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD }, null))).toBe("rate_limited");
  });

  it("edits the name (audited without the name itself) and exports account basics", async () => {
    const dev = w.students.dev;
    await expect(updateProfileName(dev, "  ")).rejects.toThrow(/name/i);
    await updateProfileName(dev, "Dev R. Rao");
    const [audit] = await w.db.select().from(t.auditLogs).where(and(eq(t.auditLogs.action, "user.profile_updated"), eq(t.auditLogs.actorId, dev.id)));
    expect(JSON.stringify(audit.metadata)).not.toContain("Rao");

    const data = await getAccountExport(dev);
    expect(data).toMatchObject({ schema: "aceap.account-export", account: { id: dev.id, name: "Dev R. Rao", email: dev.email, role: "student" } });
    expect(data.classEnrolments).toEqual([expect.objectContaining({ className: "Calculus AB (test)", status: "active" })]);
    expect(JSON.stringify(data)).not.toContain("scrypt$");
    await updateProfileName(dev, "Dev Rao");
  });
});

describe("account deletion", () => {
  let lmsConnectionId = "";

  beforeAll(async () => {
    const [conn] = await w.db
      .insert(t.lmsConnections)
      .values({
        organizationId: w.orgs.northfield.id,
        platform: "canvas",
        issuer: "https://canvas.world.test",
        clientId: "10000000000001",
        deploymentId: "1:abc",
        authLoginUrl: "https://canvas.world.test/api/lti/authorize_redirect",
        authTokenUrl: "https://canvas.world.test/login/oauth2/token",
        jwksUrl: "https://canvas.world.test/api/lti/security/jwks",
      })
      .returning();
    lmsConnectionId = conn.id;
  });

  it("requires the word DELETE and the right password", async () => {
    const ada = w.students.ada;
    expect(await codeOf(requestAccountDeletion(ada, { password: TEST_PASSWORD, confirmation: "delete" }))).toBe("invalid:confirmation");
    expect(await codeOf(requestAccountDeletion(ada, { password: "not-my-password", confirmation: "DELETE" }))).toBe("invalid:password");
    const [row] = await w.db.select({ deletedAt: t.users.deletedAt }).from(t.users).where(eq(t.users.id, ada.id));
    expect(row.deletedAt).toBeNull();
  });

  it("a teacher who owns classes is blocked with a clear message; nothing changes", async () => {
    const nora = w.teachers.northfield;
    const message = await rejection(requestAccountDeletion(nora, { password: TEST_PASSWORD, confirmation: "DELETE" }));
    expect(message).toMatch(/You still own 2 classes/);
    expect(message).toMatch(/school administrator/);
    const [row] = await w.db.select({ deletedAt: t.users.deletedAt }).from(t.users).where(eq(t.users.id, nora.id));
    expect(row.deletedAt).toBeNull();
  });

  it("demo accounts can't be deleted", async () => {
    const demo = await createUser({ name: "Demo Two", email: "demo-two@world.test", password: TEST_PASSWORD, role: "student", isDemo: true });
    expect(await rejection(requestAccountDeletion(demo, { password: TEST_PASSWORD, confirmation: "DELETE" }))).toMatch(/Demo accounts/);
  });

  it("soft-deletes, revokes sessions, removes enrolments and LMS identity mappings, and blocks sign-in", async () => {
    const ada = w.students.ada;
    const session = await createSession(ada.id);
    await w.db.insert(t.externalIdentityMappings).values({ connectionId: lmsConnectionId, externalUserId: "canvas-user-ada", userId: ada.id, linkedVia: "lti_launch_signed_in" });
    const at = new Date();

    const result = await requestAccountDeletion(ada, { password: TEST_PASSWORD, confirmation: " DELETE " }, at);
    expect(result).toMatchObject({ enrolmentsRemoved: 1, identityMappingsRemoved: 1 });
    expect(result.purgeAfter.getTime()).toBe(at.getTime() + 30 * DAY);

    const [row] = await w.db.select({ deletedAt: t.users.deletedAt }).from(t.users).where(eq(t.users.id, ada.id));
    expect(row.deletedAt?.getTime()).toBe(at.getTime());
    expect(await getUserBySessionToken(session.token)).toBeNull();
    expect(await countRows(t.sessions, eq(t.sessions.userId, ada.id))).toBe(0);
    expect(await countRows(t.classEnrollments, and(eq(t.classEnrollments.studentId, ada.id), eq(t.classEnrollments.status, "active")))).toBe(0);
    expect(await countRows(t.externalIdentityMappings, eq(t.externalIdentityMappings.userId, ada.id))).toBe(0);
    expect(await codeOf(signIn(ada.email, TEST_PASSWORD))).toBe("unauthenticated");
    // No reset link for a deleted account (and the same answer as for anyone else).
    const tokens = await countRows(t.passwordResetTokens, eq(t.passwordResetTokens.userId, ada.id));
    expect(await requestPasswordReset(ada.email, "after-delete")).toEqual({ status: "sent" });
    expect(await countRows(t.passwordResetTokens, eq(t.passwordResetTokens.userId, ada.id))).toBe(tokens);
    // The teacher no longer sees her through row-level security.
    const nora = { id: w.teachers.northfield.id, role: w.teachers.northfield.role };
    expect(await asUser(nora, (tx) => tx.select().from(t.masteryStates).where(eq(t.masteryStates.userId, ada.id)))).toEqual([]);
    expect(await countRows(t.auditLogs, and(eq(t.auditLogs.action, "account.deletion_requested"), eq(t.auditLogs.entityId, ada.id)))).toBe(1);
  });
});

describe("purge after the grace period", () => {
  let gina: SessionUser;
  let tara: SessionUser;
  let deletedAt: Date;

  beforeAll(async () => {
    // Gina: a student with private records. Tara: a self-registered teacher with no classes.
    gina = await createUser({ name: "Gina Purge", email: "gina@world.test", password: TEST_PASSWORD, role: "student" });
    tara = await createUser({ name: "Tara Solo", email: "tara@world.test", password: TEST_PASSWORD, role: "teacher", createPersonalOrganization: true });
    await createNote(gina, { title: "My chain rule notes", body: "Outside first, then [[Chain rule]]." });
    const practice = await startAttempt(gina.id, { kind: "practice", skillId: calc("power-rule"), count: 2 });
    for (const item of (await attemptRow(practice.attemptId)).items) await answerCorrectly(practice.attemptId, item.questionId);
    expect(await countRows(t.masteryEvidence, eq(t.masteryEvidence.userId, gina.id))).toBeGreaterThan(0);
    expect(await countRows(t.vaultNotes, eq(t.vaultNotes.userId, gina.id))).toBe(1);

    deletedAt = new Date();
    await requestAccountDeletion(gina, { password: TEST_PASSWORD, confirmation: "DELETE" }, deletedAt);
    await requestAccountDeletion(tara, { password: TEST_PASSWORD, confirmation: "DELETE" }, deletedAt);
  });

  it("does nothing before the grace period ends", async () => {
    const result = await purgeDeletedAccounts(plus(deletedAt, 29 * DAY));
    expect(result.purged).not.toContain(gina.id);
    expect(await countRows(t.users, eq(t.users.id, gina.id))).toBe(1);
    expect(await countRows(t.vaultNotes, eq(t.vaultNotes.userId, gina.id))).toBe(1);
    expect(await countRows(t.masteryEvidence, eq(t.masteryEvidence.userId, gina.id))).toBeGreaterThan(0);
  });

  it("afterwards removes the user and their private records, keeps id-only audit rows, and is idempotent", async () => {
    const taraOrgs = await w.db.select({ id: t.organizationMemberships.organizationId }).from(t.organizationMemberships).where(eq(t.organizationMemberships.userId, tara.id));
    expect(taraOrgs).toHaveLength(1);

    const later = plus(deletedAt, 31 * DAY);
    const dry = await purgeDeletedAccounts(later, { dryRun: true });
    expect(dry.purged).toEqual(expect.arrayContaining([gina.id, tara.id]));
    expect(await countRows(t.users, eq(t.users.id, gina.id))).toBe(1);

    const result = await purgeDeletedAccounts(later);
    expect(result.purged).toEqual(expect.arrayContaining([gina.id, tara.id, w.students.ada.id]));
    expect(result.blocked).toEqual([]);
    for (const [table, col] of [
      [t.users, t.users.id],
      [t.vaultNotes, t.vaultNotes.userId],
      [t.masteryEvidence, t.masteryEvidence.userId],
      [t.masteryStates, t.masteryStates.userId],
      [t.masterySnapshots, t.masterySnapshots.userId],
      [t.questionResponses, t.questionResponses.userId],
      [t.attempts, t.attempts.userId],
      [t.learningEvents, t.learningEvents.userId],
      [t.classEnrollments, t.classEnrollments.studentId],
    ] as const) {
      expect(await countRows(table, eq(col, gina.id))).toBe(0);
    }
    // The teacher's empty personal organisation (which carried her name) is gone too.
    expect(await countRows(t.organizations, eq(t.organizations.id, taraOrgs[0].id))).toBe(0);

    // Audit history survives but holds no name or email of the purged people.
    const audit = await w.db
      .select()
      .from(t.auditLogs)
      .where(or(eq(t.auditLogs.actorId, gina.id), eq(t.auditLogs.entityId, gina.id), eq(t.auditLogs.actorId, tara.id)));
    expect(audit.length).toBeGreaterThan(0);
    const dump = JSON.stringify(audit);
    for (const pii of [gina.email, gina.name, tara.email, tara.name, "Gina", "Tara"]) expect(dump).not.toContain(pii);
    expect(audit.some((a) => a.action === "account.purged")).toBe(true);

    // Other people's data is untouched.
    expect(await countRows(t.users, eq(t.users.id, w.students.ben.id))).toBe(1);
    expect(await countRows(t.classes, eq(t.classes.id, w.classes.northCalc.id))).toBe(1);

    const again = await purgeDeletedAccounts(plus(later, DAY));
    expect(again).toEqual({ eligible: 0, purged: [], blocked: [] });
  });
});

describe("retention", () => {
  it("dry run only counts; --apply deletes exactly those rows and never touches the learning record", async () => {
    const now = new Date();
    const old = plus(now, -800 * DAY);
    const dev = w.students.dev;

    // Old telemetry AND old evidence/responses/snapshots for Dev (practice done 800 days ago).
    const practice = await startAttempt(dev.id, { kind: "practice", skillId: calc("power-rule"), count: 2 }, old);
    for (const item of (await attemptRow(practice.attemptId)).items) await answerCorrectly(practice.attemptId, item.questionId, { now: plus(old, MINUTE) });
    await w.db.insert(t.learningSessions).values({ userId: dev.id, activityKind: "practice", courseId: "calculus-ab", startedAt: old, lastHeartbeatAt: old });
    // Expired session, old used reset token, old outbox mail.
    await w.db.insert(t.sessions).values({ tokenHash: "f".repeat(64), userId: dev.id, expiresAt: plus(now, -DAY) });
    await w.db.insert(t.passwordResetTokens).values({ userId: dev.id, tokenHash: "e".repeat(64), expiresAt: plus(now, -9 * DAY), usedAt: plus(now, -9 * DAY), createdAt: plus(now, -9 * DAY) });
    await w.db.insert(t.emailOutbox).values({ fromAddress: "a@b.test", to: dev.email, subject: "Old", text: "old", createdAt: plus(now, -45 * DAY) });
    // A recent reset token must survive.
    const recentToken = await requestToken(dev.email);

    const eventsCutoff = plus(now, -730 * DAY);
    const expected = {
      expiredSessions: await countRows(t.sessions, lt(t.sessions.expiresAt, now)),
      resetTokens: await countRows(
        t.passwordResetTokens,
        or(and(isNotNull(t.passwordResetTokens.usedAt), lt(t.passwordResetTokens.usedAt, plus(now, -7 * DAY))), lt(t.passwordResetTokens.expiresAt, plus(now, -7 * DAY))),
      ),
      emailOutbox: await countRows(t.emailOutbox, lt(t.emailOutbox.createdAt, plus(now, -30 * DAY))),
      learningEvents: await countRows(t.learningEvents, lt(t.learningEvents.occurredAt, eventsCutoff)),
      learningSessions: await countRows(t.learningSessions, lt(t.learningSessions.lastHeartbeatAt, eventsCutoff)),
    };
    expect(expected.learningEvents).toBeGreaterThan(0);
    expect(Object.values(expected).every((n) => n >= 1)).toBe(true);

    const record = async () => ({
      evidence: await countRows(t.masteryEvidence),
      responses: await countRows(t.questionResponses),
      snapshots: await countRows(t.masterySnapshots),
      states: await countRows(t.masteryStates),
      attempts: await countRows(t.attempts),
      notes: await countRows(t.vaultNotes),
      devOldEvidence: await countRows(t.masteryEvidence, and(eq(t.masteryEvidence.userId, dev.id), lt(t.masteryEvidence.occurredAt, eventsCutoff))),
    });
    const before = await record();
    expect(before.devOldEvidence).toBeGreaterThan(0);
    const eventsBefore = await countRows(t.learningEvents);

    const dry = await runRetention({ now });
    expect(dry.mode).toBe("dry-run");
    expect(dry.counts).toMatchObject(expected);
    expect(await countRows(t.learningEvents)).toBe(eventsBefore);

    const applied = await runRetention({ now, apply: true });
    expect(applied.mode).toBe("apply");
    expect(applied.counts).toMatchObject(expected);
    expect(await countRows(t.learningEvents)).toBe(eventsBefore - expected.learningEvents);
    expect(await countRows(t.sessions, lt(t.sessions.expiresAt, now))).toBe(0);
    expect(await countRows(t.emailOutbox, lt(t.emailOutbox.createdAt, plus(now, -30 * DAY)))).toBe(0);
    expect(await isResetTokenUsable(recentToken)).toBe(true);

    // The student's learning record is identical.
    expect(await record()).toEqual(before);
    expect(await countRows(t.auditLogs, eq(t.auditLogs.action, "retention.applied"))).toBe(1);

    // Running again finds nothing more.
    const second = await runRetention({ now, apply: true });
    expect(second.counts).toMatchObject({ expiredSessions: 0, resetTokens: 0, emailOutbox: 0, learningEvents: 0, learningSessions: 0, purgedAccounts: 0 });
  });

  it("ignores an unsafe events window", async () => {
    vi.stubEnv("RETENTION_EVENTS_DAYS", "0");
    const report = await runRetention({ now: new Date() });
    expect(report.cutoffs.eventsRetentionDays).toBe(730);
  });
});
