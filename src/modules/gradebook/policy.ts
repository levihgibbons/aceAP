/**
 * Mastery → classroom grade conversion. Pure functions.
 *
 * Mastery (what the evidence shows) and grades (what a teacher records) are
 * deliberately separate: a grading policy only ever *reads* mastery and
 * attempt records and derives a number; it never writes back to them.
 */
import { z } from "zod";
import { LEVEL_RANK, MASTERY_LEVELS, type MasteryLevel } from "@/modules/mastery/types";

export const gradingPolicySchema = z.object({
  /** Percentage awarded for each mastery level on mastery-graded work. */
  levelGrades: z.object({
    not_started: z.number().min(0).max(100),
    developing: z.number().min(0).max(100),
    approaching: z.number().min(0).max(100),
    proficient: z.number().min(0).max(100),
    mastered: z.number().min(0).max(100),
  }),
  /** current = level right now · highest = best level ever demonstrated. */
  masteryBasis: z.enum(["current", "highest"]),
  /** For score-graded work with several attempts. */
  attemptRule: z.enum(["best", "latest"]),
  /** Percentage points deducted from late submissions (0 = none). */
  latePenalty: z.number().min(0).max(100),
});
export type GradingPolicyConfig = z.infer<typeof gradingPolicySchema>;

export const DEFAULT_GRADING_POLICY: GradingPolicyConfig = {
  levelGrades: { not_started: 0, developing: 60, approaching: 75, proficient: 90, mastered: 100 },
  masteryBasis: "current",
  attemptRule: "best",
  latePenalty: 0,
};

export interface SkillGradeInput {
  skillId: string;
  current: MasteryLevel;
  /** Highest level ever held (from the mastery explanation / snapshots). */
  peak: MasteryLevel;
}

export interface SubmissionGradeInput {
  score: number | null;
  maxScore: number | null;
  late: boolean;
  submittedAt: Date;
}

export type GradeSource =
  | { kind: "none"; reason: "not_submitted" | "awaiting_grading" | "no_skills" }
  | { kind: "score"; attemptRule: "best" | "latest"; percent: number; attempts: number; latePenaltyApplied: number }
  | { kind: "mastery"; basis: "current" | "highest"; skills: { skillId: string; level: MasteryLevel; grade: number }[] }
  | { kind: "completion"; completed: boolean }
  | { kind: "override"; by: string | null; reason: string | null; replaced: number | null };

export interface ComputedGrade {
  /** 0–100, or null when there is nothing to grade yet. */
  percent: number | null;
  source: GradeSource;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export function gradeFromScore(subs: SubmissionGradeInput[], policy: GradingPolicyConfig): ComputedGrade {
  const graded = subs.filter((s) => s.score !== null && s.maxScore !== null && s.maxScore > 0);
  if (subs.length === 0) return { percent: null, source: { kind: "none", reason: "not_submitted" } };
  if (graded.length === 0) return { percent: null, source: { kind: "none", reason: "awaiting_grading" } };

  const pct = (s: SubmissionGradeInput) => {
    const raw = ((s.score as number) / (s.maxScore as number)) * 100;
    return Math.max(0, raw - (s.late ? policy.latePenalty : 0));
  };
  const chosen =
    policy.attemptRule === "best"
      ? graded.reduce((a, b) => (pct(b) > pct(a) ? b : a))
      : graded.reduce((a, b) => (b.submittedAt.getTime() >= a.submittedAt.getTime() ? b : a));
  return {
    percent: round1(pct(chosen)),
    source: {
      kind: "score",
      attemptRule: policy.attemptRule,
      percent: round1(pct(chosen)),
      attempts: graded.length,
      latePenaltyApplied: chosen.late ? policy.latePenalty : 0,
    },
  };
}

export function gradeFromMastery(skills: SkillGradeInput[], policy: GradingPolicyConfig): ComputedGrade {
  if (skills.length === 0) return { percent: null, source: { kind: "none", reason: "no_skills" } };
  const rows = skills.map((s) => {
    const level = policy.masteryBasis === "highest" && LEVEL_RANK[s.peak] > LEVEL_RANK[s.current] ? s.peak : s.current;
    return { skillId: s.skillId, level, grade: policy.levelGrades[level] };
  });
  const percent = round1(rows.reduce((sum, r) => sum + r.grade, 0) / rows.length);
  return { percent, source: { kind: "mastery", basis: policy.masteryBasis, skills: rows } };
}

export function gradeFromCompletion(completed: boolean): ComputedGrade {
  return { percent: completed ? 100 : null, source: completed ? { kind: "completion", completed } : { kind: "none", reason: "not_submitted" } };
}

/** Apply a teacher override on top of a computed grade without losing it. */
export function applyOverride(
  computed: ComputedGrade,
  override: { grade: number | null; by: string | null; reason: string | null },
): ComputedGrade {
  if (override.grade === null) return computed;
  return { percent: round1(override.grade), source: { kind: "override", by: override.by, reason: override.reason, replaced: computed.percent } };
}

/** How many students at each level would receive which grade — for the policy preview. */
export function previewLevelGrades(policy: GradingPolicyConfig) {
  return MASTERY_LEVELS.map((level) => ({ level, grade: policy.levelGrades[level] }));
}
