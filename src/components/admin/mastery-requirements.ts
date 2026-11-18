/** Editable mastery-level requirements (shared by the admin policy page and editor). Server-safe. */
import type { MasteryPolicyConfig } from "@/modules/mastery/types";

type Levels = MasteryPolicyConfig["levels"];
export type LevelKey = "approaching" | "proficient" | "mastered";

export const REQUIREMENTS: {
  key: keyof Levels["proficient"];
  label: string;
  hint: string;
  step: number;
  levels: LevelKey[];
}[] = [
  {
    key: "minEstimate",
    label: "Minimum estimate",
    hint: "0.50–0.99 (approaching 0.30–0.95). Mastered ≥ Proficient ≥ Approaching.",
    step: 0.01,
    levels: ["approaching", "proficient", "mastered"],
  },
  {
    key: "minEffectiveEvidence",
    label: "Minimum effective evidence",
    hint: "Total applied evidence weight, 0–50.",
    step: 0.5,
    levels: ["approaching", "proficient", "mastered"],
  },
  {
    key: "minIndependentCorrect",
    label: "Independent correct answers",
    hint: "Without hints, tutor or solution. 0–30.",
    step: 1,
    levels: ["proficient", "mastered"],
  },
  {
    key: "minUniqueQuestionsCorrect",
    label: "Different questions correct",
    hint: "0–30.",
    step: 1,
    levels: ["proficient", "mastered"],
  },
  {
    key: "minDistinctPatternsCorrect",
    label: "Different problem patterns correct",
    hint: "0–10.",
    step: 1,
    levels: ["proficient", "mastered"],
  },
  {
    key: "minSummativeIndependentCorrect",
    label: "Independent correct on quiz/test/review",
    hint: "Not guided practice. 0–10.",
    step: 1,
    levels: ["proficient", "mastered"],
  },
  {
    key: "minDistinctSittings",
    label: "Separate sittings with correct answers",
    hint: "0–10.",
    step: 1,
    levels: ["proficient", "mastered"],
  },
];
