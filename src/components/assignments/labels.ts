/** Display labels shared by the assignment and gradebook pages. */
import type { BadgeTone } from "@/components/ui";

export const KIND_LABEL: Record<"lesson" | "skill_practice" | "assessment", string> = {
  lesson: "Lesson",
  skill_practice: "Skill practice",
  assessment: "Quiz / test",
};

export const GRADING_LABEL: Record<"score" | "mastery" | "completion", string> = {
  score: "Score",
  mastery: "Mastery",
  completion: "Completion",
};

export const GRADING_EXPLANATION: Record<"score" | "mastery" | "completion", string> = {
  score:
    "Percent correct on the attempt your grading policy picks (best or latest), minus any late penalty.",
  mastery:
    "Uses each student's current mastery level on the assigned skills through your grading policy.",
  completion: "Full credit once the student submits or completes it; nothing is scored.",
};

export const AI_LABEL: Record<"allowed" | "hints_only" | "disabled", string> = {
  allowed: "Hints and AI tutor",
  hints_only: "Authored hints only",
  disabled: "No hints or tutor",
};

export const FEEDBACK_LABEL: Record<"immediate" | "after_submit", string> = {
  immediate: "Immediately after each answer",
  after_submit: "After the student submits",
};

export const CELL_STATUS_TONE: Record<string, BadgeTone> = {
  not_submitted: "neutral",
  submitted: "good",
  late: "warn",
  awaiting_grading: "info",
  excused: "neutral",
  missing: "bad",
};
