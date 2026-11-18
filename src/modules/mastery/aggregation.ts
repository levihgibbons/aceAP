/**
 * Roll skill-level mastery up to objectives, topics, units and courses.
 *
 * Rule: never average away missing evidence. Every rollup is computed over
 * ALL skills in scope, and unattempted skills count as "not started" — so a
 * course with one mastered skill cannot look nearly mastered.
 */
import { LEVEL_RANK, MASTERY_LEVELS, type MasteryLevel } from "./types";

export interface SkillStateLite {
  skillId: string;
  level: MasteryLevel;
  estimate: number;
  needsReview: boolean;
}

export interface Rollup {
  /** All skills in scope, attempted or not. */
  totalSkills: number;
  /** Skills with at least one graded response. */
  skillsWithEvidence: number;
  /** skillsWithEvidence / totalSkills. */
  coverage: number;
  counts: Record<MasteryLevel, number>;
  /** Skills at Proficient or Mastered. */
  proficientOrBetter: number;
  /** proficientOrBetter / totalSkills — the headline "mastery" share. */
  masteryShare: number;
  needsReview: number;
  /** Conservative single label for the scope. */
  level: MasteryLevel;
}

export function rollup(skillIds: string[], states: Map<string, SkillStateLite> | SkillStateLite[]): Rollup {
  const map = states instanceof Map ? states : new Map(states.map((s) => [s.skillId, s]));
  const counts = Object.fromEntries(MASTERY_LEVELS.map((l) => [l, 0])) as Record<MasteryLevel, number>;
  let needsReview = 0;
  let minRank = Infinity;

  for (const id of skillIds) {
    const s = map.get(id);
    const level = s?.level ?? "not_started";
    counts[level] += 1;
    if (s?.needsReview) needsReview += 1;
    minRank = Math.min(minRank, LEVEL_RANK[level]);
  }

  const total = skillIds.length;
  const withEvidence = total - counts.not_started;
  const proficientOrBetter = counts.proficient + counts.mastered;

  let level: MasteryLevel;
  if (total === 0 || withEvidence === 0) level = "not_started";
  else if (withEvidence === total) level = MASTERY_LEVELS[minRank];
  // Some skills have no evidence: the scope can never read Proficient/Mastered.
  else level = proficientOrBetter * 2 >= total ? "approaching" : "developing";

  return {
    totalSkills: total,
    skillsWithEvidence: withEvidence,
    coverage: total ? withEvidence / total : 0,
    counts,
    proficientOrBetter,
    masteryShare: total ? proficientOrBetter / total : 0,
    needsReview,
    level,
  };
}

/** Display status for a lesson or skill row in the student UI. */
export type StudentStatus = "not_started" | "in_progress" | "needs_review" | "proficient" | "mastered";

export function studentStatus(level: MasteryLevel, needsReview: boolean): StudentStatus {
  if (level === "not_started") return "not_started";
  if (needsReview) return "needs_review";
  if (level === "mastered") return "mastered";
  if (level === "proficient") return "proficient";
  return "in_progress";
}
