/**
 * End-to-end, service-level learning flow (mirrors the product acceptance demos).
 *
 * Every step goes through the production services against a real (in-memory)
 * PostgreSQL with migrations and row-level security applied. Tests in this
 * file share one world and run in order.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { and, asc, eq, inArray } from "drizzle-orm";
import { asUser } from "@/db/client";
import * as t from "@/db/schema";
import { ActiveTimeMeter, DEFAULT_IDLE_THRESHOLD_MS } from "@/modules/analytics/activeTime";
import { recordHeartbeat, startLearningSession } from "@/modules/analytics/service";
import { getAttemptView, revealHint, startAttempt, submitAttempt, submitResponse } from "@/modules/assessments/service";
import { getClassEngagement, getMasteryMatrix } from "@/modules/classrooms/analytics";
import { createAssignment } from "@/modules/classrooms/service";
import { logEvent } from "@/modules/learning/events";
import { getCourseOverview, getSkillDetail, listStudentAssignments } from "@/modules/learning/overview";
import { completeLesson, startLesson } from "@/modules/learning/progress";
import { DEFAULT_MASTERY_POLICY } from "@/modules/mastery/policy";
import { ensureDefaultPolicy, publishPolicy } from "@/modules/mastery/service";
import type { MasteryPolicyConfig } from "@/modules/mastery/types";
import {
  answerCorrectly,
  answerIncorrectly,
  attemptRow,
  bootWorld,
  calc,
  calcQ,
  clock,
  countRows,
  DAY,
  HOUR,
  evidenceOf,
  MINUTE,
  plus,
  question,
  SECOND,
  stateOf,
  T0,
  type World,
} from "./helpers/world";

let w: World;

beforeAll(async () => {
  w = await bootWorld();
});

const CHAIN_RULE_LESSON = "calculus-ab.l.chain-rule";
const OMIT_INNER = "calculus-ab.m.omit-inner";

const isIndependent = (e: typeof t.masteryEvidence.$inferSelect) => e.tryNumber === 1 && e.hintsUsed === 0 && !e.solutionViewed && !e.tutorUsed;

// ═══════════════════════════════════ Demo A ══════════════════════════════════

describe("Demo A — lesson, quiz, evidence, mastery and recommendations", () => {
  const c = clock(T0);
  let lessonAttemptId = "";
  let quizAttemptId = "";
  const quizPlan: Record<string, boolean> = {
    [calcQ("io-4")]: true,
    [calcQ("cp-4")]: false,
    [calcQ("ct-2")]: false,
    [calcQ("ce-2")]: false,
    [calcQ("cl-1")]: true,
    [calcQ("ci-2")]: true,
  };

  it("lesson-check answers become lesson_check evidence with the right try and hint flags", async () => {
    const ada = w.students.ada;
    await startLesson(ada.id, CHAIN_RULE_LESSON, c.now());
    const [progress] = await w.db.select().from(t.lessonProgress).where(and(eq(t.lessonProgress.userId, ada.id), eq(t.lessonProgress.lessonId, CHAIN_RULE_LESSON)));
    expect(progress.status).toBe("in_progress");

    const { attemptId } = await startAttempt(ada.id, { kind: "lesson", lessonId: CHAIN_RULE_LESSON }, c.tick());
    lessonAttemptId = attemptId;
    expect((await attemptRow(attemptId)).items.map((i) => i.questionId)).toEqual([calcQ("cp-1"), calcQ("cp-2")]);

    // cp-1: the classic "forgot the inside" error, then a corrected retry.
    const miss = await answerIncorrectly(attemptId, calcQ("cp-1"), { prefer: "omit-inner", now: c.tick() });
    expect(miss.status).toBe("graded");
    if (miss.status !== "graded") throw new Error("unreachable");
    expect(miss.feedback.correct).toBe(false);
    expect(miss.feedback.misconception?.id).toBe(OMIT_INNER);
    expect(miss.feedback.correctAnswer).toBeNull(); // first miss in a guided mode: key not yet revealed
    const retry = await answerCorrectly(attemptId, calcQ("cp-1"), { now: c.tick() });
    expect(retry).toMatchObject({ status: "graded", tryNumber: 2, locked: true, feedback: { correct: true } });

    // cp-2: one hint revealed BEFORE answering, then correct.
    await revealHint(ada.id, attemptId, calcQ("cp-2"), c.tick());
    const hinted = await answerCorrectly(attemptId, calcQ("cp-2"), { now: c.tick() });
    expect(hinted).toMatchObject({ status: "graded", tryNumber: 1, feedback: { correct: true } });

    const ev = (await evidenceOf(ada.id)).sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    expect(ev.map((e) => ({ q: e.questionId, skill: e.skillId, mode: e.mode, try: e.tryNumber, hints: e.hintsUsed, score: e.score, attempt: e.attemptId }))).toEqual([
      { q: calcQ("cp-1"), skill: calc("chain-polynomial"), mode: "lesson_check", try: 1, hints: 0, score: 0, attempt: attemptId },
      { q: calcQ("cp-1"), skill: calc("chain-polynomial"), mode: "lesson_check", try: 2, hints: 0, score: 1, attempt: attemptId },
      { q: calcQ("cp-2"), skill: calc("chain-polynomial"), mode: "lesson_check", try: 1, hints: 1, score: 1, attempt: attemptId },
    ]);
  });

  it("the quiz withholds all feedback until submit, then grades every item", async () => {
    const ada = w.students.ada;
    const { attemptId } = await startAttempt(ada.id, { kind: "assessment", assessmentId: "calculus-ab.quiz.chain" }, c.tick());
    quizAttemptId = attemptId;
    const attempt = await attemptRow(attemptId);
    expect(attempt).toMatchObject({ mode: "lesson_quiz", feedback: "after_submit", assistance: "disabled" });
    expect(attempt.items.map((i) => i.questionId)).toEqual(Object.keys(quizPlan));

    // Wrong answers use authored common errors so the grader can name the misconception.
    const prefer: Record<string, string> = { [calcQ("cp-4")]: "omit-inner", [calcQ("ct-2")]: "trig-sign", [calcQ("ce-2")]: "power-rule-on-exponential" };
    for (const [qid, right] of Object.entries(quizPlan)) {
      const r = right ? await answerCorrectly(attemptId, qid, { now: c.tick() }) : await answerIncorrectly(attemptId, qid, { prefer: prefer[qid], now: c.tick() });
      expect(r.status).toBe("draft_saved");
      if (!right) expect("expectedMisconception" in r && r.expectedMisconception).toBe(`calculus-ab.m.${prefer[qid]}`);
    }
    // Immediate grading is refused, and hints are off.
    await expect(submitResponse(ada.id, { attemptId, questionId: calcQ("io-4"), response: { type: "multiple_choice", choiceId: "a" }, idempotencyKey: "nope" }, c.tick())).rejects.toMatchObject({ code: "invalid" });
    await expect(revealHint(ada.id, attemptId, calcQ("io-4"), c.tick())).rejects.toMatchObject({ code: "forbidden" });

    const before = await getAttemptView(ada.id, attemptId, c.tick());
    for (const qid of Object.keys(quizPlan)) {
      expect(before.state[qid].answered).toBe(true);
      expect(before.state[qid].feedback).toBeNull();
    }
    // Nothing is graded, and no answer key reaches the student, before submit.
    const serialized = JSON.stringify(before);
    for (const secret of ["correctChoiceId", "correctChoiceIds", "commonErrors", "\"answer\"", "misconception", "solution\":\""]) expect(serialized).not.toContain(secret);
    expect(await countRows(t.questionResponses, eq(t.questionResponses.attemptId, attemptId))).toBe(0);
    expect(await countRows(t.masteryEvidence, eq(t.masteryEvidence.attemptId, attemptId))).toBe(0);

    const result = await submitAttempt(ada.id, attemptId, c.tick());
    expect(result).toMatchObject({ score: 3, maxScore: 6, pendingReview: 0, alreadySubmitted: false });

    const after = await getAttemptView(ada.id, attemptId, c.tick());
    expect(after.status).toBe("submitted");
    for (const [qid, right] of Object.entries(quizPlan)) {
      const fb = after.state[qid].feedback;
      expect(fb, qid).not.toBeNull();
      expect(fb!.correct).toBe(right);
      expect(fb!.correctAnswer).toBeTruthy(); // the key is revealed only now
    }
    expect(after.state[calcQ("cp-4")].feedback!.misconception?.id).toBe(OMIT_INNER);
    expect(after.state[calcQ("ct-2")].feedback!.misconception?.id).toBe("calculus-ab.m.trig-sign");
    expect(after.state[calcQ("ce-2")].feedback!.misconception?.id).toBe("calculus-ab.m.power-rule-on-exponential");

    const ev = await w.db.select().from(t.masteryEvidence).where(eq(t.masteryEvidence.attemptId, attemptId));
    expect(ev).toHaveLength(6);
    for (const e of ev) expect({ mode: e.mode, try: e.tryNumber, hints: e.hintsUsed, solution: e.solutionViewed, tutor: e.tutorUsed, review: e.isRetentionReview }).toEqual({ mode: "lesson_quiz", try: 1, hints: 0, solution: false, tutor: false, review: false });
    expect(Object.fromEntries(ev.map((e) => [e.questionId, e.score === 1]))).toEqual(quizPlan);
  });

  it("mastery_states explanations match the evidence they were computed from", async () => {
    const ada = w.students.ada;
    const states = await w.db.select().from(t.masteryStates).where(eq(t.masteryStates.userId, ada.id));
    const ev = await evidenceOf(ada.id);
    expect(new Set(states.map((s) => s.skillId))).toEqual(new Set(ev.map((e) => e.skillId)));
    for (const s of states) {
      const mine = ev.filter((e) => e.skillId === s.skillId);
      const independent = mine.filter(isIndependent);
      expect(s.explanation.attempts, s.skillId).toBe(mine.length);
      expect(s.explanation.independentAttempts, s.skillId).toBe(independent.length);
      expect(s.explanation.independentCorrect, s.skillId).toBe(independent.filter((e) => e.score >= 0.8).length);
      expect(s.explanation.assistedAttempts, s.skillId).toBe(mine.length - independent.length);
      expect(s.explanation.uniqueQuestions, s.skillId).toBe(new Set(mine.map((e) => e.questionId)).size);
      expect(s.lastEvidenceAt?.getTime()).toBe(Math.max(...mine.map((e) => e.occurredAt.getTime())));
    }
    const poly = states.find((s) => s.skillId === calc("chain-polynomial"))!;
    expect(poly.explanation.attempts).toBe(4);
    expect(["developing", "approaching"]).toContain(poly.level); // one unassisted correct answer is not proficiency

    const [detected] = await w.db.select().from(t.detectedMisconceptions).where(and(eq(t.detectedMisconceptions.userId, ada.id), eq(t.detectedMisconceptions.misconceptionId, OMIT_INNER)));
    expect(detected).toMatchObject({ status: "hypothesis", occurrences: 2, skillId: calc("chain-polynomial"), detectionMethod: "answer_pattern_rule" });

    // Each recalculation appended a snapshot; history is never rewritten.
    const snaps = await w.db.select().from(t.masterySnapshots).where(and(eq(t.masterySnapshots.userId, ada.id), eq(t.masterySnapshots.skillId, calc("chain-polynomial"))));
    expect(snaps.map((x) => x.evidenceCount).sort()).toEqual([1, 2, 3, 4]);
  });

  it("recommendations reflect the gap, and a fresh read returns the same persisted state", async () => {
    const ada = w.students.ada;
    const first = await getCourseOverview(ada, ada.id, "calculus-ab", c.now());
    const misconceptionRec = first.recommendations.find((r) => r.kind === "misconception");
    expect(misconceptionRec?.skillId).toBe(calc("chain-polynomial"));
    expect(misconceptionRec?.reason).toMatch(/omitted the derivative of the inner function/i);
    expect(first.misconceptions.find((m) => m.misconceptionId === OMIT_INNER)?.occurrences).toBe(2);
    expect(first.assessmentResults.get("calculus-ab.quiz.chain")).toMatchObject({ attempts: 1, bestScore: 3, maxScore: 6 });
    expect(first.lessonProgress.get(CHAIN_RULE_LESSON)?.status).toBe("in_progress");
    expect(first.recommendations.some((r) => r.kind === "continue_lesson")).toBe(true);
    // Skills answered wrongly on the quiz now have evidence (not "unknown").
    for (const skill of ["chain-trig", "chain-exp"]) expect(first.states.get(calc(skill))?.level).toBe("developing");

    const second = await getCourseOverview(ada, ada.id, "calculus-ab", c.now());
    const shape = (o: typeof first) => [...o.states.values()].map((s) => ({ skill: s.skillId, level: s.level, estimate: s.estimate, explanation: s.explanation })).sort((a, b) => a.skill.localeCompare(b.skill));
    expect(shape(second)).toEqual(shape(first));
    expect(second.recommendations.map((r) => r.id)).toEqual(first.recommendations.map((r) => r.id));
    // …and it is what the database holds.
    const stored = await stateOf(ada.id, calc("chain-polynomial"));
    expect(second.states.get(calc("chain-polynomial"))?.estimate).toBe(stored?.estimate);
    expect(lessonAttemptId && quizAttemptId).toBeTruthy();
  });
});

// ═══════════════════════════════════ Demo B ══════════════════════════════════

describe("Demo B — the teacher sees the same record", () => {
  it("the mastery matrix cell for the chain-rule objective matches the student's own rollup", async () => {
    const { ada, ben, quinn } = w.students;
    const teacher = w.teachers.northfield;
    const matrix = await getMasteryMatrix(teacher, w.classes.northCalc.id);
    const overview = await getCourseOverview(ada, ada.id, "calculus-ab", plus(T0, DAY));
    const cell = matrix.cells[ada.id]["calculus-ab.o.3b"];
    expect(cell.level).toBe(overview.rollups.objectives.get("calculus-ab.o.3b")!.level);
    expect(cell.skillsWithEvidence).toBe(overview.rollups.objectives.get("calculus-ab.o.3b")!.skillsWithEvidence);
    expect(matrix.cells[ben.id]["calculus-ab.o.3b"]).toMatchObject({ level: "not_started", skillsWithEvidence: 0 });
    expect(matrix.students.map((s) => s.id)).not.toContain(quinn.id);

    const bySkill = await getMasteryMatrix(teacher, w.classes.northCalc.id, { groupBy: "skill" });
    expect(bySkill.cells[ada.id][calc("chain-polynomial")].level).toBe((await stateOf(ada.id, calc("chain-polynomial")))!.level);
  });

  it("getSkillDetail through the teacher returns the attempts behind the level", async () => {
    const { ada } = w.students;
    const detail = await getSkillDetail(w.teachers.northfield, ada.id, calc("chain-polynomial"), { includeAnswers: true });
    const ev = await evidenceOf(ada.id, calc("chain-polynomial"));
    expect(detail.level).toBe((await stateOf(ada.id, calc("chain-polynomial")))!.level);
    expect(detail.evidence.map((e) => e.id).sort()).toEqual(ev.map((e) => e.id).sort());
    expect(new Set(detail.evidence.map((e) => e.mode))).toEqual(new Set(["lesson_check", "lesson_quiz"]));
    expect(detail.evidence.filter((e) => e.misconceptionTitle === "Omitted the derivative of the inner function")).toHaveLength(2);
    expect(detail.evidence.every((e) => e.correctAnswer !== undefined && e.response !== undefined)).toBe(true);
    expect(detail.history.length).toBe(ev.length);
  });

  it("a targeted assignment reaches the selected student only", async () => {
    const { ada, ben } = w.students;
    const assignment = await createAssignment(w.teachers.northfield, {
      classId: w.classes.northCalc.id,
      title: "Extra practice: chain rule with trig",
      kind: "skill_practice",
      skillIds: [calc("chain-trig")],
      studentIds: [ada.id],
      gradingMethod: "mastery",
    });
    const forAda = await asUser(ada, (tx) => listStudentAssignments(tx, ada.id, "calculus-ab"));
    const forBen = await asUser(ben, (tx) => listStudentAssignments(tx, ben.id, "calculus-ab"));
    expect(forAda.map((a) => a.id)).toContain(assignment.id);
    expect(forBen.map((a) => a.id)).not.toContain(assignment.id);
    // The database itself hides the row from the classmate…
    expect(await asUser(ben, (tx) => tx.select().from(t.assignments).where(eq(t.assignments.id, assignment.id)))).toHaveLength(0);
    // …and the service refuses to start it for them.
    await expect(startAttempt(ben.id, { kind: "assignment", assignmentId: assignment.id }, plus(T0, DAY))).rejects.toMatchObject({ code: "forbidden" });
    const overview = await getCourseOverview(ada, ada.id, "calculus-ab", plus(T0, DAY));
    expect(overview.recommendations[0]).toMatchObject({ kind: "assignment", id: `assignment:${assignment.id}` });
  });
});

// ═══════════════════════════════════ Demo C ══════════════════════════════════

describe("Demo C — completion is not mastery, time is honest, submits are idempotent", () => {
  it("completing a lesson without answering correctly creates no mastery evidence", async () => {
    const { dev, cleo } = w.students;
    const day = plus(T0, 2 * DAY);
    await startLesson(dev.id, "calculus-ab.l.composite", day);
    await completeLesson(dev.id, "calculus-ab.l.composite", plus(day, 10 * MINUTE));
    expect(await evidenceOf(dev.id)).toHaveLength(0);
    expect(await countRows(t.masteryStates, eq(t.masteryStates.userId, dev.id))).toBe(0);
    const overview = await getCourseOverview(dev, dev.id, "calculus-ab", plus(day, HOUR));
    expect(overview.lessonsCompleted).toBe(1);
    expect(overview.rollups.objectives.get("calculus-ab.o.3a")!.level).toBe("not_started");

    // A wrong check answer followed by completion: evidence of the miss only; completion adds nothing.
    await startLesson(cleo.id, "calculus-ab.l.composite", day);
    const { attemptId } = await startAttempt(cleo.id, { kind: "lesson", lessonId: "calculus-ab.l.composite" }, plus(day, MINUTE));
    await answerIncorrectly(attemptId, calcQ("cr-1"), { now: plus(day, 3 * MINUTE) });
    await completeLesson(cleo.id, "calculus-ab.l.composite", plus(day, 12 * MINUTE));
    const ev = await evidenceOf(cleo.id);
    expect(ev).toHaveLength(1);
    expect(ev[0].score).toBe(0);
    expect((await stateOf(cleo.id, calc("composite-recognize")))?.level).toBe("developing");
    expect(await stateOf(cleo.id, calc("inner-outer"))).toBeNull();
  });

  it("idle stretches are excluded from active time and forged heartbeats are clamped", async () => {
    const { ben, ada } = w.students;
    const start = plus(T0, 2 * DAY + HOUR);
    const s0 = start.getTime();
    const sessionId = await startLearningSession(ben.id, { activityKind: "lesson", courseId: "calculus-ab", activityId: "calculus-ab.l.rules" }, start);
    const meter = new ActiveTimeMeter(DEFAULT_IDLE_THRESHOLD_MS, s0);
    let open = 0;
    let active = 0;
    // 0–120 s: interacting every 10 s · 120–430 s: tab visible, no interaction · 430–480 s: interacting again.
    for (let elapsed = SECOND; elapsed <= 480 * SECOND; elapsed += SECOND) {
      const interacting = (elapsed <= 120 * SECOND || elapsed >= 430 * SECOND) && elapsed % (10 * SECOND) === 0;
      if (interacting) meter.interaction(s0 + elapsed);
      else meter.tick(s0 + elapsed);
      if (elapsed % (30 * SECOND) === 0) {
        const delta = meter.drain();
        const accepted = await recordHeartbeat(ben.id, { sessionId, ...delta }, new Date(s0 + elapsed));
        expect(accepted).toEqual(delta); // honest heartbeats are accepted as sent
        open += accepted.openMs;
        active += accepted.activeMs;
      }
    }
    expect(open).toBe(480_000);
    // 120 s of interaction + the 60 s idle threshold after the last one + 50 s after resuming.
    expect(active).toBe(230_000);

    // A forged heartbeat claiming an hour, sent 10 s after the last one.
    const forged = await recordHeartbeat(ben.id, { sessionId, openMs: 3_600_000, activeMs: 3_600_000 }, new Date(s0 + 490 * SECOND));
    expect(forged.openMs).toBeLessThanOrEqual(12_000);
    expect(forged.activeMs).toBeLessThanOrEqual(forged.openMs);
    // Someone else's session cannot be fed at all.
    await expect(recordHeartbeat(ada.id, { sessionId, openMs: 1000, activeMs: 1000 }, new Date(s0 + 495 * SECOND))).rejects.toMatchObject({ code: "not_found" });

    const [session] = await w.db.select().from(t.learningSessions).where(eq(t.learningSessions.id, sessionId));
    expect(session).toMatchObject({ openMs: 480_000 + forged.openMs, activeMs: 230_000 + forged.activeMs });
    const engagement = await getClassEngagement(w.teachers.northfield, w.classes.northCalc.id, 14, plus(start, HOUR));
    expect(engagement.students[ben.id]).toMatchObject({ activeMs: 230_000 + forged.activeMs, openMs: 480_000 + forged.openMs });
    expect(engagement.students[ben.id].byKind.lesson).toBe(230_000 + forged.activeMs);
  });

  it("double-submitting the same idempotency key records one response and one evidence row", async () => {
    const { ben } = w.students;
    const at = plus(T0, 3 * DAY);
    const { attemptId } = await startAttempt(ben.id, { kind: "practice", skillId: calc("chain-exp"), count: 3 }, at);
    const qid = (await attemptRow(attemptId)).items[0].questionId;
    const first = await answerCorrectly(attemptId, qid, { now: plus(at, MINUTE), idempotencyKey: "double-tap-1" });
    const second = await answerCorrectly(attemptId, qid, { now: plus(at, MINUTE + 300), idempotencyKey: "double-tap-1" });
    expect(first).toMatchObject({ status: "graded", duplicate: false, feedback: { correct: true } });
    expect(second).toMatchObject({ status: "graded", duplicate: true, mastery: [], feedback: { correct: true } });

    const responses = await w.db.select().from(t.questionResponses).where(and(eq(t.questionResponses.attemptId, attemptId), eq(t.questionResponses.questionId, qid)));
    expect(responses).toHaveLength(1);
    const skills = await w.db.select().from(t.questionSkills).where(eq(t.questionSkills.questionId, qid));
    const ev = await w.db.select().from(t.masteryEvidence).where(eq(t.masteryEvidence.responseId, responses[0].id));
    expect(ev).toHaveLength(skills.length);
    expect(new Set(ev.map((e) => e.skillId)).size).toBe(ev.length);
    expect(await countRows(t.learningEvents, and(eq(t.learningEvents.userId, ben.id), eq(t.learningEvents.type, "QUESTION_SUBMITTED"), eq(t.learningEvents.activityId, attemptId)))).toBe(1);
    expect(await countRows(t.masterySnapshots, and(eq(t.masterySnapshots.userId, ben.id), eq(t.masterySnapshots.skillId, calc("chain-exp"))))).toBe(1);
  });
});


// ═══════════════════════════════════ Demo E ══════════════════════════════════

describe("Demo E — simulations (service side)", () => {
  it("a simulation-stimulus question answered correctly creates evidence", async () => {
    const { cleo } = w.students;
    const at = plus(T0, 4 * DAY);
    const { attemptId } = await startAttempt(cleo.id, { kind: "lesson", lessonId: "calculus-ab.l.chain-using" }, at);
    const view = await getAttemptView(cleo.id, attemptId, plus(at, MINUTE));
    const simQuestion = view.questions.find((q) => q.stimulus?.simulation.id === "derivative-explorer");
    expect(simQuestion?.id).toBe(calcQ("ci-7"));
    const r = await answerCorrectly(attemptId, calcQ("ci-7"), { now: plus(at, 5 * MINUTE) });
    expect(r).toMatchObject({ status: "graded", feedback: { correct: true } });
    const ev = await w.db.select().from(t.masteryEvidence).where(and(eq(t.masteryEvidence.userId, cleo.id), eq(t.masteryEvidence.questionId, calcQ("ci-7"))));
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ skillId: calc("chain-interpret"), score: 1, mode: "lesson_check" });
    expect((await stateOf(cleo.id, calc("chain-interpret")))?.explanation.independentCorrect).toBe(1);
  });

  it("interacting with a simulation on its own creates no evidence", async () => {
    const { dev } = w.students;
    const at = plus(T0, 4 * DAY + HOUR);
    const before = { evidence: (await evidenceOf(dev.id)).length, states: await countRows(t.masteryStates, eq(t.masteryStates.userId, dev.id)) };
    for (let i = 0; i < 5; i++)
      await logEvent(w.db, { userId: dev.id, type: "SIMULATION_INTERACTED", courseId: "calculus-ab", activityType: "simulation", activityId: "derivative-explorer", payload: { control: "point", value: i / 4 }, occurredAt: plus(at, i * 20 * SECOND) });
    const sessionId = await startLearningSession(dev.id, { activityKind: "simulation", courseId: "calculus-ab", activityId: "derivative-explorer" }, at);
    await recordHeartbeat(dev.id, { sessionId, openMs: 60_000, activeMs: 55_000 }, plus(at, MINUTE));

    expect(await countRows(t.learningEvents, and(eq(t.learningEvents.userId, dev.id), eq(t.learningEvents.type, "SIMULATION_INTERACTED")))).toBe(5);
    expect((await evidenceOf(dev.id)).length).toBe(before.evidence);
    expect(before.evidence).toBe(0);
    expect(await countRows(t.masteryStates, eq(t.masteryStates.userId, dev.id))).toBe(before.states);
    expect(await countRows(t.masterySnapshots, eq(t.masterySnapshots.userId, dev.id))).toBe(0);
  });
});

// ═══════════════════════════════ Retention / review ══════════════════════════

describe("Retention — course review", () => {
  it("picks due skills and marks their evidence as retention review", async () => {
    const { quinn } = w.students;
    const day0 = plus(T0, 5 * DAY);
    const practiseAll = async (skillId: string, at: Date) => {
      const { attemptId } = await startAttempt(quinn.id, { kind: "practice", skillId, count: 5 }, at);
      let n = 0;
      for (const item of (await attemptRow(attemptId)).items) await answerCorrectly(attemptId, item.questionId, { now: plus(at, ++n * MINUTE) });
      await submitAttempt(quinn.id, attemptId, plus(at, 10 * MINUTE));
    };
    await practiseAll(calc("power-rule"), day0);
    await practiseAll(calc("basic-derivatives"), plus(day0, 15 * MINUTE));
    const quiz = await startAttempt(quinn.id, { kind: "assessment", assessmentId: "calculus-ab.quiz.rules" }, plus(day0, 30 * MINUTE));
    for (const item of (await attemptRow(quiz.attemptId)).items) await answerCorrectly(quiz.attemptId, item.questionId, { now: plus(day0, 35 * MINUTE) });
    await submitAttempt(quinn.id, quiz.attemptId, plus(day0, 45 * MINUTE));
    await practiseAll(calc("power-rule"), plus(day0, HOUR));
    await practiseAll(calc("basic-derivatives"), plus(day0, HOUR + 15 * MINUTE));
    // Some non-proficient skills too, so the review has items that are not due.
    const lesson = await startAttempt(quinn.id, { kind: "lesson", lessonId: "calculus-ab.l.composite" }, plus(day0, 2 * HOUR));
    for (const item of (await attemptRow(lesson.attemptId)).items) await answerCorrectly(lesson.attemptId, item.questionId, { now: plus(day0, 2 * HOUR + 5 * MINUTE) });

    const powerRule = await stateOf(quinn.id, calc("power-rule"));
    expect(["proficient", "mastered"]).toContain(powerRule?.level);

    const reviewAt = plus(day0, 4 * DAY);
    const schedules = await w.db.select().from(t.reviewSchedule).where(eq(t.reviewSchedule.userId, quinn.id));
    const due = schedules.filter((s) => s.dueAt.getTime() <= reviewAt.getTime()).map((s) => s.skillId).sort();
    expect(due).toContain(calc("power-rule"));

    const { attemptId } = await startAttempt(quinn.id, { kind: "review", courseId: "calculus-ab", count: 8 }, reviewAt);
    const attempt = await attemptRow(attemptId);
    expect(attempt.mode).toBe("course_review");
    expect([...attempt.reviewSkillIds].sort()).toEqual(due);
    const itemSkills = await Promise.all(attempt.items.map(async (i) => (await question(i.questionId)).skillId));
    for (const skill of due) expect(itemSkills).toContain(skill);
    // Due skills come first in the rotation.
    expect(due).toContain(itemSkills[0]);
    expect(itemSkills.some((s) => !due.includes(s))).toBe(true);

    let n = 0;
    for (const item of attempt.items) await answerCorrectly(attemptId, item.questionId, { now: plus(reviewAt, ++n * MINUTE) });
    await submitAttempt(quinn.id, attemptId, plus(reviewAt, 15 * MINUTE));

    const ev = await w.db.select().from(t.masteryEvidence).where(eq(t.masteryEvidence.attemptId, attemptId));
    expect(ev.length).toBe(attempt.items.length);
    for (const e of ev) expect(e.isRetentionReview, e.skillId).toBe(due.includes(e.skillId));
    expect(ev.every((e) => e.mode === "course_review")).toBe(true);

    // A successful on-time review advances the schedule.
    const after = await w.db.select().from(t.reviewSchedule).where(and(eq(t.reviewSchedule.userId, quinn.id), inArray(t.reviewSchedule.skillId, due)));
    for (const s of after) {
      expect(s.stage, s.skillId).toBe(1);
      expect(s.dueAt.getTime()).toBeGreaterThan(reviewAt.getTime());
    }
  });
});

// ═══════════════════════════════════ Demo F ══════════════════════════════════

describe("Demo F — publishing a mastery policy", () => {
  it("creates a new version, keeps old snapshots and never alters question_responses", async () => {
    const db = w.db;
    const previous = await ensureDefaultPolicy(db);
    const responsesBefore = await db.select().from(t.questionResponses).orderBy(asc(t.questionResponses.id));
    const snapshotsBefore = await db.select().from(t.masterySnapshots).orderBy(asc(t.masterySnapshots.id));
    const evidenceBefore = await db.select().from(t.masteryEvidence).orderBy(asc(t.masteryEvidence.id));
    expect(responsesBefore.length).toBeGreaterThan(20);

    const stricter: MasteryPolicyConfig = structuredClone(DEFAULT_MASTERY_POLICY);
    stricter.levels.proficient.minEstimate = 0.8;
    stricter.levels.mastered.minEstimate = 0.9;
    const { policy, recalculated } = await publishPolicy(db, { organizationId: null, name: "Stricter default", config: stricter, createdBy: w.admin.id, now: plus(T0, 30 * DAY) });

    expect(policy.version).toBe(previous.version + 1);
    const platform = await db.select().from(t.masteryPolicies).where(inArray(t.masteryPolicies.id, [previous.id, policy.id]));
    expect(platform.find((p) => p.id === previous.id)).toMatchObject({ isActive: false, version: previous.version });
    expect(platform.find((p) => p.id === policy.id)).toMatchObject({ isActive: true, version: previous.version + 1 });

    // Observations are untouched.
    expect(await db.select().from(t.questionResponses).orderBy(asc(t.questionResponses.id))).toEqual(responsesBefore);
    expect(await db.select().from(t.masteryEvidence).orderBy(asc(t.masteryEvidence.id))).toEqual(evidenceBefore);

    // History is appended, never rewritten.
    const snapshotsAfter = await db.select().from(t.masterySnapshots).orderBy(asc(t.masterySnapshots.id));
    const old = snapshotsAfter.filter((s) => snapshotsBefore.some((b) => b.id === s.id));
    expect(old).toEqual(snapshotsBefore);
    const added = snapshotsAfter.filter((s) => !snapshotsBefore.some((b) => b.id === s.id));
    expect(added).toHaveLength(recalculated);
    expect(added.every((s) => s.trigger === "policy_change" && s.policyId === policy.id && s.policyVersion === policy.version)).toBe(true);

    const states = await db.select().from(t.masteryStates);
    expect(states.length).toBe(recalculated);
    expect(states.every((s) => s.policyId === policy.id && s.policyVersion === policy.version)).toBe(true);
    expect(await countRows(t.auditLogs, and(eq(t.auditLogs.action, "mastery_policy.published"), eq(t.auditLogs.entityId, policy.id)))).toBe(1);
  });
});
