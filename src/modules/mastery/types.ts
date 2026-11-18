/**
 * Mastery domain types. No database or React imports — this module is callable
 * from tests, background jobs and request handlers alike.
 */

export const MASTERY_LEVELS = ["not_started", "developing", "approaching", "proficient", "mastered"] as const;
export type MasteryLevel = (typeof MASTERY_LEVELS)[number];

export const LEVEL_RANK: Record<MasteryLevel, number> = {
  not_started: 0,
  developing: 1,
  approaching: 2,
  proficient: 3,
  mastered: 4,
};

export const LEVEL_LABEL: Record<MasteryLevel, string> = {
  not_started: "Not started",
  developing: "Developing",
  approaching: "Approaching mastery",
  proficient: "Proficient",
  mastered: "Mastered",
};

export type EvidenceMode =
  | "lesson_check"
  | "guided_practice"
  | "skill_quiz"
  | "lesson_quiz"
  | "unit_test"
  | "course_review"
  | "exam_practice"
  | "custom";

/** Modes that count as an independent, summative demonstration. */
export const SUMMATIVE_MODES: ReadonlySet<EvidenceMode> = new Set([
  "skill_quiz",
  "lesson_quiz",
  "unit_test",
  "course_review",
  "exam_practice",
  "custom",
]);

/** One graded response for one skill. Raw facts only. */
export interface EvidenceItem {
  id: string;
  questionId: string;
  /** Problem pattern/template key — diversity is measured over patterns. */
  pattern: string;
  /** 0..1 */
  score: number;
  /** 1..5 */
  difficulty: number;
  mode: EvidenceMode;
  attemptId: string;
  /** 1 = first try at the item in that attempt; >1 = retry after feedback. */
  tryNumber: number;
  hintsUsed: number;
  solutionViewed: boolean;
  tutorUsed: boolean;
  isRetentionReview: boolean;
  occurredAt: Date;
}

export interface LevelRequirements {
  /** Minimum estimate alpha / (alpha + beta). */
  minEstimate: number;
  /** Minimum total weighted evidence (sum of applied weights). */
  minEffectiveEvidence: number;
  /** Distinct questions answered correctly without assistance. */
  minUniqueQuestionsCorrect: number;
  /** Distinct problem patterns answered correctly without assistance. */
  minDistinctPatternsCorrect: number;
  /** Total unassisted first-try correct answers. */
  minIndependentCorrect: number;
  /** Unassisted correct answers in a quiz/test/review (not guided practice). */
  minSummativeIndependentCorrect: number;
  /** Separate sittings containing an unassisted correct answer. */
  minDistinctSittings: number;
}

export interface MasteryPolicyConfig {
  prior: { alpha: number; beta: number };
  /** Reliability of each context as evidence. */
  modeWeights: Record<EvidenceMode, number>;
  /** Index 0 = difficulty 1 … index 4 = difficulty 5. */
  difficultyWeights: [number, number, number, number, number];
  /** Multipliers on *positive* credit when help was used. */
  assistance: { oneHint: number; multipleHints: number; tutor: number; solutionViewed: number };
  /** Multiplier by how many times the student has already seen the item. */
  repeatExposure: number[];
  /** Multiplier for a retry after feedback within the same attempt. */
  retryAfterFeedback: number;
  /** Repeated misses still count for at least this share of a first miss. */
  minNegativeFactor: number;
  /** Older evidence is discounted per *later item* (never by idle time). */
  recencyDecayPerLaterItem: number;
  recencyFloor: number;
  maxItemWeight: number;
  /** A response counts as "correct" for counting rules at or above this score. */
  correctThreshold: number;
  levels: {
    approaching: Pick<LevelRequirements, "minEstimate" | "minEffectiveEvidence">;
    proficient: LevelRequirements;
    mastered: LevelRequirements;
  };
  retention: {
    /** Days until the next review after each successful review stage. */
    intervalsDays: number[];
    /** Days until re-review after a missed review. */
    relearnDays: number;
    /** Look at this many most-recent unassisted answers… */
    recentWindow: number;
    /** …and flag review if at least this many were missed. */
    recentMissesForReview: number;
  };
}

export interface PatternStat {
  pattern: string;
  attempts: number;
  independentAttempts: number;
  independentCorrect: number;
}

export type ReviewReason = "scheduled_review_due" | "recent_misses" | "dropped_below_proficient";

/** Everything needed to explain a classification, derived from real records. */
export interface SkillExplanation {
  attempts: number;
  independentAttempts: number;
  independentCorrect: number;
  assistedAttempts: number;
  uniqueQuestions: number;
  uniqueQuestionsCorrect: number;
  distinctPatternsCorrect: number;
  summativeIndependentCorrect: number;
  distinctSittings: number;
  effectiveEvidence: number;
  patterns: PatternStat[];
  /** Pattern with the weakest unassisted record, when one stands out. */
  weakestPattern: string | null;
  /** Next level above the current one, if any. */
  nextLevel: MasteryLevel | null;
  /** Plain-language requirements still unmet for `nextLevel`. */
  unmet: string[];
  reviewReason: ReviewReason | null;
  /** Highest level this student has held on this skill. */
  peakLevel: MasteryLevel;
  lastEvidenceAt: string | null;
  lastDemonstratedAt: string | null;
  summary: string;
}

export interface AppliedWeight {
  evidenceId: string;
  /** Weight applied to alpha (× score). */
  positive: number;
  /** Weight applied to beta (× (1 − score)). */
  negative: number;
  independent: boolean;
}

export interface SkillMasteryResult {
  alpha: number;
  beta: number;
  /** alpha / (alpha + beta). An evidence estimate, not a validated probability. */
  estimate: number;
  level: MasteryLevel;
  needsReview: boolean;
  explanation: SkillExplanation;
  weights: AppliedWeight[];
}

export const CALC_VERSION = "aceap-mastery/1.0.0";
