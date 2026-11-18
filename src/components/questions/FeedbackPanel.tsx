/**
 * FeedbackPanel — the outcome of one graded answer: correct/incorrect (icon +
 * words, never colour alone), the answer-specific note, a detected
 * misconception with its remediation, and — only when the server sends
 * them — the correct answer and worked solution. No hooks.
 */
import type { Ref } from "react";
import { CheckCircle2, CircleDashed, Lightbulb, XCircle } from "lucide-react";
import { InlineMarkdown, Markdown } from "@/components/content/Markdown";
import { cn } from "@/lib/cn";
import { MasteryChangeList } from "./MasteryChangeList";
import type { FeedbackView, MasteryChange } from "./types";

export interface FeedbackPanelProps {
  feedback: FeedbackView;
  /** Skill level changes caused by this answer. */
  mastery?: MasteryChange[];
  /** Extra line under the verdict, e.g. "Second try". */
  meta?: string;
  /** Hide the worked solution (e.g. when it is already shown elsewhere). */
  hideSolution?: boolean;
  id?: string;
  ref?: Ref<HTMLDivElement>;
  className?: string;
}

export function verdictOf(f: Pick<FeedbackView, "correct" | "score">): { label: string; tone: "good" | "bad" | "warn" } {
  if (f.correct) return { label: "Correct", tone: "good" };
  if (f.score > 0) return { label: `Partly correct — ${Math.round(f.score * 100)}% credit`, tone: "warn" };
  return { label: "Not quite", tone: "bad" };
}

export function FeedbackPanel({ feedback, mastery, meta, hideSolution, id, ref, className }: FeedbackPanelProps) {
  const verdict = verdictOf(feedback);
  const Icon = verdict.tone === "good" ? CheckCircle2 : verdict.tone === "warn" ? CircleDashed : XCircle;
  const headingId = id ? `${id}-title` : undefined;
  return (
    <div
      id={id}
      ref={ref}
      tabIndex={-1}
      role="group"
      aria-labelledby={headingId}
      className={cn(
        "rounded-xl border p-4 focus:outline-none focus-visible:outline-2 focus-visible:outline-accent sm:p-5",
        verdict.tone === "good" && "border-good/35 bg-good-soft",
        verdict.tone === "warn" && "border-warn/35 bg-warn-soft",
        verdict.tone === "bad" && "border-bad/30 bg-bad-soft",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon
          aria-hidden="true"
          className={cn("mt-0.5 size-5 shrink-0", verdict.tone === "good" ? "text-good" : verdict.tone === "warn" ? "text-warn" : "text-bad")}
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p id={headingId} className="font-display text-base font-semibold text-ink">
              {verdict.label}
            </p>
            {meta ? <p className="text-xs text-muted">{meta}</p> : null}
          </div>

          {feedback.note ? (
            <Markdown compact className="text-ink-2">
              {feedback.note}
            </Markdown>
          ) : null}

          {feedback.misconception ? (
            <div className="rounded-lg border border-line bg-surface p-3">
              <p className="flex items-start gap-1.5 text-sm font-semibold text-ink">
                <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warn" />
                <span>Possible misconception: {feedback.misconception.title}</span>
              </p>
              <Markdown compact className="mt-1.5 text-ink-2">
                {feedback.misconception.remediation}
              </Markdown>
            </div>
          ) : null}

          {feedback.correctAnswer && !feedback.correct ? (
            <p className="text-sm text-ink-2">
              <span className="font-medium text-ink">Correct answer: </span>
              <InlineMarkdown>{feedback.correctAnswer}</InlineMarkdown>
            </p>
          ) : null}

          {feedback.solution && !hideSolution ? (
            <details className="rounded-lg border border-line bg-surface p-3" open={!feedback.correct}>
              <summary className="cursor-pointer text-sm font-semibold text-ink marker:text-muted">Worked solution</summary>
              <Markdown compact className="mt-2">
                {feedback.solution}
              </Markdown>
            </details>
          ) : null}

          {mastery && mastery.length > 0 ? (
            <div className="border-t border-line pt-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Mastery update</p>
              <MasteryChangeList changes={mastery} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
