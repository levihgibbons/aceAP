/** Contract between pages that embed the tutor and the tutor panel. */
export interface TutorContext {
  courseId?: string;
  lessonId?: string;
  skillId?: string;
  attemptId?: string;
  questionId?: string;
  noteIds?: string[];
}

export interface TutorPanelProps {
  context: TutorContext;
  /** Suggested prompts shown as one-tap chips (e.g. from a lesson's tutor_prompt block). */
  suggestions?: string[];
  /** Server-computed availability so the panel can show an honest state without a round trip. */
  availability:
    { status: "available" } | { status: "not_configured" } | { status: "disabled"; reason: string };
  /** Compact = drawer/side-panel layout. */
  compact?: boolean;
}
