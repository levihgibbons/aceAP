/**
 * Spaced-review scheduling. The schedule only ever raises a "needs review"
 * flag; it never lowers a mastery estimate. Only new graded performance does.
 */
import { LEVEL_RANK, type EvidenceItem, type MasteryLevel, type MasteryPolicyConfig } from "./types";
import { isIndependent } from "./engine";

export interface ReviewScheduleState {
  stage: number;
  dueAt: Date;
  lastReviewedAt: Date | null;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Decide the next review after a new piece of evidence.
 * Returns null when no schedule should exist yet (skill not yet Proficient).
 */
export function scheduleAfterEvidence(
  current: ReviewScheduleState | null,
  latest: EvidenceItem,
  levelAfter: MasteryLevel,
  policy: MasteryPolicyConfig,
): ReviewScheduleState | null {
  const { intervalsDays, relearnDays } = policy.retention;
  const at = latest.occurredAt;
  const correct = latest.score >= policy.correctThreshold;
  const independent = isIndependent(latest);

  if (!current) {
    // First schedule is created when the skill first reaches Proficient.
    if (LEVEL_RANK[levelAfter] < LEVEL_RANK.proficient) return null;
    return { stage: 0, dueAt: new Date(at.getTime() + intervalsDays[0] * DAY), lastReviewedAt: null };
  }

  if (!independent) return current; // Assisted work neither passes nor fails a review.

  if (!correct) {
    // A miss brings the review forward; it does not itself change mastery.
    return { stage: 0, dueAt: new Date(at.getTime() + relearnDays * DAY), lastReviewedAt: at };
  }

  if (at.getTime() < current.dueAt.getTime()) return current; // Early practice doesn't advance the schedule.

  const stage = Math.min(current.stage + 1, intervalsDays.length - 1);
  return { stage, dueAt: new Date(at.getTime() + intervalsDays[stage] * DAY), lastReviewedAt: at };
}
