import { describe, expect, it } from "vitest";
import { computeSkillMastery, computeWeights, isIndependent } from "@/modules/mastery/engine";
import { DEFAULT_MASTERY_POLICY, parseMasteryPolicy } from "@/modules/mastery/policy";
import { rollup, studentStatus } from "@/modules/mastery/aggregation";
import { scheduleAfterEvidence } from "@/modules/mastery/retention";
import type { EvidenceItem, EvidenceMode, MasteryPolicyConfig } from "@/modules/mastery/types";

const policy = DEFAULT_MASTERY_POLICY;
const T0 = new Date("2026-09-01T15:00:00Z").getTime();
const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const now = new Date(T0 + 30 * DAY);

let seq = 0;
function ev(over: Partial<EvidenceItem> & { q: string; at?: number }): EvidenceItem {
  seq += 1;
  const { q, at, ...rest } = over;
  return {
    id: `e${String(seq).padStart(4, "0")}`,
    questionId: q,
    pattern: "p1",
    score: 1,
    difficulty: 3,
    mode: "skill_quiz" as EvidenceMode,
    attemptId: "a1",
    tryNumber: 1,
    hintsUsed: 0,
    solutionViewed: false,
    tutorUsed: false,
    isRetentionReview: false,
    occurredAt: new Date(T0 + (at ?? seq) * MIN),
    ...rest,
  };
}
const compute = (items: EvidenceItem[], p: MasteryPolicyConfig = policy) => computeSkillMastery(items, p, { now });

describe("mastery estimator", () => {
  it("starts at Not Started with the prior and no evidence", () => {
    const r = compute([]);
    expect(r.level).toBe("not_started");
    expect(r.estimate).toBeCloseTo(0.5);
    expect(r.explanation.attempts).toBe(0);
    expect(r.needsReview).toBe(false);
  });

  it("1. correct independent answers increase mastery", () => {
    const one = compute([ev({ q: "q1" })]);
    const three = compute([ev({ q: "q1" }), ev({ q: "q2" }), ev({ q: "q3" })]);
    expect(one.estimate).toBeGreaterThan(0.5);
    expect(three.estimate).toBeGreaterThan(one.estimate);
    // alpha = 1 + 3 weighted corrects (recency-discounted), beta = 1
    expect(three.alpha).toBeGreaterThan(3.8);
    expect(three.beta).toBeCloseTo(1);
  });

  it("2. incorrect answers lower the estimate", () => {
    const base = [ev({ q: "q1" }), ev({ q: "q2" })];
    const after = compute([...base, ev({ q: "q3", score: 0 })]);
    expect(after.estimate).toBeLessThan(compute(base).estimate);
    expect(after.beta).toBeGreaterThan(1.9);
  });

  it("3. hinted answers receive limited credit", () => {
    const independent = compute([ev({ q: "q1" })]);
    const oneHint = compute([ev({ q: "q1", hintsUsed: 1 })]);
    const twoHints = compute([ev({ q: "q1", hintsUsed: 2 })]);
    const solution = compute([ev({ q: "q1", solutionViewed: true })]);
    const tutor = compute([ev({ q: "q1", tutorUsed: true })]);
    expect(oneHint.estimate).toBeLessThan(independent.estimate);
    expect(twoHints.estimate).toBeLessThan(oneHint.estimate);
    expect(solution.estimate).toBeLessThan(twoHints.estimate);
    expect(tutor.estimate).toBeLessThan(independent.estimate);
    expect(oneHint.explanation.independentCorrect).toBe(0);
    expect(oneHint.explanation.assistedAttempts).toBe(1);
  });

  it("3b. a fully assisted perfect record never reaches Proficient", () => {
    const items = Array.from({ length: 12 }, (_, i) => ev({ q: `q${i}`, pattern: `p${i % 3}`, hintsUsed: 2, attemptId: `a${i % 3}` }));
    const r = compute(items);
    expect(["developing", "approaching"]).toContain(r.level);
    expect(r.explanation.independentCorrect).toBe(0);
  });

  it("4. repeating the same item cannot manufacture mastery", () => {
    const items = Array.from({ length: 30 }, (_, i) => ev({ q: "same", attemptId: `a${i}` }));
    const r = compute(items);
    expect(r.level).not.toBe("proficient");
    expect(r.level).not.toBe("mastered");
    expect(r.explanation.uniqueQuestionsCorrect).toBe(1);
    // Exposure weights fall off quickly: the 4th+ repetition is worth a tenth.
    const w = computeWeights(items, policy);
    expect(w[10].positive).toBeLessThan(w[0].positive * 0.25);
  });

  it("4b. retrying after feedback is heavily discounted", () => {
    const first = ev({ q: "q1", score: 0 });
    const retry = ev({ q: "q1", tryNumber: 2 });
    const r = compute([first, retry]);
    expect(isIndependent(retry)).toBe(false);
    expect(r.estimate).toBeLessThan(0.5);
    expect(r.explanation.independentCorrect).toBe(0);
  });

  it("5. insufficient evidence does not qualify as Mastered or Proficient", () => {
    const two = compute([ev({ q: "q1", mode: "unit_test", difficulty: 5 }), ev({ q: "q2", mode: "unit_test", difficulty: 5 })]);
    expect(two.estimate).toBeGreaterThan(0.75);
    expect(two.level).toBe("approaching");
    expect(two.explanation.unmet.length).toBeGreaterThan(0);
  });

  it("reaches Proficient with enough independent, varied evidence", () => {
    const r = compute([ev({ q: "q1" }), ev({ q: "q2" }), ev({ q: "q3" }), ev({ q: "q4" })]);
    expect(r.level).toBe("proficient");
    expect(r.explanation.nextLevel).toBe("mastered");
  });

  it("Mastered needs pattern diversity, a second sitting and summative evidence", () => {
    const sameSitting = Array.from({ length: 8 }, (_, i) => ev({ q: `q${i}`, pattern: "p1", attemptId: "a1" }));
    expect(compute(sameSitting).level).toBe("proficient");

    const varied = [
      ...Array.from({ length: 4 }, (_, i) => ev({ q: `q${i}`, pattern: "p1", attemptId: "a1" })),
      ...Array.from({ length: 3 }, (_, i) => ev({ q: `r${i}`, pattern: "p2", attemptId: "a2" })),
    ];
    expect(compute(varied).level).toBe("mastered");

    const practiceOnly = varied.map((e) => ({ ...e, mode: "guided_practice" as EvidenceMode }));
    const r = compute(practiceOnly);
    expect(r.level).not.toBe("mastered");
    expect(r.explanation.unmet.join(" ")).toContain("quiz or test");
  });

  it("10. reassessment can change an earlier proficiency state", () => {
    const strong = [ev({ q: "q1" }), ev({ q: "q2" }), ev({ q: "q3" }), ev({ q: "q4" })];
    expect(compute(strong).level).toBe("proficient");
    const later = [
      ...strong,
      ev({ q: "q5", score: 0, mode: "unit_test", attemptId: "a2" }),
      ev({ q: "q6", score: 0, mode: "unit_test", attemptId: "a2" }),
      ev({ q: "q7", score: 0, mode: "unit_test", attemptId: "a2" }),
    ];
    const r = compute(later);
    expect(["developing", "approaching"]).toContain(r.level);
    expect(r.needsReview).toBe(true);
    expect(r.explanation.reviewReason).toBe("dropped_below_proficient");
    expect(r.explanation.peakLevel).toBe("proficient");
  });

  it("9. engagement time is not an input: only graded evidence moves the estimate", () => {
    // The engine's only input is EvidenceItem[] — there is no time-on-task field.
    const a = compute([ev({ q: "q1", at: 1 })]);
    const b = compute([ev({ q: "q1", at: 600 })]);
    expect(a.estimate).toBeCloseTo(b.estimate, 10);
  });

  it("elapsed time alone never lowers an estimate (recency is per later item)", () => {
    const items = [ev({ q: "q1", at: 1 }), ev({ q: "q2", at: 2 }), ev({ q: "q3", at: 3 }), ev({ q: "q4", at: 4 })];
    const soon = computeSkillMastery(items, policy, { now: new Date(T0 + DAY) });
    const muchLater = computeSkillMastery(items, policy, { now: new Date(T0 + 400 * DAY) });
    expect(muchLater.estimate).toBe(soon.estimate);
    expect(muchLater.level).toBe(soon.level);
  });

  it("a scheduled review raises a flag without reducing mastery", () => {
    const items = [ev({ q: "q1" }), ev({ q: "q2" }), ev({ q: "q3" }), ev({ q: "q4" })];
    const due = computeSkillMastery(items, policy, { now, reviewDueAt: new Date(now.getTime() - DAY) });
    const notDue = computeSkillMastery(items, policy, { now, reviewDueAt: new Date(now.getTime() + DAY) });
    expect(due.needsReview).toBe(true);
    expect(due.explanation.reviewReason).toBe("scheduled_review_due");
    expect(due.estimate).toBe(notDue.estimate);
    expect(due.level).toBe(notDue.level);
    expect(notDue.needsReview).toBe(false);
  });

  it("harder and more reliable contexts carry more weight, within bounds", () => {
    const easyPractice = compute([ev({ q: "q1", mode: "guided_practice", difficulty: 1 })]);
    const hardTest = compute([ev({ q: "q1", mode: "unit_test", difficulty: 5 })]);
    expect(hardTest.estimate).toBeGreaterThan(easyPractice.estimate);
    for (const w of hardTest.weights) expect(w.positive).toBeLessThanOrEqual(policy.maxItemWeight);
  });

  it("is deterministic and order-independent for the same evidence set", () => {
    const items = [ev({ q: "q1" }), ev({ q: "q2", score: 0 }), ev({ q: "q3", hintsUsed: 1 }), ev({ q: "q4" })];
    const a = compute(items);
    const b = compute([...items].reverse());
    expect(b.estimate).toBe(a.estimate);
    expect(b.level).toBe(a.level);
    expect(b.explanation).toEqual(a.explanation);
  });

  it("explains itself with counts derived from the evidence", () => {
    const items = [
      ev({ q: "q1", pattern: "poly" }),
      ev({ q: "q2", pattern: "poly" }),
      ev({ q: "q3", pattern: "trig", score: 0 }),
      ev({ q: "q4", pattern: "trig", score: 0 }),
      ev({ q: "q5", pattern: "poly", hintsUsed: 1 }),
    ];
    const x = compute(items).explanation;
    expect(x.attempts).toBe(5);
    expect(x.independentAttempts).toBe(4);
    expect(x.independentCorrect).toBe(2);
    expect(x.assistedAttempts).toBe(1);
    expect(x.uniqueQuestions).toBe(5);
    expect(x.weakestPattern).toBe("trig");
    expect(x.summary).toContain("2 of 4 answers correct without help");
    expect(x.lastDemonstratedAt).not.toBeNull();
  });
});

describe("mastery policy", () => {
  it("6. a stricter policy changes the classification of the same evidence", () => {
    const items = [ev({ q: "q1" }), ev({ q: "q2" }), ev({ q: "q3" }), ev({ q: "q4" })];
    const strict: MasteryPolicyConfig = {
      ...policy,
      levels: { ...policy.levels, proficient: { ...policy.levels.proficient, minIndependentCorrect: 8, minUniqueQuestionsCorrect: 8 } },
    };
    expect(compute(items, policy).level).toBe("proficient");
    expect(compute(items, strict).level).toBe("approaching");
  });

  it("rejects incoherent policies", () => {
    expect(() => parseMasteryPolicy(policy)).not.toThrow();
    const bad = { ...policy, levels: { ...policy.levels, mastered: { ...policy.levels.mastered, minEstimate: 0.6 } } };
    expect(() => parseMasteryPolicy(bad)).toThrow();
    expect(() => parseMasteryPolicy({ ...policy, maxItemWeight: 50 })).toThrow();
  });
});

describe("aggregation", () => {
  const s = (skillId: string, level: Parameters<typeof studentStatus>[0], needsReview = false) => ({ skillId, level, estimate: 0.9, needsReview });

  it("8. unattempted skills are never represented as mastered", () => {
    const r = rollup(["a", "b", "c", "d", "e"], [s("a", "mastered")]);
    expect(r.level).toBe("developing");
    expect(r.masteryShare).toBeCloseTo(0.2);
    expect(r.coverage).toBeCloseTo(0.2);
    expect(r.counts.not_started).toBe(4);
  });

  it("a scope with missing evidence caps below Proficient even when most skills are strong", () => {
    const r = rollup(["a", "b", "c"], [s("a", "mastered"), s("b", "mastered")]);
    expect(r.level).toBe("approaching");
  });

  it("with full coverage the scope takes its weakest skill's level", () => {
    expect(rollup(["a", "b"], [s("a", "mastered"), s("b", "proficient")]).level).toBe("proficient");
    expect(rollup(["a", "b"], [s("a", "mastered"), s("b", "developing")]).level).toBe("developing");
    expect(rollup(["a"], []).level).toBe("not_started");
    expect(rollup([], []).level).toBe("not_started");
  });

  it("maps levels to student-facing statuses", () => {
    expect(studentStatus("not_started", false)).toBe("not_started");
    expect(studentStatus("developing", false)).toBe("in_progress");
    expect(studentStatus("approaching", false)).toBe("in_progress");
    expect(studentStatus("proficient", false)).toBe("proficient");
    expect(studentStatus("mastered", true)).toBe("needs_review");
  });
});

describe("retention schedule", () => {
  it("is created only once a skill is Proficient", () => {
    expect(scheduleAfterEvidence(null, ev({ q: "q1" }), "developing", policy)).toBeNull();
    const first = scheduleAfterEvidence(null, ev({ q: "q1", at: 0 }), "proficient", policy);
    expect(first?.stage).toBe(0);
    expect(first!.dueAt.getTime()).toBe(T0 + 3 * DAY);
  });

  it("advances on a successful review when due, not on early practice", () => {
    const current = { stage: 0, dueAt: new Date(T0 + 3 * DAY), lastReviewedAt: null };
    const early = scheduleAfterEvidence(current, ev({ q: "q2", at: 60 }), "proficient", policy);
    expect(early).toEqual(current);
    const onTime = scheduleAfterEvidence(current, ev({ q: "q3", at: (4 * DAY) / MIN }), "proficient", policy);
    expect(onTime?.stage).toBe(1);
    expect(onTime!.dueAt.getTime()).toBe(T0 + 4 * DAY + 7 * DAY);
  });

  it("a missed review brings the next one forward; assisted work is ignored", () => {
    const current = { stage: 2, dueAt: new Date(T0 + 16 * DAY), lastReviewedAt: null };
    const missed = scheduleAfterEvidence(current, ev({ q: "q4", score: 0, at: 0 }), "proficient", policy);
    expect(missed?.stage).toBe(0);
    expect(missed!.dueAt.getTime()).toBe(T0 + DAY);
    const assisted = scheduleAfterEvidence(current, ev({ q: "q5", hintsUsed: 1, at: (20 * DAY) / MIN }), "proficient", policy);
    expect(assisted).toEqual(current);
  });
});
