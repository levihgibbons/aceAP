/**
 * `npm run db:seed`  — build the fictional demo world (idempotent).
 * `npm run db:reset` — wipe the database first (`--reset`), then seed.
 *
 * Every number a dashboard shows is produced by the real domain services:
 * accounts via createUser, classes via createClass / joinClassByCode, learning
 * via the lesson-progress and assessment services (so responses are graded,
 * evidence is written, mastery is recalculated and misconceptions are
 * detected exactly as in production), and active time via heartbeats that go
 * through the same clamping as the browser tracker. Nothing is hard-coded.
 *
 * The history is deterministic in shape: fixed day offsets relative to "today"
 * and a seeded PRNG decide what each student does and whether they get it right.
 *
 * ALL people and organisations below are fictional.
 */
import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { and, asc, eq, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { closeDatabase, getDb, migrateDatabase, type Db } from "@/db/client";
import * as t from "@/db/schema";
import { ActiveTimeMeter, DEFAULT_IDLE_THRESHOLD_MS, formatDuration } from "@/modules/analytics/activeTime";
import { recordHeartbeat, startLearningSession } from "@/modules/analytics/service";
import { gradeResponse, type QuestionResponse } from "@/modules/assessments/grading";
import { hashString, mulberry32 } from "@/modules/assessments/math";
import { revealHint, revealSolution, saveDraftAnswer, startAttempt, submitAttempt, submitResponse, type StartSpec } from "@/modules/assessments/service";
import { createUser, type SessionUser } from "@/modules/auth/service";
import { createAssignment, createClass, joinClassByCode, setAccommodation, setClassAiPolicy } from "@/modules/classrooms/service";
import type { QuestionBody } from "@/modules/content/schema";
import { syncContent } from "@/modules/content/sync";
import { logEvent } from "@/modules/learning/events";
import { completeLesson, saveLessonPosition, startLesson } from "@/modules/learning/progress";
import { ensureDefaultPolicy } from "@/modules/mastery/service";
import { MASTERY_LEVELS, type MasteryLevel } from "@/modules/mastery/types";

/** Password for every seeded demo account. Shown on the login page; never use it for a real account. */
export const DEMO_PASSWORD = "demo-password-2026";

export interface DemoAccount {
  key: string;
  email: string;
  name: string;
  role: t.UserRole;
  org: "northfield" | "lakeview" | null;
  blurb: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { key: "teacher", email: "teacher@demo.aceap.test", name: "Jordan Rivera", role: "teacher", org: "northfield", blurb: "Teacher, Northfield High School (demo)" },
  { key: "teacher2", email: "teacher2@demo.aceap.test", name: "Dana Whitfield", role: "teacher", org: "lakeview", blurb: "Teacher, Lakeview Academy (demo)" },
  { key: "admin", email: "admin@demo.aceap.test", name: "Morgan Admin", role: "platform_admin", org: null, blurb: "Platform administrator" },
  { key: "alex", email: "student@demo.aceap.test", name: "Alex Morgan", role: "student", org: "northfield", blurb: "Guided-demo student — no chain-rule evidence yet" },
  { key: "avery", email: "avery@demo.aceap.test", name: "Avery Brooks", role: "student", org: "northfield", blurb: "Highly proficient" },
  { key: "sam", email: "sam@demo.aceap.test", name: "Sam Patel", role: "student", org: "northfield", blurb: "Mixed: strong polynomial chain rule, weak trig/exponential" },
  { key: "riley", email: "riley@demo.aceap.test", name: "Riley Nguyen", role: "student", org: "northfield", blurb: "Struggles with prerequisites; misconceptions detected" },
  { key: "jamie", email: "jamie@demo.aceap.test", name: "Jamie Ortiz", role: "student", org: "northfield", blurb: "Very little evidence" },
  { key: "taylor", email: "taylor@demo.aceap.test", name: "Taylor Kim", role: "student", org: "northfield", blurb: "Improved after targeted remediation" },
  { key: "priya", email: "priya@demo.aceap.test", name: "Priya Shah", role: "student", org: "northfield", blurb: "Extra classmate (steady)" },
  { key: "diego", email: "diego@demo.aceap.test", name: "Diego Alvarez", role: "student", org: "northfield", blurb: "Extra classmate (patchy)" },
  { key: "hannah", email: "hannah@demo.aceap.test", name: "Hannah Becker", role: "student", org: "northfield", blurb: "Extra classmate (one late quiz submission)" },
  { key: "casey", email: "indie@demo.aceap.test", name: "Casey Fox", role: "student", org: null, blurb: "Independent learner (Physics 1 + Calculus AB), no class" },
  { key: "quinn", email: "lakeview.student@demo.aceap.test", name: "Quinn Harper", role: "student", org: "lakeview", blurb: "Lakeview student (tenant-isolation checks)" },
];

// ═══════════════════════════ answer construction ════════════════════════════

export interface BankQuestion {
  id: string;
  version: number;
  courseId: string;
  skillId: string;
  pattern: string;
  difficulty: number;
  estSeconds: number;
  body: QuestionBody;
  hints: string[];
}

/** Published question versions (answer keys included) — trusted role only. */
export async function loadQuestionBank(db: Db, courseId?: string): Promise<Map<string, BankQuestion>> {
  const rows = await db
    .select({
      id: t.questions.id,
      version: t.questionVersions.version,
      courseId: t.questions.courseId,
      skillId: t.questions.primarySkillId,
      pattern: t.questionVersions.pattern,
      difficulty: t.questionVersions.difficulty,
      estSeconds: t.questionVersions.estSeconds,
      body: t.questionVersions.body,
      hints: t.questionVersions.hints,
    })
    .from(t.questions)
    .innerJoin(t.questionVersions, and(eq(t.questionVersions.questionId, t.questions.id), eq(t.questionVersions.version, t.questions.publishedVersion)))
    .where(courseId ? eq(t.questions.courseId, courseId) : undefined);
  return new Map(rows.map((r) => [r.id, r]));
}

/** The answer key expressed as the response a student would send. */
export function correctResponseFor(body: QuestionBody): QuestionResponse {
  switch (body.type) {
    case "multiple_choice":
      return { type: "multiple_choice", choiceId: body.correctChoiceId };
    case "multi_select":
      return { type: "multi_select", choiceIds: [...body.correctChoiceIds] };
    case "numeric":
      return { type: "numeric", value: String(body.answer) };
    case "expression":
      return { type: "expression", value: body.answer };
    case "ordering":
      return { type: "ordering", order: [...body.correctOrder] };
    case "matching":
      return { type: "matching", pairs: { ...body.pairs } };
    case "short_response":
      return { type: "short_response", text: body.sampleResponse };
  }
}

const matchesPreference = (misconceptionId: string | undefined, prefer?: string) => Boolean(prefer && misconceptionId && (misconceptionId === prefer || misconceptionId.endsWith(`.${prefer}`)));

/**
 * A wrong answer for a question. Authored common errors / misconception-tagged
 * distractors come first (the preferred misconception, if given, before the
 * others) so the grader genuinely detects the misconception; generic wrong
 * answers are the fallback. Every candidate is checked with the real grader.
 */
export function wrongResponseFor(questionId: string, body: QuestionBody, prefer?: string): { response: QuestionResponse; misconceptionId: string | null } {
  const tagged: { response: QuestionResponse; tag?: string }[] = [];
  const generic: QuestionResponse[] = [];
  const order = <T extends { misconception?: string }>(xs: T[]) => [...xs.filter((x) => matchesPreference(x.misconception, prefer)), ...xs.filter((x) => x.misconception && !matchesPreference(x.misconception, prefer))];
  switch (body.type) {
    case "multiple_choice": {
      const wrong = body.choices.filter((c) => c.id !== body.correctChoiceId);
      for (const c of order(wrong)) tagged.push({ response: { type: "multiple_choice", choiceId: c.id }, tag: c.misconception });
      for (const c of wrong.filter((x) => !x.misconception)) generic.push({ type: "multiple_choice", choiceId: c.id });
      break;
    }
    case "multi_select": {
      const wrong = body.choices.filter((c) => !body.correctChoiceIds.includes(c.id));
      for (const c of order(wrong)) tagged.push({ response: { type: "multi_select", choiceIds: [...body.correctChoiceIds, c.id] }, tag: c.misconception });
      if (body.correctChoiceIds.length > 1) generic.push({ type: "multi_select", choiceIds: body.correctChoiceIds.slice(0, -1) });
      for (const c of wrong) generic.push({ type: "multi_select", choiceIds: [c.id] });
      break;
    }
    case "numeric": {
      for (const e of order(body.commonErrors ?? [])) tagged.push({ response: { type: "numeric", value: String(e.value) }, tag: e.misconception });
      const step = Math.max(1, (body.tolerance.abs ?? 0) * 10, Math.abs(body.answer) * Math.max(0.25, (body.tolerance.rel ?? 0) * 10));
      for (const v of [body.answer + step, body.answer - step, body.answer * 2 + 3, body.answer + 1000]) generic.push({ type: "numeric", value: String(Math.round(v * 1000) / 1000) });
      break;
    }
    case "expression": {
      for (const e of order(body.commonErrors ?? [])) tagged.push({ response: { type: "expression", value: e.expr }, tag: e.misconception });
      generic.push({ type: "expression", value: `(${body.answer})+1` }, { type: "expression", value: `2*(${body.answer})+1` });
      break;
    }
    case "ordering": {
      const o = [...body.correctOrder];
      [o[0], o[1]] = [o[1], o[0]];
      generic.push({ type: "ordering", order: o }, { type: "ordering", order: [...body.correctOrder].reverse() });
      break;
    }
    case "matching": {
      const lefts = body.left.map((l) => l.id);
      const rotated = Object.fromEntries(lefts.map((l, i) => [l, body.pairs[lefts[(i + 1) % lefts.length]]]));
      generic.push({ type: "matching", pairs: rotated });
      break;
    }
    case "short_response":
      break;
  }
  const candidates = prefer === "none" ? [...generic, ...tagged.map((x) => x.response)] : [...tagged.map((x) => x.response), ...generic];
  for (const response of candidates) {
    const g = gradeResponse(questionId, body, response);
    if (g.status === "graded" && !g.correct) return { response, misconceptionId: g.misconceptionId };
  }
  throw new Error(`No automatically gradable wrong answer for ${questionId}`);
}

// ═════════════════════════════ simulation kit ═══════════════════════════════

export interface Plan {
  /** Answer correctly (true) or with a wrong answer (false). */
  correct: boolean;
  /** Misconception id (or its suffix, e.g. "omit-inner") to prefer when wrong; "none" = a wrong answer matching no authored error, when one exists. */
  prefer?: string;
  /** Authored hints revealed BEFORE answering. */
  hints?: number;
  /** Worked solution viewed BEFORE answering (guided modes only). */
  solution?: boolean;
  /** After a wrong first try in an immediate-feedback mode, try again. */
  retry?: "correct" | "wrong_then_solution";
  /** Leave the item unanswered. */
  skip?: boolean;
}
export type Planner = (q: BankQuestion, index: number) => Plan;

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const plus = (d: Date, ms: number) => new Date(d.getTime() + ms);

interface Span {
  start: Date;
  end: Date;
}

const short = (skillId: string) => skillId.slice(skillId.indexOf(".") + 1);

export const allCorrect: Planner = () => ({ correct: true });
/** Plans by position (the last plan repeats). */
export const seq =
  (...plans: Plan[]): Planner =>
  (_q, i) =>
    plans[Math.min(i, plans.length - 1)];
/** Plans keyed by short skill id ("chain-trig") with a fallback. */
export const bySkill =
  (map: Record<string, Planner>, fallback: Planner): Planner =>
  (q, i) =>
    (map[short(q.skillId)] ?? fallback)(q, i);
/** Correct with probability p (seeded); otherwise `miss`. */
export const chance =
  (rand: () => number, p: number, miss: Partial<Plan> = {}): Planner =>
  () =>
    rand() < p ? { correct: true } : { correct: false, ...miss };

export class DemoSimulator {
  readonly counts = { lessons: 0, attempts: 0, answers: 0, heartbeats: 0, sessions: 0 };

  constructor(
    private readonly db: Db,
    private readonly bank: Map<string, BankQuestion>,
  ) {}

  private rng(key: string) {
    return mulberry32(hashString(key));
  }

  private question(id: string): BankQuestion {
    const q = this.bank.get(id);
    if (!q) throw new Error(`Question ${id} is not in the bank`);
    return q;
  }

  private async attemptRow(attemptId: string) {
    const [a] = await this.db.select().from(t.attempts).where(eq(t.attempts.id, attemptId));
    if (!a) throw new Error(`Attempt ${attemptId} missing`);
    return a;
  }

  private thinkMs(q: BankQuestion, key: string) {
    const r = this.rng(key)();
    return Math.round(q.estSeconds * 1000 * (0.6 + r * 0.9));
  }

  /** Answer one item in an immediate-feedback attempt; returns the new clock. */
  private async answerNow(userId: string, attemptId: string, q: BankQuestion, plan: Plan, now: Date, allowAssistance: boolean): Promise<Date> {
    if (plan.skip) return now;
    let clock = now;
    if (allowAssistance)
      for (let h = 0; h < (plan.hints ?? 0); h++) {
        await revealHint(userId, attemptId, q.id, clock);
        clock = plus(clock, 20_000);
      }
    if (allowAssistance && plan.solution) {
      await revealSolution(userId, attemptId, q.id, clock);
      clock = plus(clock, 45_000);
    }
    clock = plus(clock, this.thinkMs(q, `${attemptId}:${q.id}`));
    const send = async (response: QuestionResponse, n: number) => {
      const r = await submitResponse(userId, { attemptId, questionId: q.id, response, idempotencyKey: `seed:${attemptId}:${q.id}:${n}`, timeSpentMs: 45_000 }, clock);
      if (r.status === "invalid") throw new Error(`Seed answer rejected for ${q.id}: ${r.message}`);
      this.counts.answers += 1;
    };
    if (plan.correct) {
      await send(correctResponseFor(q.body), 1);
      return clock;
    }
    await send(wrongResponseFor(q.id, q.body, plan.prefer).response, 1);
    if (plan.retry === "correct") {
      clock = plus(clock, 40_000);
      await send(correctResponseFor(q.body), 2);
    } else if (plan.retry === "wrong_then_solution") {
      clock = plus(clock, 40_000);
      await send(wrongResponseFor(q.id, q.body, plan.prefer).response, 2);
      if (allowAssistance) {
        clock = plus(clock, 20_000);
        await revealSolution(userId, attemptId, q.id, clock);
      }
      clock = plus(clock, 60_000);
      await send(correctResponseFor(q.body), 3);
    }
    return clock;
  }

  /** Active-time tracking for one activity, with optional idle stretches (excluded from active time). */
  async track(userId: string, kind: t.ActivityKind, courseId: string | null, activityId: string | null, span: Span, idle: Span[] = []): Promise<void> {
    const start = span.start.getTime() - 30_000;
    const end = span.end.getTime() + 45_000;
    const sessionId = await startLearningSession(userId, { activityKind: kind, courseId, activityId }, new Date(start));
    this.counts.sessions += 1;
    const meter = new ActiveTimeMeter(DEFAULT_IDLE_THRESHOLD_MS, start);
    const rand = this.rng(`${userId}:${kind}:${activityId}:${start}`);
    let nextInteraction = start + 3_000 + rand() * 15_000;
    let lastBeat = start;
    const beat = async (at: number) => {
      const d = meter.drain();
      if (d.openMs === 0 && d.activeMs === 0) return;
      await recordHeartbeat(userId, { sessionId, ...d }, new Date(at));
      this.counts.heartbeats += 1;
      lastBeat = at;
    };
    for (let ms = start + 1_000; ms <= end; ms += 1_000) {
      const paused = idle.some((p) => ms >= p.start.getTime() && ms < p.end.getTime());
      if (!paused && ms >= nextInteraction) {
        meter.interaction(ms);
        // Mostly steady interaction, with the occasional long think/read (> idle threshold) that is not counted as active.
        nextInteraction = ms + (rand() < 0.12 ? 70_000 + rand() * 80_000 : 4_000 + rand() * 26_000);
      } else meter.tick(ms);
      if (ms - lastBeat >= 60_000) await beat(ms);
    }
    await beat(end);
  }

  /** Open a lesson, work through its embedded checks, optionally finish it. */
  async lesson(user: SessionUser, lessonId: string, start: Date, plan: Planner, opts: { complete?: boolean; maxChecks?: number; idleMinutes?: number } = {}): Promise<Date> {
    const complete = opts.complete ?? true;
    let clock = start;
    await startLesson(user.id, lessonId, clock);
    this.counts.lessons += 1;
    const [lesson] = await this.db.select().from(t.lessons).where(eq(t.lessons.id, lessonId));
    const [version] = await this.db
      .select({ blocks: t.lessonVersions.blocks })
      .from(t.lessonVersions)
      .where(and(eq(t.lessonVersions.lessonId, lessonId), eq(t.lessonVersions.version, lesson.publishedVersion ?? 1)));
    const blocks = version?.blocks ?? [];
    const { attemptId } = await startAttempt(user.id, { kind: "lesson", lessonId }, plus(clock, 5_000));
    this.counts.attempts += 1;
    const attempt = await this.attemptRow(attemptId);
    const idle: Span[] = [];
    const checks = attempt.items.slice(0, opts.maxChecks ?? attempt.items.length);
    for (const [i, item] of checks.entries()) {
      clock = plus(clock, 2 * MIN + Math.round(this.rng(`${attemptId}:${i}:read`)() * 2 * MIN));
      const blockIndex = blocks.findIndex((b) => b.type === "check" && b.questionId === item.questionId);
      if (blockIndex >= 0) await saveLessonPosition(user.id, lessonId, blockIndex, clock);
      if (opts.idleMinutes && i === 1) {
        // Stepped away from the screen with the lesson open — open time, not active time.
        idle.push({ start: clock, end: plus(clock, opts.idleMinutes * MIN) });
        clock = plus(clock, opts.idleMinutes * MIN);
      }
      clock = await this.answerNow(user.id, attemptId, this.question(item.questionId), plan(this.question(item.questionId), i), clock, true);
    }
    clock = plus(clock, 2 * MIN);
    if (complete) {
      await saveLessonPosition(user.id, lessonId, Math.max(0, blocks.length - 1), clock);
      await completeLesson(user.id, lessonId, clock);
      await submitAttempt(user.id, attemptId, clock);
    }
    await this.track(user.id, "lesson", lesson.courseId, lessonId, { start, end: clock }, idle);
    return plus(clock, 2 * MIN);
  }

  /** Guided practice (or a skill-practice assignment): immediate feedback, hints allowed. */
  async practice(user: SessionUser, spec: Extract<StartSpec, { kind: "practice" } | { kind: "assignment" }>, start: Date, plan: Planner, opts: { idleMinutes?: number } = {}): Promise<Date> {
    const { attemptId } = await startAttempt(user.id, spec, start);
    this.counts.attempts += 1;
    const attempt = await this.attemptRow(attemptId);
    let clock = plus(start, 15_000);
    const idle: Span[] = [];
    for (const [i, item] of attempt.items.entries()) {
      if (opts.idleMinutes && i === 2) {
        idle.push({ start: clock, end: plus(clock, opts.idleMinutes * MIN) });
        clock = plus(clock, opts.idleMinutes * MIN);
      }
      const q = this.question(item.questionId);
      clock = await this.answerNow(user.id, attemptId, q, plan(q, i), clock, attempt.assistance !== "disabled");
    }
    await submitAttempt(user.id, attemptId, clock);
    await this.track(user.id, "practice", attempt.courseId, attempt.skillId ?? attempt.assignmentId, { start, end: clock }, idle);
    return plus(clock, MIN);
  }

  /** Quiz / unit test / exam set (deferred feedback): drafts are saved, then graded on submit. */
  async assessment(user: SessionUser, spec: Extract<StartSpec, { kind: "assessment" } | { kind: "assignment" }>, start: Date, plan: Planner): Promise<Date> {
    const { attemptId } = await startAttempt(user.id, spec, start);
    this.counts.attempts += 1;
    const attempt = await this.attemptRow(attemptId);
    let clock = plus(start, 20_000);
    for (const [i, item] of attempt.items.entries()) {
      const q = this.question(item.questionId);
      const p = plan(q, i);
      clock = plus(clock, this.thinkMs(q, `${attemptId}:${q.id}`));
      if (p.skip) continue;
      const response = p.correct ? correctResponseFor(q.body) : wrongResponseFor(q.id, q.body, p.prefer).response;
      if (attempt.feedback === "after_submit") {
        const saved = await saveDraftAnswer(user.id, { attemptId, questionId: q.id, response }, clock);
        if (!saved.saved) throw new Error(`Draft rejected for ${q.id}: ${saved.message}`);
      } else {
        await submitResponse(user.id, { attemptId, questionId: q.id, response, idempotencyKey: `seed:${attemptId}:${q.id}:1` }, clock);
      }
      this.counts.answers += 1;
    }
    clock = plus(clock, 30_000);
    await submitAttempt(user.id, attemptId, clock);
    await this.track(user.id, "assessment", attempt.courseId, attempt.assessmentId, { start, end: clock });
    return plus(clock, MIN);
  }

  /** Mixed course review (one try per item, no hints). */
  async review(user: SessionUser, courseId: string, start: Date, plan: Planner, count = 6): Promise<Date> {
    const { attemptId } = await startAttempt(user.id, { kind: "review", courseId, count }, start);
    this.counts.attempts += 1;
    const attempt = await this.attemptRow(attemptId);
    let clock = plus(start, 15_000);
    for (const [i, item] of attempt.items.entries()) {
      const q = this.question(item.questionId);
      const p = plan(q, i);
      clock = await this.answerNow(user.id, attemptId, q, { correct: p.correct, prefer: p.prefer, skip: p.skip }, clock, false);
    }
    await submitAttempt(user.id, attemptId, clock);
    await this.track(user.id, "practice", courseId, `review:${courseId}`, { start, end: clock });
    return plus(clock, MIN);
  }

  /** Time spent exploring a simulation. Engagement only — never mastery evidence. */
  async exploreSimulation(user: SessionUser, courseId: string, simulationId: string, start: Date, minutes: number): Promise<Date> {
    const end = plus(start, minutes * MIN);
    for (let i = 0; i < 3; i++)
      await logEvent(this.db, { userId: user.id, type: "SIMULATION_INTERACTED", courseId, activityType: "simulation", activityId: simulationId, payload: { control: i === 0 ? "point" : "function" }, occurredAt: plus(start, (i + 1) * MIN) });
    await this.track(user.id, "simulation", courseId, simulationId, { start, end });
    return plus(end, MIN);
  }
}

// ═══════════════════════════════════ main ═══════════════════════════════════

const C = (id: string) => `calculus-ab.${id}`;
const CL = (id: string) => `calculus-ab.l.${id}`;

function log(msg: string) {
  console.log(msg);
}

function isInside(parent: string, child: string) {
  const rel = path.relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

async function truncateAll(db: Db) {
  const result = (await db.execute(sql`select tablename from pg_tables where schemaname = 'public'`)) as unknown as { rows: { tablename: string }[] };
  const tables = result.rows.map((r) => r.tablename).filter((n) => !n.startsWith("__drizzle"));
  if (tables.length === 0) return;
  log(`Truncating ${tables.length} tables (drizzle's migration journal is kept)…`);
  await db.execute(sql.raw(`TRUNCATE TABLE ${tables.map((n) => `"${n}"`).join(", ")} RESTART IDENTITY CASCADE`));
}

/** Handles --reset before the database is opened. Returns whether tables must be truncated after opening. */
function prepareReset(): { truncate: boolean } {
  const url = process.env.DATABASE_URL?.trim();
  const allow = process.env.ACEAP_ALLOW_RESET === "1";
  if (url) {
    if (!allow) {
      console.error("Refusing to reset: DATABASE_URL is set. Set ACEAP_ALLOW_RESET=1 to truncate every table in that database.");
      process.exit(1);
    }
    log("Reset: DATABASE_URL is set and ACEAP_ALLOW_RESET=1 — all application tables will be truncated.");
    return { truncate: true };
  }
  const dir = process.env.ACEAP_DATA_DIR?.trim() || ".data/pglite";
  if (dir === "memory") {
    log("Reset: in-memory database — nothing to delete.");
    return { truncate: false };
  }
  const projectDir = process.cwd();
  const abs = path.resolve(projectDir, dir);
  if (!fs.existsSync(path.join(projectDir, "package.json")) || !isInside(projectDir, abs)) {
    if (!allow) {
      console.error(`Refusing to reset: ${abs} is not inside the project directory (${projectDir}). Set ACEAP_ALLOW_RESET=1 to truncate its tables instead.`);
      process.exit(1);
    }
    log(`Reset: ${abs} is outside the project — its tables will be truncated instead of deleting the directory.`);
    return { truncate: true };
  }
  if (fs.existsSync(abs)) {
    log(`Reset: deleting embedded database directory ${path.relative(projectDir, abs) || abs}`);
    fs.rmSync(abs, { recursive: true, force: true });
  } else log(`Reset: ${path.relative(projectDir, abs)} does not exist yet — starting fresh.`);
  return { truncate: false };
}

async function main() {
  const reset = process.argv.includes("--reset");
  const { truncate } = reset ? prepareReset() : { truncate: false };
  const started = Date.now();

  if (process.env.DATABASE_URL?.trim()) {
    log("Applying migrations to DATABASE_URL…");
    await migrateDatabase();
  }
  const db = await getDb(); // the embedded database migrates itself on open
  if (truncate) await truncateAll(db);

  const [{ n: existing }] = await db.select({ n: sql<number>`count(*)::int` }).from(t.users).where(eq(t.users.isDemo, true));
  if (existing > 0) {
    log("Demo data already present — use npm run db:reset to rebuild");
    await closeDatabase();
    return;
  }

  log("Syncing content (AP catalog + pilot courses)…");
  const report = await syncContent(db);
  log(`  ${report.courses} catalog courses; pilot courses: ${report.pilotCourses.join(", ") || "none"}.`);
  for (const s of report.skipped) log(`  NOTE: ${s.courseId} failed validation and was skipped (${s.issues.length} issue(s)).`);
  await ensureDefaultPolicy(db);

  const pilot = new Set(report.pilotCourses);
  if (!pilot.has("calculus-ab")) throw new Error("The demo needs the AP Calculus AB pilot course; it was not published by content sync.");
  const hasPhysics = pilot.has("physics-1");
  const hasMicro = pilot.has("microeconomics");
  if (!hasPhysics) log("  NOTE: physics-1 content is not registered — skipping the Physics class and Physics activity.");
  if (!hasMicro) log("  NOTE: microeconomics content is not registered — skipping the Microeconomics class and activity.");

  const bank = await loadQuestionBank(db);
  const sim = new DemoSimulator(db, bank);

  // ── Time: fixed day offsets relative to today (UTC), always in the past ────
  const now = new Date();
  const today0 = new Date(now);
  today0.setUTCHours(0, 0, 0, 0);
  /** `daysAgo` ≥ 1 so every activity is in the past whatever the time of day. */
  const at = (daysAgo: number, hour: number, minute = 0) => new Date(today0.getTime() - daysAgo * DAY + hour * HOUR + minute * MIN);
  const rngFor = (key: string) => mulberry32(hashString(`aceap-demo:${key}`));

  // ── Organisations and people ───────────────────────────────────────────────
  log("Creating organisations and demo accounts…");
  const [northfield] = await db.insert(t.organizations).values({ name: "Northfield High School (demo)", slug: "northfield-demo" }).returning();
  const [lakeview] = await db.insert(t.organizations).values({ name: "Lakeview Academy (demo)", slug: "lakeview-demo" }).returning();
  const orgOf = { northfield, lakeview };
  const u: Record<string, SessionUser> = {};
  // On a public deployment the platform admin must not use the published demo
  // password: SEED_ADMIN_PASSWORD gives it a private password and makes it a
  // regular (non-demo) account, so one-click demo sign-in refuses it too.
  const adminPassword = process.env.SEED_ADMIN_PASSWORD?.trim();
  if (adminPassword !== undefined && adminPassword !== "" && adminPassword.length < 12) throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");
  for (const a of DEMO_ACCOUNTS) {
    const privateAdmin = a.role === "platform_admin" && Boolean(adminPassword);
    u[a.key] = await createUser({ name: a.name, email: a.email, password: privateAdmin ? adminPassword! : DEMO_PASSWORD, role: a.role, isDemo: !privateAdmin });
    if (a.org) await db.insert(t.organizationMemberships).values({ organizationId: orgOf[a.org].id, userId: u[a.key].id, role: a.role === "teacher" ? "teacher" : "student" });
  }

  // ── Classes (students join with the generated codes) ──────────────────────
  log("Creating classes…");
  const calc = await createClass(u.teacher, { name: "AP Calculus AB — Period 2", courseId: "calculus-ab", organizationId: northfield.id });
  await setClassAiPolicy(u.teacher, calc.id, "allowed");
  const physics = hasPhysics ? await createClass(u.teacher, { name: "AP Physics 1 — Period 4", courseId: "physics-1", organizationId: northfield.id }) : null;
  if (physics) await setClassAiPolicy(u.teacher, physics.id, "hints_only");
  const micro = hasMicro ? await createClass(u.teacher, { name: "AP Microeconomics — Period 6", courseId: "microeconomics", organizationId: northfield.id }) : null;
  if (micro) await setClassAiPolicy(u.teacher, micro.id, "hints_only");
  const lakeCalc = await createClass(u.teacher2, { name: "AP Calculus AB — Lakeview", courseId: "calculus-ab", organizationId: lakeview.id });

  const join = async (keys: string[], cls: typeof calc | null) => {
    if (!cls) return;
    for (const k of keys) await joinClassByCode(u[k], cls.joinCode);
  };
  await join(["alex", "avery", "sam", "riley", "jamie", "taylor", "priya", "diego", "hannah"], calc);
  await join(["avery", "sam", "riley", "taylor"], physics);
  await join(["avery", "sam", "jamie", "priya"], micro);
  await join(["quinn"], lakeCalc);

  // ── Assignments (created before the history so completions/submissions attach) ─
  log("Creating assignments…");
  await createAssignment(u.teacher, {
    classId: calc.id,
    title: "Read: Composite functions — inside and outside",
    instructions: "Work through the lesson and its checks before we start the chain rule.",
    kind: "lesson",
    lessonId: CL("composite"),
    dueAt: at(10, 23, 59),
    gradingMethod: "completion",
  });
  const quizAssignment = await createAssignment(u.teacher, {
    classId: calc.id,
    title: "Chain rule quiz",
    instructions: "Six questions, no hints. Feedback appears after you submit.",
    kind: "assessment",
    assessmentId: "calculus-ab.quiz.chain",
    dueAt: new Date(today0.getTime() + 3 * DAY + 23 * HOUR + 59 * MIN),
    aiPolicy: "disabled",
    feedback: "after_submit",
  });
  const targetedPractice = await createAssignment(u.teacher, {
    classId: calc.id,
    title: "Targeted practice: chain rule with powers",
    instructions: "Short practice set on powers of functions. Remember the derivative of the inside!",
    kind: "skill_practice",
    skillIds: [C("chain-polynomial")],
    questionCount: 6,
    gradingMethod: "mastery",
    aiPolicy: "hints_only",
    dueAt: new Date(today0.getTime() + 5 * DAY + 23 * HOUR),
    studentIds: [u.riley.id, u.taylor.id],
  });
  const unitTestAssignment = await createAssignment(u.teacher, {
    classId: calc.id,
    title: "Unit 3 test: the chain rule",
    instructions: "25 minutes, no hints.",
    kind: "assessment",
    assessmentId: "calculus-ab.test.u3-chain",
    dueAt: new Date(today0.getTime() + 8 * DAY + 23 * HOUR),
    maxAttempts: 1,
    aiPolicy: "disabled",
  });
  await setAccommodation(u.teacher, { assignmentId: unitTestAssignment.id, studentId: u.riley.id, timeMultiplier: 1.5, note: "Extended time (1.5×) per accommodation plan." });
  // An individual deadline (away on a school trip) — Hannah submits after it, so her quiz shows as late.
  await setAccommodation(u.teacher, { assignmentId: quizAssignment.id, studentId: u.hannah.id, dueAt: at(2, 23, 59), note: "Personal deadline moved earlier: away on the exchange trip." });

  let physicsAssignment: typeof quizAssignment | null = null;
  const physicsQuizId = hasPhysics
    ? (await db.select({ id: t.assessments.id }).from(t.assessments).where(and(eq(t.assessments.courseId, "physics-1"), eq(t.assessments.kind, "skill_quiz"))).orderBy(asc(t.assessments.id)).limit(1))[0]?.id
    : undefined;
  if (physics && physicsQuizId)
    physicsAssignment = await createAssignment(u.teacher, {
      classId: physics.id,
      title: "Motion basics quiz",
      instructions: "Position, displacement and velocity. No hints.",
      kind: "assessment",
      assessmentId: physicsQuizId,
      dueAt: at(2, 23, 59),
      aiPolicy: "disabled",
    });

  // Generic course outline helpers (used for Physics / Microeconomics so ids aren't hard-coded).
  const outline = async (courseId: string) => {
    const lessons = await db
      .select({ id: t.lessons.id })
      .from(t.lessons)
      .innerJoin(t.units, eq(t.units.id, t.lessons.unitId))
      .innerJoin(t.topics, eq(t.topics.id, t.lessons.topicId))
      .where(eq(t.lessons.courseId, courseId))
      .orderBy(asc(t.units.number), asc(t.topics.ordinal), asc(t.lessons.ordinal));
    const skills = await db.select({ id: t.skills.id }).from(t.skills).where(eq(t.skills.courseId, courseId)).orderBy(asc(t.skills.ordinal));
    return { lessons: lessons.map((l) => l.id), skills: skills.map((s) => s.id) };
  };
  /** A generic stretch of learning in a course: a few lessons + practice at a given accuracy. */
  const studyCourse = async (who: string, courseId: string, firstDay: number, p: number, nLessons: number, nSkills: number) => {
    const o = await outline(courseId);
    const rand = rngFor(`${who}:${courseId}`);
    let day = firstDay;
    for (const lessonId of o.lessons.slice(0, nLessons)) {
      await sim.lesson(u[who], lessonId, at(day, 15, Math.floor(rand() * 40)), chance(rand, p, { retry: "correct" }));
      day = Math.max(1, day - 2);
    }
    for (const skillId of o.skills.slice(0, nSkills)) {
      await sim.practice(u[who], { kind: "practice", skillId, count: 4 }, at(day, 18, Math.floor(rand() * 40)), chance(rand, p, { hints: rand() < 0.3 ? 1 : 0 }));
      day = Math.max(1, day - 1);
    }
  };

  log("Simulating three weeks of learning (through the real services)…");

  // ── Avery Brooks — highly proficient, many sittings across days ───────────
  {
    const me = u.avery;
    let c = await sim.lesson(me, CL("rules"), at(20, 15), allCorrect);
    c = await sim.practice(me, { kind: "practice", skillId: C("power-rule"), count: 5 }, c, allCorrect);
    await sim.practice(me, { kind: "practice", skillId: C("basic-derivatives"), count: 5 }, c, allCorrect);
    c = await sim.lesson(me, CL("composite"), at(18, 16), allCorrect);
    c = await sim.practice(me, { kind: "practice", skillId: C("composite-recognize"), count: 4 }, c, allCorrect);
    await sim.practice(me, { kind: "practice", skillId: C("inner-outer"), count: 5 }, c, allCorrect);
    c = await sim.lesson(me, CL("chain-rule"), at(16, 15, 30), allCorrect);
    c = await sim.exploreSimulation(me, "calculus-ab", "derivative-explorer", c, 6);
    await sim.practice(me, { kind: "practice", skillId: C("chain-polynomial"), count: 6 }, c, seq({ correct: true }, { correct: true, hints: 1 }, { correct: true }));
    await sim.assessment(me, { kind: "assessment", assessmentId: "calculus-ab.quiz.rules" }, at(15, 14, 10), allCorrect);
    c = await sim.lesson(me, CL("chain-functions"), at(13, 16), allCorrect);
    c = await sim.practice(me, { kind: "practice", skillId: C("chain-trig"), count: 5 }, c, seq({ correct: true }, { correct: true }, { correct: false, prefer: "trig-sign", retry: "correct" }, { correct: true }));
    c = await sim.practice(me, { kind: "practice", skillId: C("chain-exp"), count: 5 }, c, allCorrect);
    await sim.practice(me, { kind: "practice", skillId: C("chain-log"), count: 4 }, c, allCorrect);
    c = await sim.lesson(me, CL("chain-using"), at(11, 15), allCorrect);
    await sim.practice(me, { kind: "practice", skillId: C("chain-interpret"), count: 5 }, c, seq({ correct: true }, { correct: false, prefer: "outer-at-x" }, { correct: true }));
    await sim.practice(me, { kind: "practice", skillId: C("chain-trig"), count: 4 }, at(8, 19), allCorrect);
    await sim.assessment(me, { kind: "assignment", assignmentId: quizAssignment.id }, at(6, 14, 20), allCorrect);
    await sim.assessment(me, { kind: "assignment", assignmentId: unitTestAssignment.id }, at(4, 14, 5), (q) => ({ correct: q.id !== "calculus-ab.q.ci-5", prefer: "outer-at-x" }));
    await sim.assessment(me, { kind: "assessment", assessmentId: "calculus-ab.exam.set-1" }, at(3, 18), (q) => ({ correct: q.id !== "calculus-ab.q.cl-4", prefer: "inner-in-place" }));
    await sim.review(me, "calculus-ab", at(2, 19), allCorrect, 6);
  }

  // ── Sam Patel — strong on powers of polynomials, weak on trig/exponential ─
  {
    const me = u.sam;
    const rand = rngFor("sam");
    let c = await sim.lesson(me, CL("rules"), at(19, 15), seq({ correct: true }, { correct: false, prefer: "trig-sign", retry: "correct" }));
    c = await sim.practice(me, { kind: "practice", skillId: C("power-rule"), count: 4 }, c, seq({ correct: true }, { correct: true }, { correct: false, prefer: "power-rule-slip" }, { correct: true }));
    await sim.practice(me, { kind: "practice", skillId: C("basic-derivatives"), count: 4 }, c, seq({ correct: true }, { correct: false, prefer: "trig-sign" }, { correct: true }, { correct: true, hints: 1 }));
    c = await sim.lesson(me, CL("composite"), at(17, 16), allCorrect);
    await sim.practice(me, { kind: "practice", skillId: C("inner-outer"), count: 4 }, c, seq({ correct: true }, { correct: true }, { correct: false, prefer: "inner-outer-swap" }, { correct: true }));
    c = await sim.lesson(me, CL("chain-rule"), at(14, 15), allCorrect);
    await sim.practice(me, { kind: "practice", skillId: C("chain-polynomial"), count: 6 }, c, allCorrect);
    c = await sim.lesson(me, CL("chain-functions"), at(10, 16), seq({ correct: false, prefer: "omit-inner", retry: "correct" }, { correct: true, hints: 1 }, { correct: true }));
    c = await sim.practice(me, { kind: "practice", skillId: C("chain-trig"), count: 5 }, c, (_q, i) => (i % 2 === 0 ? { correct: true, hints: 2 } : { correct: false, prefer: "omit-inner" }));
    await sim.practice(me, { kind: "practice", skillId: C("chain-exp"), count: 5 }, c, (_q, i) => (i === 0 ? { correct: true, hints: 1 } : rand() < 0.35 ? { correct: true } : { correct: false, prefer: "power-rule-on-exponential", hints: i % 2 }), { idleMinutes: 4 });
    await sim.assessment(me, { kind: "assignment", assignmentId: quizAssignment.id }, at(5, 14, 40), bySkill({ "chain-trig": () => ({ correct: false, prefer: "omit-inner" }), "chain-exp": () => ({ correct: false, prefer: "power-rule-on-exponential" }) }, allCorrect));
    await sim.practice(me, { kind: "practice", skillId: C("chain-polynomial"), count: 4 }, at(2, 18, 30), allCorrect);
  }

  // ── Riley Nguyen — prerequisite gaps, repeated authored-error answers ─────
  {
    const me = u.riley;
    let c = await sim.lesson(me, CL("rules"), at(18, 15), seq({ correct: false, prefer: "power-rule-slip", retry: "correct" }, { correct: false, prefer: "trig-sign", retry: "wrong_then_solution" }));
    await sim.practice(me, { kind: "practice", skillId: C("basic-derivatives"), count: 5 }, c, seq({ correct: false, prefer: "trig-sign" }, { correct: true, hints: 1 }, { correct: false, prefer: "trig-sign" }, { correct: true }, { correct: false, prefer: "power-rule-on-exponential" }));
    c = await sim.lesson(me, CL("composite"), at(16, 16), seq({ correct: false, prefer: "product-vs-composite", retry: "correct" }, { correct: false, prefer: "inner-outer-swap", retry: "correct" }, { correct: false, prefer: "inner-outer-swap", retry: "correct" }), { idleMinutes: 6 });
    await sim.practice(me, { kind: "practice", skillId: C("inner-outer"), count: 4 }, c, seq({ correct: false, prefer: "inner-outer-swap" }, { correct: true, hints: 2 }, { correct: false, prefer: "inner-outer-swap" }, { correct: true }));
    c = await sim.lesson(me, CL("chain-rule"), at(12, 15), seq({ correct: false, prefer: "omit-inner", retry: "wrong_then_solution" }, { correct: false, prefer: "omit-inner", retry: "correct" }));
    await sim.practice(me, { kind: "assignment", assignmentId: targetedPractice.id }, at(9, 18), seq({ correct: true, hints: 1 }, { correct: false, prefer: "omit-inner" }, { correct: true, hints: 2 }, { correct: false, prefer: "inner-in-place" }, { correct: true }, { correct: true, hints: 1 }));
    await sim.practice(me, { kind: "practice", skillId: C("chain-trig"), count: 4 }, at(7, 18), seq({ correct: false, prefer: "omit-inner" }, { correct: true, hints: 1 }, { correct: false, prefer: "trig-sign" }, { correct: false, prefer: "omit-inner" }));
    if (physicsAssignment) await sim.assessment(me, { kind: "assignment", assignmentId: physicsAssignment.id }, at(1, 17), seq({ correct: true }, { correct: false }, { correct: false }, { correct: true }, { correct: false }, { correct: true }));
  }

  // ── Taylor Kim — misconception detected, targeted practice, improvement ────
  {
    const me = u.taylor;
    let c = await sim.lesson(me, CL("rules"), at(20, 16), allCorrect);
    await sim.practice(me, { kind: "practice", skillId: C("power-rule"), count: 4 }, c, allCorrect);
    await sim.lesson(me, CL("composite"), at(19, 15, 30), allCorrect);
    c = await sim.lesson(me, CL("chain-rule"), at(17, 15), seq({ correct: false, prefer: "omit-inner", retry: "correct" }, { correct: false, prefer: "omit-inner", retry: "correct" }));
    await sim.practice(me, { kind: "practice", skillId: C("chain-polynomial"), count: 4 }, c, seq({ correct: false, prefer: "omit-inner" }, { correct: true, hints: 1 }, { correct: true }));
    // Teacher-assigned targeted practice: hints at first, then independent correct answers.
    await sim.practice(me, { kind: "assignment", assignmentId: targetedPractice.id }, at(13, 18), seq({ correct: true, hints: 1 }, { correct: true, hints: 1 }, { correct: true }));
    await sim.practice(me, { kind: "practice", skillId: C("chain-polynomial"), count: 4 }, at(8, 18, 15), allCorrect);
    await sim.lesson(me, CL("chain-functions"), at(6, 16), allCorrect);
    await sim.practice(me, { kind: "practice", skillId: C("chain-polynomial"), count: 5 }, at(5, 18, 40), allCorrect);
    await sim.assessment(me, { kind: "assignment", assignmentId: quizAssignment.id }, at(3, 14, 30), bySkill({ "chain-interpret": () => ({ correct: false, prefer: "outer-at-x" }) }, allCorrect));
    await sim.assessment(me, { kind: "assignment", assignmentId: unitTestAssignment.id }, at(2, 14, 30), (q) => ({ correct: q.id !== "calculus-ab.q.ci-5", prefer: "none" }));
    await sim.review(me, "calculus-ab", at(1, 19), allCorrect, 5);
  }

  // ── Jamie Ortiz — one or two answers only (and a late lesson completion) ──
  await sim.lesson(u.jamie, CL("composite"), at(3, 20), allCorrect, { maxChecks: 2 });

  // ── Alex Morgan — the guided-demo student: rules only, NO chain-rule evidence
  {
    const c = await sim.lesson(u.alex, CL("rules"), at(6, 16), allCorrect);
    await sim.practice(u.alex, { kind: "practice", skillId: C("power-rule"), count: 3 }, c, allCorrect);
  }

  // ── Extra Northfield classmates (seeded accuracy) ───────────────────────────
  const classmate = async (key: string, p: number, startDay: number, quizDay: number | null) => {
    const me = u[key];
    const rand = rngFor(key);
    const plan = chance(rand, p, { retry: "correct", prefer: "omit-inner" });
    let c = await sim.lesson(me, CL("rules"), at(startDay, 15, 15), plan);
    await sim.practice(me, { kind: "practice", skillId: C("power-rule"), count: 4 }, c, chance(rand, p + 0.1));
    c = await sim.lesson(me, CL("composite"), at(startDay - 2, 16), plan);
    await sim.practice(me, { kind: "practice", skillId: C("inner-outer"), count: 4 }, c, chance(rand, p, { prefer: "inner-outer-swap" }));
    c = await sim.lesson(me, CL("chain-rule"), at(startDay - 5, 15, 45), plan);
    await sim.practice(me, { kind: "practice", skillId: C("chain-polynomial"), count: 5 }, c, chance(rand, p, { prefer: "omit-inner", hints: 0 }));
    if (quizDay) await sim.assessment(me, { kind: "assignment", assignmentId: quizAssignment.id }, at(quizDay, 14, 50), chance(rand, p, { prefer: "omit-inner" }));
  };
  await classmate("priya", 0.9, 19, 4);
  await classmate("diego", 0.45, 17, null);
  await classmate("hannah", 0.75, 18, 1);

  // ── Physics 1 class ─────────────────────────────────────────────────────────
  if (hasPhysics) {
    await studyCourse("avery", "physics-1", 12, 0.9, 2, 3);
    await studyCourse("sam", "physics-1", 11, 0.65, 2, 2);
    await studyCourse("taylor", "physics-1", 9, 0.6, 1, 1);
    if (physicsAssignment) {
      await sim.assessment(u.avery, { kind: "assignment", assignmentId: physicsAssignment.id }, at(5, 15), allCorrect);
      await sim.assessment(u.sam, { kind: "assignment", assignmentId: physicsAssignment.id }, at(4, 15, 30), seq({ correct: true }, { correct: false }, { correct: true }, { correct: true }, { correct: false }, { correct: true }));
    }
  }

  // ── Microeconomics class ────────────────────────────────────────────────────
  if (hasMicro) {
    await studyCourse("avery", "microeconomics", 9, 0.85, 1, 2);
    await studyCourse("sam", "microeconomics", 8, 0.6, 1, 2);
    await studyCourse("priya", "microeconomics", 7, 0.75, 2, 1);
  }

  // ── Casey Fox — independent learner (no class) ─────────────────────────────
  if (hasPhysics) {
    await studyCourse("casey", "physics-1", 14, 0.75, 2, 2);
    const quizId = physicsQuizId;
    if (quizId) await sim.assessment(u.casey, { kind: "assessment", assessmentId: quizId }, at(7, 20), chance(rngFor("casey:quiz"), 0.7));
  }
  {
    const c = await sim.lesson(u.casey, CL("rules"), at(10, 21), allCorrect);
    await sim.practice(u.casey, { kind: "practice", skillId: C("power-rule"), count: 4 }, c, seq({ correct: true }, { correct: false, prefer: "power-rule-slip" }, { correct: true }));
  }

  // ── Quinn Harper — Lakeview (other tenant) ─────────────────────────────────
  {
    const me = u.quinn;
    let c = await sim.lesson(me, CL("rules"), at(15, 15), allCorrect);
    c = await sim.practice(me, { kind: "practice", skillId: C("power-rule"), count: 4 }, c, allCorrect);
    await sim.practice(me, { kind: "practice", skillId: C("basic-derivatives"), count: 4 }, c, seq({ correct: true }, { correct: false, prefer: "trig-sign" }, { correct: true }));
    await sim.lesson(me, CL("composite"), at(9, 16), seq({ correct: true }, { correct: false, prefer: "inner-outer-swap", retry: "correct" }));
    await sim.assessment(me, { kind: "assessment", assessmentId: "calculus-ab.quiz.rules" }, at(6, 14), seq({ correct: true }, { correct: true }, { correct: false, prefer: "trig-sign" }, { correct: true }));
  }

  await printSummary(db, { u, classes: [calc, physics, micro, lakeCalc].filter((x): x is typeof calc => x !== null), sim, elapsedMs: Date.now() - started });
  await closeDatabase();
}

async function printSummary(db: Db, ctx: { u: Record<string, SessionUser>; classes: (typeof t.classes.$inferSelect)[]; sim: DemoSimulator; elapsedMs: number }) {
  const pad = (s: string | number, n: number) => String(s).padEnd(n);
  const count = async (table: PgTable) => (await db.select({ n: sql<number>`count(*)::int` }).from(table))[0].n;

  log("\n════════════════════════ AceAP demo data ready ════════════════════════");
  log("All people and organisations are fictional.\n");
  log("Accounts");
  for (const a of DEMO_ACCOUNTS) log(`  ${pad(a.email, 36)} ${pad(a.name, 15)} ${pad(a.role, 15)} ${a.blurb}`);

  log("\nClasses");
  for (const stale of ctx.classes) {
    const [c] = await db.select().from(t.classes).where(eq(t.classes.id, stale.id));
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(t.classEnrollments).where(and(eq(t.classEnrollments.classId, c.id), eq(t.classEnrollments.status, "active")));
    const [{ a }] = await db.select({ a: sql<number>`count(*)::int` }).from(t.assignments).where(eq(t.assignments.classId, c.id));
    log(`  ${pad(c.name, 30)} join code ${pad(c.joinCode, 9)} ${pad(`${n} students`, 12)} ${pad(`${a} assignments`, 15)} AI: ${c.aiPolicy}`);
  }

  log("\nAssignments");
  const asg = await db
    .select({ title: t.assignments.title, kind: t.assignments.kind, className: t.classes.name, id: t.assignments.id, dueAt: t.assignments.dueAt })
    .from(t.assignments)
    .innerJoin(t.classes, eq(t.classes.id, t.assignments.classId))
    .orderBy(asc(t.classes.name), asc(t.assignments.title));
  for (const a of asg) {
    const subs = await db.select({ status: t.submissions.status }).from(t.submissions).where(eq(t.submissions.assignmentId, a.id));
    const targets = await db.select({ id: t.assignmentTargets.studentId }).from(t.assignmentTargets).where(eq(t.assignmentTargets.assignmentId, a.id));
    log(`  ${pad(a.title, 44)} ${pad(a.kind, 15)} ${pad(targets.length ? `${targets.length} targeted` : "whole class", 12)} submitted ${subs.filter((s) => s.status === "submitted").length}, late ${subs.filter((s) => s.status === "late").length}`);
  }

  log("\nStudent mastery profiles (skills by level, per course)");
  const short = (l: MasteryLevel) => ({ not_started: "NS", developing: "Dev", approaching: "App", proficient: "Prof", mastered: "Mast" })[l];
  for (const a of DEMO_ACCOUNTS.filter((x) => x.role === "student")) {
    const user = ctx.u[a.key];
    const states = await db.select({ courseId: t.masteryStates.courseId, level: t.masteryStates.level }).from(t.masteryStates).where(eq(t.masteryStates.userId, user.id));
    const courses = [...new Set(states.map((s) => s.courseId))].sort();
    const parts: string[] = [];
    for (const courseId of courses) {
      const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(t.skills).where(eq(t.skills.courseId, courseId));
      const mine = states.filter((s) => s.courseId === courseId);
      const by = MASTERY_LEVELS.filter((l) => l !== "not_started").map((l) => `${short(l)} ${mine.filter((s) => s.level === l).length}`);
      parts.push(`${courseId}: ${by.join(" · ")} · untested ${total - mine.length}`);
    }
    const misc = await db.select({ id: t.detectedMisconceptions.misconceptionId, status: t.detectedMisconceptions.status, n: t.detectedMisconceptions.occurrences }).from(t.detectedMisconceptions).where(eq(t.detectedMisconceptions.userId, user.id));
    const [{ responses }] = await db.select({ responses: sql<number>`count(*)::int` }).from(t.questionResponses).where(eq(t.questionResponses.userId, user.id));
    const [{ active, open }] = await db
      .select({ active: sql<number>`coalesce(sum(${t.activityAggregates.activeMs}), 0)::int`, open: sql<number>`coalesce(sum(${t.activityAggregates.openMs}), 0)::int` })
      .from(t.activityAggregates)
      .where(eq(t.activityAggregates.userId, user.id));
    log(`  ${a.name} (${a.email}) — ${responses} responses, active ${formatDuration(active)} of ${formatDuration(open)} open`);
    for (const p of parts.length ? parts : ["no mastery evidence yet"]) log(`      ${p}`);
    if (misc.length) log(`      misconceptions: ${misc.map((m) => `${m.id.split(".").pop()} (${m.status}, ×${m.n})`).join(", ")}`);
  }
  const taylorHistory = await db
    .select({ level: t.masterySnapshots.level })
    .from(t.masterySnapshots)
    .where(and(eq(t.masterySnapshots.userId, ctx.u.taylor.id), eq(t.masterySnapshots.skillId, "calculus-ab.chain-polynomial")))
    .orderBy(asc(t.masterySnapshots.createdAt), asc(t.masterySnapshots.id));
  const trajectory = taylorHistory.map((h) => h.level).filter((l, i, xs) => i === 0 || xs[i - 1] !== l);
  log(`\n  Taylor — "Chain rule: powers of functions" history (${taylorHistory.length} snapshots): ${trajectory.join(" → ")}`);
  const alexChain = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(t.masteryEvidence)
    .where(and(eq(t.masteryEvidence.userId, ctx.u.alex.id), sql`${t.masteryEvidence.skillId} like 'calculus-ab.chain-%'`));
  log(`\n  Check: Alex has ${alexChain[0].n} chain-rule evidence rows (expected 0 — the live demo moves these).`);

  const levelRows = await db.select({ level: t.masteryStates.level, n: sql<number>`count(*)::int` }).from(t.masteryStates).groupBy(t.masteryStates.level);
  const miscRows = await db.select({ status: t.detectedMisconceptions.status, n: sql<number>`count(*)::int` }).from(t.detectedMisconceptions).groupBy(t.detectedMisconceptions.status);
  log("\nTotals");
  log(`  question responses ${await count(t.questionResponses)} · mastery evidence ${await count(t.masteryEvidence)} · mastery states ${await count(t.masteryStates)} · snapshots ${await count(t.masterySnapshots)}`);
  log(`  mastery states by level: ${MASTERY_LEVELS.map((l) => `${l} ${levelRows.find((r) => r.level === l)?.n ?? 0}`).join(", ")}`);
  log(`  misconceptions: ${miscRows.map((r) => `${r.status} ${r.n}`).join(", ") || "none"}`);
  log(`  learning sessions ${await count(t.learningSessions)} (${ctx.sim.counts.heartbeats} heartbeats) · submissions ${await count(t.submissions)}`);
  log(`  seeded in ${(ctx.elapsedMs / 1000).toFixed(1)} s`);
  const adminNote = process.env.SEED_ADMIN_PASSWORD?.trim() ? " (except the platform admin, which uses SEED_ADMIN_PASSWORD)" : "";
  log(`\nDemo password for every account above: ${DEMO_PASSWORD}${adminNote}`);
}

// Run only when executed directly (`tsx scripts/seed.ts`), not when imported for its helpers.
if ((process.argv[1] ?? "").replace(/\\/g, "/").endsWith("scripts/seed.ts")) {
  main().catch(async (e) => {
    console.error(e);
    await closeDatabase().catch(() => undefined);
    process.exit(1);
  });
}
