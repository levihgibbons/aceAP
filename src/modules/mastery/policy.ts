import { z } from "zod";
import type { MasteryPolicyConfig } from "./types";

/**
 * Platform default policy. These are documented product defaults, not
 * scientifically validated thresholds — see docs/MASTERY_ENGINE.md.
 */
export const DEFAULT_MASTERY_POLICY: MasteryPolicyConfig = {
  prior: { alpha: 1, beta: 1 },
  modeWeights: {
    lesson_check: 0.5,
    guided_practice: 0.6,
    skill_quiz: 1.0,
    lesson_quiz: 1.0,
    unit_test: 1.2,
    course_review: 1.0,
    exam_practice: 1.1,
    custom: 1.0,
  },
  difficultyWeights: [0.7, 0.85, 1.0, 1.1, 1.2],
  assistance: { oneHint: 0.5, multipleHints: 0.25, tutor: 0.4, solutionViewed: 0.1 },
  repeatExposure: [1, 0.5, 0.25, 0.1],
  retryAfterFeedback: 0.25,
  minNegativeFactor: 0.5,
  recencyDecayPerLaterItem: 0.97,
  recencyFloor: 0.5,
  maxItemWeight: 1.5,
  correctThreshold: 0.8,
  levels: {
    approaching: { minEstimate: 0.6, minEffectiveEvidence: 1.5 },
    proficient: {
      minEstimate: 0.75,
      minEffectiveEvidence: 3,
      minUniqueQuestionsCorrect: 3,
      minDistinctPatternsCorrect: 1,
      minIndependentCorrect: 3,
      minSummativeIndependentCorrect: 0,
      minDistinctSittings: 1,
    },
    mastered: {
      minEstimate: 0.85,
      minEffectiveEvidence: 5,
      minUniqueQuestionsCorrect: 4,
      minDistinctPatternsCorrect: 2,
      minIndependentCorrect: 5,
      minSummativeIndependentCorrect: 1,
      minDistinctSittings: 2,
    },
  },
  retention: { intervalsDays: [3, 7, 16, 35, 75], relearnDays: 1, recentWindow: 3, recentMissesForReview: 2 },
};

const weight = z.number().min(0).max(2);
const share = z.number().min(0).max(1);

const levelRequirementsSchema = z.object({
  minEstimate: z.number().min(0.5).max(0.99),
  minEffectiveEvidence: z.number().min(0).max(50),
  minUniqueQuestionsCorrect: z.number().int().min(0).max(30),
  minDistinctPatternsCorrect: z.number().int().min(0).max(10),
  minIndependentCorrect: z.number().int().min(0).max(30),
  minSummativeIndependentCorrect: z.number().int().min(0).max(10),
  minDistinctSittings: z.number().int().min(0).max(10),
});

/** Validation + sanity bounds for any stored or teacher-edited policy. */
export const masteryPolicySchema = z
  .object({
    prior: z.object({ alpha: z.number().positive().max(10), beta: z.number().positive().max(10) }),
    modeWeights: z.object({
      lesson_check: weight,
      guided_practice: weight,
      skill_quiz: weight,
      lesson_quiz: weight,
      unit_test: weight,
      course_review: weight,
      exam_practice: weight,
      custom: weight,
    }),
    difficultyWeights: z.tuple([weight, weight, weight, weight, weight]),
    assistance: z.object({ oneHint: share, multipleHints: share, tutor: share, solutionViewed: share }),
    repeatExposure: z.array(share).min(1).max(10),
    retryAfterFeedback: share,
    minNegativeFactor: share,
    recencyDecayPerLaterItem: z.number().min(0.5).max(1),
    recencyFloor: share,
    maxItemWeight: z.number().positive().max(3),
    correctThreshold: z.number().min(0.5).max(1),
    levels: z.object({
      approaching: z.object({ minEstimate: z.number().min(0.3).max(0.95), minEffectiveEvidence: z.number().min(0).max(50) }),
      proficient: levelRequirementsSchema,
      mastered: levelRequirementsSchema,
    }),
    retention: z.object({
      intervalsDays: z.array(z.number().positive().max(365)).min(1).max(12),
      relearnDays: z.number().positive().max(30),
      recentWindow: z.number().int().min(1).max(20),
      recentMissesForReview: z.number().int().min(1).max(20),
    }),
  })
  .refine((p) => p.levels.mastered.minEstimate >= p.levels.proficient.minEstimate, {
    message: "Mastered threshold must be at least the Proficient threshold",
  })
  .refine((p) => p.levels.proficient.minEstimate >= p.levels.approaching.minEstimate, {
    message: "Proficient threshold must be at least the Approaching threshold",
  })
  .refine((p) => p.retention.recentMissesForReview <= p.retention.recentWindow, {
    message: "Recent-miss count cannot exceed the window",
  });

export function parseMasteryPolicy(input: unknown): MasteryPolicyConfig {
  return masteryPolicySchema.parse(input) as MasteryPolicyConfig;
}
