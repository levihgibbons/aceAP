/**
 * Exam readiness: an honest evidence summary built from real attempts.
 * It must never claim knowledge of untested skills or predict an AP score.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { attempts, masteryStates, questionVersions } from "@/db/schema";
import { saveDraftAnswer, startAttempt, submitAttempt, submitResponse, type StartSpec } from "@/modules/assessments/service";
import type { QuestionResponse } from "@/modules/assessments/grading";
import { createUser, type SessionUser } from "@/modules/auth/service";
import { createClass, joinClassByCode } from "@/modules/classrooms/service";
import type { QuestionBody } from "@/modules/content/schema";
import { syncContent } from "@/modules/content/sync";
import { getCourseTree } from "@/modules/curriculum/queries";
import { getExamReadiness, listExamPracticeOptions, type ExamReadiness } from "@/modules/examprep/service";
import { LEVEL_RANK } from "@/modules/mastery/types";

// ─────────────────────────────── test helpers ───────────────────────────────

const DAY = 86_400_000;
const T0 = new Date("2026-10-01T15:00:00Z");
const at = (days: number) => new Date(T0.getTime() + days * DAY);

async function bodyOf(questionId: string, version: number): Promise<QuestionBody> {
  const db = await getDb();
  const [v] = await db.select({ body: questionVersions.body }).from(questionVersions).where(and(eq(questionVersions.questionId, questionId), eq(questionVersions.version, version)));
  return v.body;
}

/** Build a correct (or deliberately wrong) response from the answer key. */
function responseFor(body: QuestionBody, correct: boolean): QuestionResponse {
  switch (body.type) {
    case "multiple_choice":
      return { type: "multiple_choice", choiceId: correct ? body.correctChoiceId : body.choices.find((c) => c.id !== body.correctChoiceId)!.id };
    case "multi_select":
      return { type: "multi_select", choiceIds: correct ? body.correctChoiceIds : [body.choices.find((c) => !body.correctChoiceIds.includes(c.id))?.id ?? body.correctChoiceIds[0]].slice(0, 1) };
    case "numeric":
      return { type: "numeric", value: String(correct ? body.answer : body.answer + 1000) };
    case "expression":
      return { type: "expression", value: correct ? body.answer : `${body.variables[0]}+12345` };
    case "ordering":
      return { type: "ordering", order: correct ? body.correctOrder : [...body.correctOrder].reverse() };
    case "matching": {
      const lefts = body.left.map((l) => l.id);
      return { type: "matching", pairs: correct ? body.pairs : Object.fromEntries(lefts.map((l, i) => [l, body.pairs[lefts[(i + 1) % lefts.length]]])) };
    }
    case "short_response":
      return { type: "short_response", text: "A written answer." };
  }
}

async function itemsOf(attemptId: string) {
  const db = await getDb();
  const [a] = await db.select({ items: attempts.items }).from(attempts).where(eq(attempts.id, attemptId));
  return a.items;
}

async function takeDeferred(userId: string, spec: StartSpec, isCorrect: (i: number) => boolean, now: Date) {
  const { attemptId } = await startAttempt(userId, spec, now);
  for (const [i, item] of (await itemsOf(attemptId)).entries()) {
    const body = await bodyOf(item.questionId, item.version);
    await saveDraftAnswer(userId, { attemptId, questionId: item.questionId, response: responseFor(body, isCorrect(i)) }, now);
  }
  return submitAttempt(userId, attemptId, now);
}

async function takeImmediate(userId: string, spec: StartSpec, isCorrect: (i: number) => boolean, now: Date) {
  const { attemptId } = await startAttempt(userId, spec, now);
  for (const [i, item] of (await itemsOf(attemptId)).entries()) {
    const body = await bodyOf(item.questionId, item.version);
    await submitResponse(userId, { attemptId, questionId: item.questionId, response: responseFor(body, isCorrect(i)), idempotencyKey: `${attemptId}:${item.questionId}` }, now);
  }
  return submitAttempt(userId, attemptId, now);
}

/** Properties that must hold for any readiness report. */
function expectHonest(r: ExamReadiness) {
  expect(r.disclaimer).toMatch(/not a predicted AP score/i);
  expect(r.disclaimer).toMatch(/no validated model/i);
  expect(r.masteryShare).toBeLessThanOrEqual(r.coverage);
  for (const u of r.perUnit) {
    expect(u.proficientOrBetter).toBeLessThanOrEqual(u.skillsWithEvidence);
    if (u.skillsWithEvidence < u.totalSkills || u.totalSkills === 0) expect(LEVEL_RANK[u.level]).toBeLessThan(LEVEL_RANK.proficient);
  }
  const weakIds = new Set(r.weakestObjectives.map((o) => o.objectiveId));
  for (const u of r.untested) {
    expect(u.skillsWithEvidence).toBe(0);
    expect(weakIds.has(u.objectiveId)).toBe(false);
  }
  for (const w of r.weakestObjectives) {
    expect(w.skillsWithEvidence).toBeGreaterThan(0);
    expect(LEVEL_RANK[w.level]).toBeLessThan(LEVEL_RANK.proficient);
  }
}

// ──────────────────────────────────── rig ───────────────────────────────────

const COURSE = "calculus-ab";
const PREREQ = "calculus-ab.inner-outer";
const DEPENDENT = "calculus-ab.chain-polynomial";

let sam: SessionUser;
let pat: SessionUser;
let teacher: SessionUser;
let outsider: SessionUser;

beforeAll(async () => {
  await syncContent(await getDb());
  const pw = "correct-horse-battery";
  sam = await createUser({ name: "Sam Student", email: "sam@exam.test", password: pw, role: "student" });
  pat = await createUser({ name: "Pat Practice", email: "pat@exam.test", password: pw, role: "student" });
  teacher = await createUser({ name: "Tim Teacher", email: "tim@exam.test", password: pw, role: "teacher", createPersonalOrganization: true });
  outsider = await createUser({ name: "Olga Outsider", email: "olga@exam.test", password: pw, role: "teacher", createPersonalOrganization: true });
  const cls = await createClass(teacher, { name: "AB exam prep", courseId: COURSE });
  await joinClassByCode(sam, cls.joinCode);
  await createClass(outsider, { name: "Other AB", courseId: COURSE });
});

// ─────────────────────────────────── tests ──────────────────────────────────

describe("exam readiness", () => {
  it("with no evidence: nothing is claimed, every objective is untested, and the disclaimer is present", async () => {
    const r = await getExamReadiness(sam, sam.id, COURSE, at(0));
    const tree = (await getCourseTree(COURSE))!;
    expectHonest(r);
    expect(r).toMatchObject({ courseId: COURSE, courseName: "AP Calculus AB", coverage: 0, masteryShare: 0, skillsWithEvidence: 0, totalSkills: tree.skillIds.length });
    expect(r.weakestObjectives).toEqual([]);
    expect(r.untested.map((o) => o.objectiveId).sort()).toEqual([...tree.objectives.keys()].sort());
    expect(r.reviewSequence).toEqual([]);
    expect(r.practiceResults).toEqual({ attempts: [], consistency: null });
    expect(r.perUnit.find((u) => u.unitId === "calculus-ab.u3")).toMatchObject({ status: "available", level: "not_started", skillsWithEvidence: 0 });
    expect(r.perUnit.filter((u) => u.status === "outline").every((u) => u.totalSkills === 0 && u.level === "not_started")).toBe(true);
  });

  it("weak evidence: lists weak objectives, keeps untested ones separate, and orders a weak prerequisite first", async () => {
    await takeImmediate(sam.id, { kind: "practice", skillId: PREREQ, count: 3 }, () => false, at(1));
    await takeImmediate(sam.id, { kind: "practice", skillId: DEPENDENT, count: 3 }, () => false, at(1));
    const r = await getExamReadiness(sam, sam.id, COURSE, at(2));
    expectHonest(r);

    const db = await getDb();
    const states = await db.select().from(masteryStates).where(and(eq(masteryStates.userId, sam.id), eq(masteryStates.courseId, COURSE)));
    const tested = new Set(states.map((s) => s.skillId));
    expect(tested.has(PREREQ) && tested.has(DEPENDENT)).toBe(true);
    expect(states.every((s) => LEVEL_RANK[s.level] < LEVEL_RANK.proficient)).toBe(true);
    expect(r.skillsWithEvidence).toBe(tested.size);
    expect(r.coverage).toBeCloseTo(tested.size / r.totalSkills);
    expect(r.masteryShare).toBe(0);

    const tree = (await getCourseTree(COURSE))!;
    const expectedUntested = [...tree.objectives.values()].filter((o) => !o.skillIds.some((s) => tested.has(s))).map((o) => o.id);
    expect(r.untested.map((o) => o.objectiveId).sort()).toEqual(expectedUntested.sort());
    expect(r.untested.map((o) => o.code)).toContain("CALC-3.C");
    const weakCodes = r.weakestObjectives.map((o) => o.code);
    expect(weakCodes).toEqual(expect.arrayContaining(["CALC-3.A", "CALC-3.B"]));
    expect(r.weakestObjectives[0].reason).toMatch(/without help/);

    const order = r.reviewSequence.map((s) => s.skillId);
    expect(order).toContain(PREREQ);
    expect(order).toContain(DEPENDENT);
    expect(order.indexOf(PREREQ)).toBeLessThan(order.indexOf(DEPENDENT));
    expect(r.reviewSequence.find((s) => s.skillId === PREREQ)).toMatchObject({ kind: "prerequisite", href: `/app/practice/${PREREQ}` });
    expect(r.reviewSequence.find((s) => s.skillId === DEPENDENT)).toMatchObject({ kind: "weak_skill" });
  });

  it("reports exam-practice and unit-test results with timing and consistency", async () => {
    const first = await takeDeferred(pat.id, { kind: "assessment", assessmentId: "calculus-ab.exam.set-1" }, () => true, at(3));
    const second = await takeDeferred(pat.id, { kind: "assessment", assessmentId: "calculus-ab.exam.set-1" }, (i) => i % 2 === 0, at(4));
    const test = await takeDeferred(pat.id, { kind: "assessment", assessmentId: "calculus-ab.test.u3-chain" }, (i) => i < 3, at(5));
    const pct = (x: { score: number; maxScore: number }) => Math.round((x.score / x.maxScore) * 1000) / 10;

    const r = await getExamReadiness(pat, pat.id, COURSE, at(6));
    expectHonest(r);
    const a = r.practiceResults.attempts;
    expect(a.map((x) => x.mode)).toEqual(["unit_test", "exam_practice", "exam_practice"]);
    expect(a.map((x) => x.percent)).toEqual([pct(test), pct(second), pct(first)]);
    expect(a.every((x) => x.timed)).toBe(true);
    expect(a[1].title).toBe("AP-style practice set: differentiating composite functions");
    const all = [pct(first), pct(second), pct(test)];
    expect(r.practiceResults.consistency).toMatchObject({ recentCount: 3, min: Math.min(...all), max: Math.max(...all), spread: Math.round((Math.max(...all) - Math.min(...all)) * 10) / 10 });
    expect(r.practiceResults.consistency!.note).toMatch(/not a score prediction/i);
  });

  it("is private: other students are refused; only the student's own teacher may look", async () => {
    await expect(getExamReadiness(pat, sam.id, COURSE)).rejects.toMatchObject({ code: "forbidden" });
    await expect(getExamReadiness(outsider, sam.id, COURSE)).rejects.toMatchObject({ code: "not_found" });
    const viaTeacher = await getExamReadiness(teacher, sam.id, COURSE, at(2));
    const own = await getExamReadiness(sam, sam.id, COURSE, at(2));
    expect(viaTeacher.coverage).toBe(own.coverage);
    expect(viaTeacher.reviewSequence.map((s) => s.skillId)).toEqual(own.reviewSequence.map((s) => s.skillId));
    // Pat is not in the teacher's class.
    await expect(getExamReadiness(teacher, pat.id, COURSE)).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("exam practice options", () => {
  it("lists exam-practice sets and unit tests and whether a mixed set is possible", async () => {
    const o = await listExamPracticeOptions(COURSE);
    expect(o.assessments.map((a) => a.id).sort()).toEqual(["calculus-ab.exam.set-1", "calculus-ab.test.u3-chain"]);
    expect(o.assessments.find((a) => a.id === "calculus-ab.exam.set-1")).toMatchObject({ kind: "exam_practice", questionCount: 8, timeLimitSeconds: 960, href: "/app/assessments/calculus-ab.exam.set-1" });
    expect(o.mixedAdaptive).toMatchObject({ available: true, minimumQuestions: 4, startSpec: { kind: "exam_mixed", courseId: COURSE } });
    expect(o.mixedAdaptive.questionCount).toBeGreaterThanOrEqual(4);
  });

  it("is honest about outline-only courses and unknown ids", async () => {
    const bio = await listExamPracticeOptions("biology");
    expect(bio.assessments).toEqual([]);
    expect(bio.mixedAdaptive).toMatchObject({ available: false, questionCount: 0 });
    await expect(listExamPracticeOptions("no-such-course")).rejects.toMatchObject({ code: "not_found" });
  });
});
