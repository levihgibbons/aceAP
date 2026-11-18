/**
 * AceAP mastery engine — a transparent, deterministic, evidence-weighted
 * estimator. Pure functions only.
 *
 *   alpha ← alpha + w⁺ · y        beta ← beta + w⁻ · (1 − y)
 *   estimate = alpha / (alpha + beta)
 *
 * where y ∈ [0,1] is the score and w⁺ / w⁻ are bounded evidence weights. The
 * estimate is an evidence summary, not a validated probability that a student
 * "knows" something; labels additionally require evidence sufficiency and
 * diversity (see `classify`). Full specification: docs/MASTERY_ENGINE.md.
 */
import {
  LEVEL_LABEL,
  LEVEL_RANK,
  SUMMATIVE_MODES,
  type AppliedWeight,
  type EvidenceItem,
  type LevelRequirements,
  type MasteryLevel,
  type MasteryPolicyConfig,
  type PatternStat,
  type ReviewReason,
  type SkillExplanation,
  type SkillMasteryResult,
} from "./types";

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** An answer given on the first try with no hint, tutor or revealed solution. */
export function isIndependent(e: EvidenceItem): boolean {
  return e.tryNumber === 1 && e.hintsUsed === 0 && !e.solutionViewed && !e.tutorUsed;
}

function assistanceFactor(e: EvidenceItem, policy: MasteryPolicyConfig): number {
  let f = 1;
  if (e.hintsUsed === 1) f = Math.min(f, policy.assistance.oneHint);
  if (e.hintsUsed >= 2) f = Math.min(f, policy.assistance.multipleHints);
  if (e.tutorUsed) f = Math.min(f, policy.assistance.tutor);
  if (e.solutionViewed) f = Math.min(f, policy.assistance.solutionViewed);
  return f;
}

function sortChronologically(evidence: EvidenceItem[]): EvidenceItem[] {
  return [...evidence].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime() || a.id.localeCompare(b.id));
}

/** Weight of each evidence item given everything that came before/after it. */
export function computeWeights(sorted: EvidenceItem[], policy: MasteryPolicyConfig): AppliedWeight[] {
  const seen = new Map<string, number>();
  const n = sorted.length;
  return sorted.map((e, i) => {
    const exposures = seen.get(e.questionId) ?? 0;
    seen.set(e.questionId, exposures + 1);

    const difficulty = policy.difficultyWeights[clamp(Math.round(e.difficulty), 1, 5) - 1];
    const base = (policy.modeWeights[e.mode] ?? 1) * difficulty;
    const exposure = policy.repeatExposure[Math.min(exposures, policy.repeatExposure.length - 1)];
    const retry = e.tryNumber > 1 ? policy.retryAfterFeedback : 1;
    const recency = Math.max(policy.recencyFloor, Math.pow(policy.recencyDecayPerLaterItem, n - 1 - i));

    const positive = clamp(base * exposure * retry * assistanceFactor(e, policy) * recency, 0, policy.maxItemWeight);
    const negative = clamp(base * Math.max(exposure * retry, policy.minNegativeFactor) * recency, 0, policy.maxItemWeight);
    return { evidenceId: e.id, positive, negative, independent: isIndependent(e) };
  });
}

interface Counts {
  attempts: number;
  independentAttempts: number;
  independentCorrect: number;
  assistedAttempts: number;
  uniqueQuestions: number;
  uniqueQuestionsCorrect: number;
  distinctPatternsCorrect: number;
  summativeIndependentCorrect: number;
  distinctSittings: number;
  patterns: PatternStat[];
  lastDemonstratedAt: Date | null;
}

function count(sorted: EvidenceItem[], policy: MasteryPolicyConfig): Counts {
  const questions = new Set<string>();
  const questionsCorrect = new Set<string>();
  const patternsCorrect = new Set<string>();
  const sittings = new Set<string>();
  const patterns = new Map<string, PatternStat>();
  let independentAttempts = 0;
  let independentCorrect = 0;
  let summativeIndependentCorrect = 0;
  let lastDemonstratedAt: Date | null = null;

  for (const e of sorted) {
    questions.add(e.questionId);
    const stat = patterns.get(e.pattern) ?? { pattern: e.pattern, attempts: 0, independentAttempts: 0, independentCorrect: 0 };
    stat.attempts += 1;
    if (isIndependent(e)) {
      independentAttempts += 1;
      stat.independentAttempts += 1;
      if (e.score >= policy.correctThreshold) {
        independentCorrect += 1;
        stat.independentCorrect += 1;
        questionsCorrect.add(e.questionId);
        patternsCorrect.add(e.pattern);
        sittings.add(e.attemptId);
        lastDemonstratedAt = e.occurredAt;
        if (SUMMATIVE_MODES.has(e.mode)) summativeIndependentCorrect += 1;
      }
    }
    patterns.set(e.pattern, stat);
  }

  return {
    attempts: sorted.length,
    independentAttempts,
    independentCorrect,
    assistedAttempts: sorted.length - independentAttempts,
    uniqueQuestions: questions.size,
    uniqueQuestionsCorrect: questionsCorrect.size,
    distinctPatternsCorrect: patternsCorrect.size,
    summativeIndependentCorrect,
    distinctSittings: sittings.size,
    patterns: [...patterns.values()],
    lastDemonstratedAt,
  };
}

function unmetRequirements(req: LevelRequirements, estimate: number, effective: number, c: Counts): string[] {
  const out: string[] = [];
  const more = (n: number, one: string, many: string) => `${n} more ${n === 1 ? one : many}`;
  if (estimate < req.minEstimate) out.push("a stronger record of correct answers");
  if (effective < req.minEffectiveEvidence) out.push("more graded evidence overall");
  if (c.independentCorrect < req.minIndependentCorrect)
    out.push(more(req.minIndependentCorrect - c.independentCorrect, "correct answer without help", "correct answers without help"));
  if (c.uniqueQuestionsCorrect < req.minUniqueQuestionsCorrect)
    out.push(more(req.minUniqueQuestionsCorrect - c.uniqueQuestionsCorrect, "different question answered correctly", "different questions answered correctly"));
  if (c.distinctPatternsCorrect < req.minDistinctPatternsCorrect)
    out.push(more(req.minDistinctPatternsCorrect - c.distinctPatternsCorrect, "different type of problem", "different types of problem"));
  if (c.summativeIndependentCorrect < req.minSummativeIndependentCorrect)
    out.push("a correct answer on a quiz or test (not guided practice)");
  if (c.distinctSittings < req.minDistinctSittings)
    out.push(more(req.minDistinctSittings - c.distinctSittings, "separate sitting with a correct answer", "separate sittings with a correct answer"));
  return out;
}

function meets(req: LevelRequirements, estimate: number, effective: number, c: Counts): boolean {
  return unmetRequirements(req, estimate, effective, c).length === 0;
}

/** Map an estimate + evidence counts to a level. High scores alone are not enough. */
export function classify(estimate: number, effective: number, c: Counts, policy: MasteryPolicyConfig): MasteryLevel {
  if (c.attempts === 0) return "not_started";
  if (meets(policy.levels.mastered, estimate, effective, c)) return "mastered";
  if (meets(policy.levels.proficient, estimate, effective, c)) return "proficient";
  const a = policy.levels.approaching;
  if (estimate >= a.minEstimate && effective >= a.minEffectiveEvidence) return "approaching";
  return "developing";
}

interface CoreResult {
  alpha: number;
  beta: number;
  estimate: number;
  effective: number;
  level: MasteryLevel;
  counts: Counts;
  weights: AppliedWeight[];
}

function core(sorted: EvidenceItem[], policy: MasteryPolicyConfig): CoreResult {
  const weights = computeWeights(sorted, policy);
  let alpha = policy.prior.alpha;
  let beta = policy.prior.beta;
  let effective = 0;
  sorted.forEach((e, i) => {
    const y = clamp(e.score, 0, 1);
    const up = weights[i].positive * y;
    const down = weights[i].negative * (1 - y);
    alpha += up;
    beta += down;
    effective += up + down;
  });
  const estimate = alpha / (alpha + beta);
  const counts = count(sorted, policy);
  return { alpha, beta, estimate, effective, level: classify(estimate, effective, counts, policy), counts, weights };
}

function weakestPattern(patterns: PatternStat[]): string | null {
  const judged = patterns.filter((p) => p.independentAttempts >= 2);
  if (judged.length === 0) return null;
  const rate = (p: PatternStat) => p.independentCorrect / p.independentAttempts;
  const worst = judged.reduce((a, b) => (rate(b) < rate(a) ? b : a));
  const best = patterns.reduce((m, p) => Math.max(m, p.independentAttempts ? rate(p) : 0), 0);
  // Only call out a pattern when it is genuinely weak, not merely the lowest of several strong ones.
  return rate(worst) <= 0.5 && rate(worst) < best ? worst.pattern : rate(worst) <= 0.34 ? worst.pattern : null;
}

export interface ComputeOptions {
  now: Date;
  /** When the spaced-review schedule says fresh evidence is due (if scheduled). */
  reviewDueAt?: Date | null;
}

/**
 * Compute the mastery state for one student on one skill from all of that
 * student's evidence for the skill.
 */
export function computeSkillMastery(
  evidence: EvidenceItem[],
  policy: MasteryPolicyConfig,
  options: ComputeOptions,
): SkillMasteryResult {
  const sorted = sortChronologically(evidence);
  const result = core(sorted, policy);
  const c = result.counts;

  // Highest level ever held — replay prefixes exactly as they were computed at the time.
  let peak: MasteryLevel = result.level;
  for (let i = 1; i < sorted.length; i++) {
    const then = core(sorted.slice(0, i), policy).level;
    if (LEVEL_RANK[then] > LEVEL_RANK[peak]) peak = then;
  }

  // Retention: a flag asking for fresh evidence. It never changes the estimate.
  const recent = sorted.filter(isIndependent).slice(-policy.retention.recentWindow);
  const recentMisses = recent.filter((e) => e.score < policy.correctThreshold).length;
  let reviewReason: ReviewReason | null = null;
  const everProficient = LEVEL_RANK[peak] >= LEVEL_RANK.proficient;
  if (everProficient && LEVEL_RANK[result.level] < LEVEL_RANK.proficient) reviewReason = "dropped_below_proficient";
  else if (everProficient && recent.length >= policy.retention.recentMissesForReview && recentMisses >= policy.retention.recentMissesForReview)
    reviewReason = "recent_misses";
  else if (LEVEL_RANK[result.level] >= LEVEL_RANK.proficient && options.reviewDueAt && options.reviewDueAt.getTime() <= options.now.getTime())
    reviewReason = "scheduled_review_due";

  let nextLevel: MasteryLevel | null = null;
  let unmet: string[] = [];
  if (result.level === "mastered") nextLevel = null;
  else if (result.level === "proficient") {
    nextLevel = "mastered";
    unmet = unmetRequirements(policy.levels.mastered, result.estimate, result.effective, c);
  } else if (result.level !== "not_started") {
    nextLevel = "proficient";
    unmet = unmetRequirements(policy.levels.proficient, result.estimate, result.effective, c);
  } else nextLevel = "developing";

  const explanation: SkillExplanation = {
    attempts: c.attempts,
    independentAttempts: c.independentAttempts,
    independentCorrect: c.independentCorrect,
    assistedAttempts: c.assistedAttempts,
    uniqueQuestions: c.uniqueQuestions,
    uniqueQuestionsCorrect: c.uniqueQuestionsCorrect,
    distinctPatternsCorrect: c.distinctPatternsCorrect,
    summativeIndependentCorrect: c.summativeIndependentCorrect,
    distinctSittings: c.distinctSittings,
    effectiveEvidence: Math.round(result.effective * 100) / 100,
    patterns: c.patterns,
    weakestPattern: weakestPattern(c.patterns),
    nextLevel,
    unmet,
    reviewReason,
    peakLevel: peak,
    lastEvidenceAt: sorted.length ? sorted[sorted.length - 1].occurredAt.toISOString() : null,
    lastDemonstratedAt: c.lastDemonstratedAt ? c.lastDemonstratedAt.toISOString() : null,
    summary: "",
  };
  explanation.summary = summarize(result.level, explanation);

  return {
    alpha: result.alpha,
    beta: result.beta,
    estimate: result.estimate,
    level: result.level,
    needsReview: reviewReason !== null,
    explanation,
    weights: result.weights,
  };
}

function summarize(level: MasteryLevel, x: SkillExplanation): string {
  if (level === "not_started") return "No graded evidence yet.";
  const parts = [
    `${x.independentCorrect} of ${x.independentAttempts} answers correct without help`,
    `${x.uniqueQuestions} different question${x.uniqueQuestions === 1 ? "" : "s"}`,
  ];
  if (x.assistedAttempts > 0) parts.push(`${x.assistedAttempts} with hints or retries (counted for less)`);
  let s = `${LEVEL_LABEL[level]}: ${parts.join(", ")}.`;
  if (x.nextLevel && x.unmet.length) s += ` For ${LEVEL_LABEL[x.nextLevel]}: ${x.unmet.join("; ")}.`;
  return s;
}
