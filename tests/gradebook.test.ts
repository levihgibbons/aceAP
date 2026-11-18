/**
 * Gradebook service against a real in-memory database: real students, real
 * attempts, real mastery evidence. Grades are derived; evidence is never edited.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { attempts, auditLogs, masteryEvidence, masteryStates, questionResponses, questionVersions } from "@/db/schema";
import { saveDraftAnswer, startAttempt, submitAttempt, submitResponse, type StartSpec } from "@/modules/assessments/service";
import type { QuestionResponse } from "@/modules/assessments/grading";
import { createUser, type SessionUser } from "@/modules/auth/service";
import { createAssignment, createClass, joinClassByCode } from "@/modules/classrooms/service";
import type { QuestionBody } from "@/modules/content/schema";
import { syncContent } from "@/modules/content/sync";
import { DEFAULT_GRADING_POLICY, type GradingPolicyConfig } from "@/modules/gradebook/policy";
import {
  csvField,
  exportGradebookCsv,
  getGradebook,
  getStudentGrades,
  listGradingPolicyVersions,
  previewGradingPolicy,
  publishGradingPolicy,
  setExcused,
  setGradeComment,
  setGradeOverride,
} from "@/modules/gradebook/service";
import type { MasteryLevel } from "@/modules/mastery/types";

// ─────────────────────────────── test helpers ───────────────────────────────

const DAY = 86_400_000;
const T0 = new Date("2026-09-01T12:00:00Z");
const at = (days: number) => new Date(T0.getTime() + days * DAY);
const NOW = at(10);

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

/** Deferred-feedback attempt (quiz/test): save drafts, then submit. */
async function takeDeferred(userId: string, spec: StartSpec, isCorrect: (i: number) => boolean, now: Date) {
  const { attemptId } = await startAttempt(userId, spec, now);
  for (const [i, item] of (await itemsOf(attemptId)).entries()) {
    const body = await bodyOf(item.questionId, item.version);
    await saveDraftAnswer(userId, { attemptId, questionId: item.questionId, response: responseFor(body, isCorrect(i)) }, now);
  }
  return submitAttempt(userId, attemptId, now);
}

/** Immediate-feedback attempt (practice): answer each item once, then submit. */
async function takeImmediate(userId: string, spec: StartSpec, isCorrect: (i: number) => boolean, now: Date) {
  const { attemptId } = await startAttempt(userId, spec, now);
  for (const [i, item] of (await itemsOf(attemptId)).entries()) {
    const body = await bodyOf(item.questionId, item.version);
    await submitResponse(userId, { attemptId, questionId: item.questionId, response: responseFor(body, isCorrect(i)), idempotencyKey: `${attemptId}:${item.questionId}` }, now);
  }
  return submitAttempt(userId, attemptId, now);
}

async function evidenceSnapshot() {
  const db = await getDb();
  return JSON.stringify({
    responses: await db.select().from(questionResponses).orderBy(asc(questionResponses.id)),
    evidence: await db.select().from(masteryEvidence).orderBy(asc(masteryEvidence.id)),
    states: await db.select().from(masteryStates).orderBy(asc(masteryStates.userId), asc(masteryStates.skillId)),
  });
}

async function levelsOf(userId: string, skillIds: string[]): Promise<MasteryLevel[]> {
  const db = await getDb();
  const rows = await db.select().from(masteryStates).where(eq(masteryStates.userId, userId));
  return skillIds.map((id) => rows.find((r) => r.skillId === id)?.level ?? "not_started");
}

const mean = (xs: number[]) => Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10;

async function auditRows(action: string) {
  const db = await getDb();
  return db.select().from(auditLogs).where(eq(auditLogs.action, action)).orderBy(asc(auditLogs.createdAt));
}

// ──────────────────────────────────── rig ───────────────────────────────────

const CHAIN_SKILLS = ["calculus-ab.chain-polynomial", "calculus-ab.chain-trig"];
const EVIL_NAME = '=HYPERLINK("http://x"),"Click"';

let teacher: SessionUser;
let outsider: SessionUser;
let s1: SessionUser;
let s2: SessionUser;
let s3: SessionUser;
let s4: SessionUser;
let classId: string;
let quizId: string;
let practiceId: string;
let lessonId: string;

beforeAll(async () => {
  await syncContent(await getDb());
  const pw = "correct-horse-battery";
  teacher = await createUser({ name: "Tara Teacher", email: "tara@school.test", password: pw, role: "teacher", createPersonalOrganization: true });
  outsider = await createUser({ name: "Otto Outsider", email: "otto@other.test", password: pw, role: "teacher", createPersonalOrganization: true });
  s1 = await createUser({ name: "Ana Alvarez", email: "ana@school.test", password: pw, role: "student" });
  s2 = await createUser({ name: "Ben Brooks", email: "ben@school.test", password: pw, role: "student" });
  s3 = await createUser({ name: EVIL_NAME, email: "evil@school.test", password: pw, role: "student" });
  s4 = await createUser({ name: "Nora Notenrolled", email: "nora@school.test", password: pw, role: "student" });

  const cls = await createClass(teacher, { name: "AB Period 2", courseId: "calculus-ab" });
  classId = cls.id;
  for (const s of [s1, s2, s3]) await joinClassByCode(s, cls.joinCode);

  quizId = (await createAssignment(teacher, { classId, title: "Rules quiz", kind: "assessment", assessmentId: "calculus-ab.quiz.rules", dueAt: at(7), gradingMethod: "score", feedback: "after_submit" })).id;
  practiceId = (await createAssignment(teacher, { classId, title: "-Chain practice", kind: "skill_practice", skillIds: CHAIN_SKILLS, questionCount: 4, dueAt: at(7), gradingMethod: "mastery" })).id;
  lessonId = (await createAssignment(teacher, { classId, title: "Read: derivative rules", kind: "lesson", lessonId: "calculus-ab.l.rules", dueAt: at(30) })).id;

  // s1: perfect first try, weaker second try (both on time).
  await takeDeferred(s1.id, { kind: "assignment", assignmentId: quizId }, () => true, at(1));
  await takeDeferred(s1.id, { kind: "assignment", assignmentId: quizId }, (i) => i < 2, at(2));
  // s2: one late attempt, 4 of 5.
  await takeDeferred(s2.id, { kind: "assignment", assignmentId: quizId }, (i) => i < 4, at(8));
  // s1 practises the mastery-graded skills.
  await takeImmediate(s1.id, { kind: "assignment", assignmentId: practiceId }, () => true, at(3));
});

// ─────────────────────────────────── tests ──────────────────────────────────

describe("computed grades", () => {
  it("score grades use the best attempt by default and keep late status", async () => {
    const gb = await getGradebook(teacher, classId, { now: NOW });
    expect(gb.policy.version).toBe(1);
    expect(gb.students.map((s) => s.id).sort()).toEqual([s1.id, s2.id, s3.id].sort());
    const c1 = gb.cells[s1.id][quizId];
    expect(c1).toMatchObject({ percent: 100, points: 100, status: "submitted", attempts: 2, source: { kind: "score", attemptRule: "best" } });
    const c2 = gb.cells[s2.id][quizId];
    expect(c2).toMatchObject({ percent: 80, status: "late", attempts: 1, source: { kind: "score", latePenaltyApplied: 0 } });
  });

  it("distinguishes missing (past due) from not yet due", async () => {
    const gb = await getGradebook(teacher, classId, { now: NOW });
    expect(gb.cells[s3.id][quizId]).toMatchObject({ status: "missing", percent: null, attempts: 0 });
    expect(gb.cells[s2.id][practiceId].status).toBe("missing");
    for (const s of [s1, s2, s3]) expect(gb.cells[s.id][lessonId]).toMatchObject({ status: "not_submitted", percent: null });
    // Before the due date the same quiz is simply not submitted.
    const early = await getGradebook(teacher, classId, { now: at(5) });
    expect(early.cells[s3.id][quizId].status).toBe("not_submitted");
  });

  it("mastery-graded work follows the level→grade mapping; no submission and no evidence is not graded (not a zero)", async () => {
    const gb = await getGradebook(teacher, classId, { now: NOW });
    const levels = await levelsOf(s1.id, CHAIN_SKILLS);
    expect(levels.some((l) => l !== "not_started")).toBe(true);
    const c = gb.cells[s1.id][practiceId];
    expect(c.status).toBe("submitted");
    expect(c.percent).toBe(mean(levels.map((l) => DEFAULT_GRADING_POLICY.levelGrades[l])));
    expect(c.source).toMatchObject({ kind: "mastery", basis: "current" });
    // Missing work with no evidence on the assigned skills stays ungraded rather than counting as 0%.
    expect(gb.cells[s2.id][practiceId].percent).toBeNull();
    expect(gb.cells[s2.id][practiceId].status).toBe("missing");
  });

  it("reports averages that ignore null grades and say so", async () => {
    const gb = await getGradebook(teacher, classId, { now: NOW });
    expect(gb.averages.method).toMatch(/ignore/i);
    expect(gb.averages.assignments[quizId]).toEqual({ percent: 90, counted: 2 });
    expect(gb.averages.assignments[lessonId]).toEqual({ percent: null, counted: 0 });
  });
});

describe("grading policies", () => {
  const latestWithPenalty: GradingPolicyConfig = { ...DEFAULT_GRADING_POLICY, attemptRule: "latest", latePenalty: 10 };

  it("preview shows best-vs-latest and late-penalty effects without persisting anything", async () => {
    const before = await evidenceSnapshot();
    const preview = await previewGradingPolicy(teacher, classId, latestWithPenalty, { now: NOW });
    const quizRows = preview.assignments.find((a) => a.id === quizId)!.rows;
    expect(quizRows.find((r) => r.studentId === s1.id)).toMatchObject({ before: 100, after: 40, change: -60 });
    expect(quizRows.find((r) => r.studentId === s2.id)).toMatchObject({ before: 80, after: 70, change: -10 });
    expect(preview.summary.changed).toBeGreaterThanOrEqual(2);
    expect(preview.summary.decreased).toBeGreaterThanOrEqual(2);
    expect(preview.summary.maxDecrease).toBe(60);

    expect(await listGradingPolicyVersions(teacher, classId)).toHaveLength(1);
    expect(await auditRows("grading_policy.published")).toHaveLength(0);
    expect((await getGradebook(teacher, classId, { now: NOW })).cells[s1.id][quizId].percent).toBe(100);
    expect(await evidenceSnapshot()).toBe(before);
  });

  it("rejects an invalid policy", async () => {
    await expect(previewGradingPolicy(teacher, classId, { ...DEFAULT_GRADING_POLICY, latePenalty: 400 })).rejects.toMatchObject({ code: "invalid" });
    await expect(publishGradingPolicy(teacher, classId, { levelGrades: {} })).rejects.toMatchObject({ code: "invalid" });
  });

  it("Demonstration F: publishing changes grades while evidence stays byte-for-byte identical", async () => {
    const before = await evidenceSnapshot();
    const config: GradingPolicyConfig = { ...latestWithPenalty, levelGrades: { not_started: 10, developing: 55, approaching: 70, proficient: 85, mastered: 95 } };
    const published = await publishGradingPolicy(teacher, classId, config);
    expect(published).toMatchObject({ version: 2, isActive: true, config });

    const gb = await getGradebook(teacher, classId, { now: NOW });
    expect(gb.policy).toMatchObject({ id: published.id, version: 2 });
    const levels = await levelsOf(s1.id, CHAIN_SKILLS);
    expect(gb.cells[s1.id][practiceId].percent).toBe(mean(levels.map((l) => config.levelGrades[l])));
    expect(gb.cells[s1.id][practiceId].percent).not.toBe(mean(levels.map((l) => DEFAULT_GRADING_POLICY.levelGrades[l])));
    expect(gb.cells[s2.id][practiceId].percent).toBeNull(); // ungraded: no submission, no evidence
    expect(gb.cells[s1.id][quizId]).toMatchObject({ percent: 40, source: { kind: "score", attemptRule: "latest" } });
    expect(gb.cells[s2.id][quizId]).toMatchObject({ percent: 70, source: { latePenaltyApplied: 10 } });

    expect(await evidenceSnapshot()).toBe(before);

    const versions = await listGradingPolicyVersions(teacher, classId);
    expect(versions.map((v) => [v.version, v.isActive])).toEqual([[2, true], [1, false]]);
    const [audit] = await auditRows("grading_policy.published");
    expect(audit.metadata).toMatchObject({ classId, version: 2, previousVersion: 1 });
  });
});

describe("teacher adjustments", () => {
  it("an override replaces the displayed grade but keeps the computed value; clearing restores it", async () => {
    const before = await evidenceSnapshot();
    await setGradeOverride(teacher, { assignmentId: quizId, studentId: s2.id, grade: 95, reason: "Re-marked after review" });
    let cell = (await getGradebook(teacher, classId, { now: NOW })).cells[s2.id][quizId];
    expect(cell.percent).toBe(95);
    expect(cell.source).toEqual({ kind: "override", by: teacher.id, reason: "Re-marked after review", replaced: 70 });
    expect(cell.override).toMatchObject({ grade: 95, reason: "Re-marked after review", by: teacher.id });

    await setGradeOverride(teacher, { assignmentId: quizId, studentId: s2.id, grade: null });
    cell = (await getGradebook(teacher, classId, { now: NOW })).cells[s2.id][quizId];
    expect(cell).toMatchObject({ percent: 70, override: null, source: { kind: "score" } });
    expect(await evidenceSnapshot()).toBe(before);

    const [set] = await auditRows("gradebook.override_set");
    expect(set.metadata).toMatchObject({ assignmentId: quizId, studentId: s2.id, previous: null, next: { grade: 95 } });
    const [cleared] = await auditRows("gradebook.override_cleared");
    expect(cleared.metadata).toMatchObject({ previous: { grade: 95, reason: "Re-marked after review" }, next: null });
  });

  it("requires a reason and an actively enrolled student", async () => {
    await expect(setGradeOverride(teacher, { assignmentId: quizId, studentId: s1.id, grade: 90, reason: "  " })).rejects.toMatchObject({ code: "invalid" });
    await expect(setGradeOverride(teacher, { assignmentId: quizId, studentId: s4.id, grade: 90, reason: "x" })).rejects.toMatchObject({ code: "invalid" });
    await expect(setGradeComment(teacher, { assignmentId: quizId, studentId: s4.id, comment: "hi" })).rejects.toMatchObject({ code: "invalid" });
  });

  it("comments and excusals are stored and audited with the previous value", async () => {
    await setGradeComment(teacher, { assignmentId: quizId, studentId: s1.id, comment: "Great first attempt" });
    await setGradeComment(teacher, { assignmentId: quizId, studentId: s1.id, comment: "Great first attempt!" });
    await setExcused(teacher, { assignmentId: practiceId, studentId: s2.id, excused: true, reason: "Joined late" });
    const gb = await getGradebook(teacher, classId, { now: NOW });
    expect(gb.cells[s1.id][quizId].comment).toBe("Great first attempt!");
    expect(gb.cells[s2.id][practiceId].status).toBe("excused");
    // Excused and ungraded cells drop out of averages.
    expect(gb.averages.assignments[practiceId].counted).toBe(1);
    const comments = await auditRows("gradebook.comment_set");
    expect(comments.map((c) => (c.metadata as { previous: unknown }).previous)).toEqual([null, "Great first attempt"]);
    const [excused] = await auditRows("gradebook.excused_set");
    expect(excused.metadata).toMatchObject({ previous: false, next: true, reason: "Joined late" });
  });
});

describe("CSV export", () => {
  it("escapes per RFC 4180 and neutralises formula injection", () => {
    expect(csvField("=1+1")).toBe("'=1+1");
    expect(csvField("+cmd")).toBe("'+cmd");
    expect(csvField("-2")).toBe("'-2");
    expect(csvField("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvField('a,"b"')).toBe('"a,""b"""');
    expect(csvField("line\nbreak")).toBe('"line\nbreak"');
    expect(csvField(12.5)).toBe("12.5");
    expect(csvField(null)).toBe("");
  });

  it("exports one row per student with safe headers, names and override notes", async () => {
    await setGradeOverride(teacher, { assignmentId: practiceId, studentId: s1.id, grade: 88, reason: '@risky, "quoted"\nnote' });
    const csv = await exportGradebookCsv(teacher, classId, { now: NOW });
    const header = csv.split("\r\n")[0];
    expect(header).toBe(`Student,Rules quiz (%),'-Chain practice (%),'-Chain practice (note),Read: derivative rules (%),Average (%)`);
    expect(csv).toContain(`"'=HYPERLINK(""http://x""),""Click"""`);
    expect(csv).toContain(`Ana Alvarez,40,88,"Overridden to 88% (computed: `);
    expect(csv).toContain(`— @risky, ""quoted""\nnote"`);
    expect(csv).toContain("Excused");
    expect(csv.endsWith("\r\n")).toBe(true);
    // Evil name must never appear unescaped at the start of a field.
    expect(csv).not.toMatch(/(^|,|\r\n)=HYPERLINK/);
  });
});

describe("access control", () => {
  it("a teacher from another organisation can't see or change the class", async () => {
    await expect(getGradebook(outsider, classId)).rejects.toMatchObject({ code: "not_found" });
    await expect(exportGradebookCsv(outsider, classId)).rejects.toMatchObject({ code: "not_found" });
    await expect(previewGradingPolicy(outsider, classId, DEFAULT_GRADING_POLICY)).rejects.toMatchObject({ code: "not_found" });
    await expect(publishGradingPolicy(outsider, classId, DEFAULT_GRADING_POLICY)).rejects.toMatchObject({ code: "not_found" });
    await expect(setGradeOverride(outsider, { assignmentId: quizId, studentId: s1.id, grade: 100, reason: "x" })).rejects.toMatchObject({ code: "not_found" });
    await expect(getStudentGrades(outsider, s1.id, classId)).rejects.toMatchObject({ code: "not_found" });
  });

  it("students can't open the teacher gradebook or another student's grades", async () => {
    await expect(getGradebook(s1, classId)).rejects.toMatchObject({ code: "not_found" });
    await expect(getStudentGrades(s1, s2.id, classId)).rejects.toMatchObject({ code: "forbidden" });
    await expect(getStudentGrades(s4, s4.id, classId)).rejects.toMatchObject({ code: "not_found" });
  });

  it("a student sees their own grades, matching the teacher's view", async () => {
    const mine = await getStudentGrades(s1, s1.id, classId, { now: NOW });
    const gb = await getGradebook(teacher, classId, { now: NOW });
    expect(mine.student.id).toBe(s1.id);
    expect(mine.policy.version).toBe(2);
    expect(mine.assignments.map((a) => a.id).sort()).toEqual([quizId, practiceId, lessonId].sort());
    for (const a of mine.assignments) expect(a.cell.percent).toBe(gb.cells[s1.id][a.id].percent);
    expect(mine.assignments.find((a) => a.id === quizId)!.cell.comment).toBe("Great first attempt!");
    expect(mine.average).toEqual(gb.averages.students[s1.id]);
  });
});
