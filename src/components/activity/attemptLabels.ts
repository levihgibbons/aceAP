/** Plain-language labels for attempt modes and policies (shared by server and client). */
import type { AttemptMode } from "@/db/schema";

export const MODE_LABEL: Record<AttemptMode, string> = {
  lesson_check: "Lesson check",
  guided_practice: "Guided practice",
  skill_quiz: "Skill quiz",
  lesson_quiz: "Quiz",
  unit_test: "Unit test",
  course_review: "Mixed review",
  exam_practice: "AP exam practice",
  custom: "Assessment",
};

export type AssistanceLevel = "allowed" | "hints_only" | "disabled";

/** "Guided practice · hints allowed" / "Quiz · no hints · feedback after you submit" / "Unit test · 25 min · …" */
export function modeBadgeText(input: { mode: AttemptMode; assistance: AssistanceLevel; feedback: "immediate" | "after_submit"; timeLimitMinutes?: number | null }): string {
  const parts: string[] = [MODE_LABEL[input.mode]];
  if (input.timeLimitMinutes) parts.push(`${input.timeLimitMinutes} min`);
  if (input.mode === "course_review") parts.push("one try each");
  parts.push(input.assistance === "disabled" ? "no hints" : input.assistance === "hints_only" ? "hints allowed · no AI tutor" : "hints allowed");
  if (input.feedback === "after_submit") parts.push("feedback after you submit");
  return parts.join(" · ");
}

export function assistanceSentence(assistance: AssistanceLevel): string {
  if (assistance === "disabled") return "Hints and the AI tutor are off for this assessment.";
  if (assistance === "hints_only") return "Built-in hints are available. The AI tutor is off for this activity.";
  return "Hints and the AI tutor are available. Answers given with help count for less toward mastery.";
}

/** How a mode's answers count toward mastery, in one sentence (mirrors docs/MASTERY_ENGINE.md weights). */
export function evidenceSentence(mode: AttemptMode): string {
  switch (mode) {
    case "guided_practice":
      return "Every answer counts toward mastery. Practice counts a little less than quizzes and tests, and answers after a hint, a retry or a viewed solution count for less again.";
    case "lesson_check":
      return "Checks count lightly toward mastery.";
    case "course_review":
      return "One independent try per question, so every answer is strong evidence. Spaced reviews also show whether you've retained a skill.";
    case "unit_test":
      return "Unit tests are the strongest evidence of mastery: answered independently, under test conditions.";
    case "exam_practice":
      return "Exam practice counts strongly toward mastery. Unanswered questions score zero but create no mastery evidence.";
    default:
      return "Each answered question counts toward mastery of the skills it assesses. Unanswered questions score zero but create no mastery evidence.";
  }
}

export function activityKindForMode(mode: AttemptMode): "practice" | "assessment" {
  return mode === "guided_practice" || mode === "course_review" || mode === "lesson_check" ? "practice" : "assessment";
}
