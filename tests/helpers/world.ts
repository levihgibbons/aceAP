/**
 * Reusable integration-test world.
 *
 * `bootWorld()` publishes the authored content into the (per-file, in-memory)
 * database and builds two fictional schools, their teachers, students,
 * classes and enrolments through the real services. Answers are built from
 * the stored answer key (read with the trusted role) and submitted through the
 * assessment service, so every test exercises the production path.
 */
import { and, eq, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { getDb, type Db } from "@/db/client";
import * as t from "@/db/schema";
import type { QuestionResponse } from "@/modules/assessments/grading";
import { saveDraftAnswer, submitResponse, type SubmitResult } from "@/modules/assessments/service";
import { createUser, type SessionUser } from "@/modules/auth/service";
import { createClass, joinClassByCode } from "@/modules/classrooms/service";
import { syncContent } from "@/modules/content/sync";
import { ensureDefaultPolicy } from "@/modules/mastery/service";
import { resetRateLimit } from "@/lib/rate-limit";
import { correctResponseFor, loadQuestionBank, wrongResponseFor, type BankQuestion } from "../../scripts/seed";

export const TEST_PASSWORD = "test-password-2026";

// ─────────────────────────────── time helpers ───────────────────────────────

export const SECOND = 1_000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** A fixed reference instant so tests never depend on the wall clock. */
export const T0 = new Date("2026-03-02T15:00:00.000Z");

export const plus = (d: Date, ms: number) => new Date(d.getTime() + ms);
export const daysAfter = (d: Date, days: number) => plus(d, days * DAY);

/** A controllable clock: `tick()` moves it forward and returns the new time. */
export function clock(start: Date = T0) {
  let current = start;
  return {
    now: () => current,
    tick(ms: number = MINUTE) {
      current = plus(current, ms);
      return current;
    },
    set(d: Date) {
      current = d;
      return current;
    },
  };
}

// ─────────────────────────────────── world ──────────────────────────────────

export interface World {
  db: Db;
  orgs: { northfield: typeof t.organizations.$inferSelect; lakeview: typeof t.organizations.$inferSelect };
  admin: SessionUser;
  teachers: { northfield: SessionUser; lakeview: SessionUser };
  /** ada, ben, dev: Northfield calculus · cleo: Northfield calculus + physics · quinn: Lakeview calculus. */
  students: { ada: SessionUser; ben: SessionUser; cleo: SessionUser; dev: SessionUser; quinn: SessionUser };
  classes: { northCalc: typeof t.classes.$inferSelect; northPhysics: typeof t.classes.$inferSelect; lakeCalc: typeof t.classes.$inferSelect };
}

async function person(name: string, email: string, role: t.UserRole): Promise<SessionUser> {
  return createUser({ name, email, password: TEST_PASSWORD, role });
}

export async function bootWorld(): Promise<World> {
  const db = await getDb();
  resetRateLimit();
  const report = await syncContent(db);
  if (!report.pilotCourses.includes("calculus-ab")) throw new Error("calculus-ab content failed to publish");
  await ensureDefaultPolicy(db);

  // There is no organisation-management service yet; organisations and staff memberships are inserted directly.
  const [northfield] = await db.insert(t.organizations).values({ name: "Northfield Test School", slug: "northfield-test" }).returning();
  const [lakeview] = await db.insert(t.organizations).values({ name: "Lakeview Test School", slug: "lakeview-test" }).returning();

  const admin = await person("Platform Admin", "admin@world.test", "platform_admin");
  const northTeacher = await person("Nora North", "nora@world.test", "teacher");
  const lakeTeacher = await person("Leo Lake", "leo@world.test", "teacher");
  await db.insert(t.organizationMemberships).values([
    { organizationId: northfield.id, userId: northTeacher.id, role: "teacher" },
    { organizationId: lakeview.id, userId: lakeTeacher.id, role: "teacher" },
  ]);

  const students = {
    ada: await person("Ada Park", "ada@world.test", "student"),
    ben: await person("Ben Cole", "ben@world.test", "student"),
    cleo: await person("Cleo Diaz", "cleo@world.test", "student"),
    dev: await person("Dev Rao", "dev@world.test", "student"),
    quinn: await person("Quinn Ito", "quinn@world.test", "student"),
  };
  await db.insert(t.organizationMemberships).values([
    ...[students.ada, students.ben, students.cleo, students.dev].map((s) => ({ organizationId: northfield.id, userId: s.id, role: "student" as const })),
    { organizationId: lakeview.id, userId: students.quinn.id, role: "student" as const },
  ]);

  const northCalc = await createClass(northTeacher, { name: "Calculus AB (test)", courseId: "calculus-ab", organizationId: northfield.id });
  const northPhysics = await createClass(northTeacher, { name: "Physics 1 (test)", courseId: "physics-1", organizationId: northfield.id });
  const lakeCalc = await createClass(lakeTeacher, { name: "Lakeview Calculus (test)", courseId: "calculus-ab", organizationId: lakeview.id });

  for (const s of [students.ada, students.ben, students.cleo, students.dev]) await joinClassByCode(s, northCalc.joinCode);
  await joinClassByCode(students.cleo, northPhysics.joinCode);
  await joinClassByCode(students.quinn, lakeCalc.joinCode);

  return {
    db,
    orgs: { northfield, lakeview },
    admin,
    teachers: { northfield: northTeacher, lakeview: lakeTeacher },
    students,
    classes: { northCalc, northPhysics, lakeCalc },
  };
}

// ───────────────────────────────── answering ────────────────────────────────

let bankCache: Promise<Map<string, BankQuestion>> | null = null;

/** Published questions with their answer keys (trusted role). */
export async function questionBank(): Promise<Map<string, BankQuestion>> {
  bankCache ??= getDb().then((db) => loadQuestionBank(db));
  return bankCache;
}

export async function question(questionId: string): Promise<BankQuestion> {
  const q = (await questionBank()).get(questionId);
  if (!q) throw new Error(`Unknown question ${questionId}`);
  return q;
}

export async function attemptRow(attemptId: string) {
  const db = await getDb();
  const [a] = await db.select().from(t.attempts).where(eq(t.attempts.id, attemptId));
  if (!a) throw new Error(`Attempt ${attemptId} not found`);
  return a;
}

export type AnswerOutcome = SubmitResult | { status: "draft_saved" };

let answerSeq = 0;

export interface AnswerOptions {
  now?: Date;
  idempotencyKey?: string;
}

async function send(attemptId: string, questionId: string, response: QuestionResponse, opts: AnswerOptions): Promise<AnswerOutcome> {
  const attempt = await attemptRow(attemptId);
  const now = opts.now ?? new Date();
  if (attempt.feedback === "after_submit") {
    const r = await saveDraftAnswer(attempt.userId, { attemptId, questionId, response }, now);
    if (!r.saved) throw new Error(`Draft rejected: ${r.message}`);
    return { status: "draft_saved" };
  }
  return submitResponse(attempt.userId, { attemptId, questionId, response, idempotencyKey: opts.idempotencyKey ?? `test:${attemptId}:${questionId}:${++answerSeq}` }, now);
}

/**
 * Answer with the key. Immediate-feedback attempts are graded now; deferred
 * (quiz/test) attempts get a saved draft that is graded on submit.
 */
export async function answerCorrectly(attemptId: string, questionId: string, opts: AnswerOptions = {}): Promise<AnswerOutcome> {
  const q = await question(questionId);
  return send(attemptId, questionId, correctResponseFor(q.body), opts);
}

/** Answer wrongly — with an authored common error / tagged distractor when one exists (optionally a preferred misconception). */
export async function answerIncorrectly(attemptId: string, questionId: string, opts: AnswerOptions & { prefer?: string } = {}): Promise<AnswerOutcome & { expectedMisconception: string | null }> {
  const q = await question(questionId);
  const wrong = wrongResponseFor(questionId, q.body, opts.prefer);
  const outcome = await send(attemptId, questionId, wrong.response, opts);
  return { ...outcome, expectedMisconception: wrong.misconceptionId };
}

// ───────────────────────────────── queries ──────────────────────────────────

export async function countRows(table: PgTable, where?: SQL): Promise<number> {
  const db = await getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(table).where(where);
  return n;
}

export async function evidenceOf(userId: string, skillId?: string) {
  const db = await getDb();
  return db
    .select()
    .from(t.masteryEvidence)
    .where(and(eq(t.masteryEvidence.userId, userId), skillId ? eq(t.masteryEvidence.skillId, skillId) : undefined));
}

export async function stateOf(userId: string, skillId: string) {
  const db = await getDb();
  const [s] = await db.select().from(t.masteryStates).where(and(eq(t.masteryStates.userId, userId), eq(t.masteryStates.skillId, skillId)));
  return s ?? null;
}

/** Error text including a driver error wrapped by Drizzle (`cause`). */
export function errorText(e: unknown): string {
  const parts: string[] = [];
  let cur: unknown = e;
  for (let i = 0; cur && i < 4; i++) {
    parts.push(cur instanceof Error ? cur.message : String(cur));
    cur = (cur as { cause?: unknown }).cause;
  }
  return parts.join(" | ");
}

/** Resolve to the error text of a promise that must reject. */
export async function rejection(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return errorText(e);
  }
  throw new Error("Expected the operation to be rejected, but it succeeded.");
}

export const calc = (id: string) => `calculus-ab.${id}`;
export const calcQ = (id: string) => `calculus-ab.q.${id}`;
