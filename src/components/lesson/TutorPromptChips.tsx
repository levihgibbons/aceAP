"use client";
/** tutor_prompt block: one-tap prompts that open the tutor panel with that prompt suggested. */
import { MessageCircleQuestion, Sparkles } from "lucide-react";
import { useLessonUI } from "./LessonShell";

export function TutorPromptChips({ prompts }: { prompts: string[] }) {
  const { openTutor, tutorAvailable } = useLessonUI();
  return (
    <div className="rounded-card border border-line bg-surface p-5 sm:p-6">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Sparkles aria-hidden="true" className="size-4 text-accent" />
        Ask the AI tutor
      </p>
      <p className="mt-1 text-sm text-muted">
        {tutorAvailable
          ? "Tap a question to open the tutor with it ready to send. Chatting with the tutor doesn't change your mastery."
          : "Questions worth thinking about. Tap one to see the tutor panel and whether the tutor is available for you."}
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {prompts.map((p, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => openTutor([p, ...prompts.filter((x) => x !== p)])}
              className="inline-flex max-w-full items-start gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-left text-sm text-ink-2 transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent-ink"
            >
              <MessageCircleQuestion aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0">{p}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
