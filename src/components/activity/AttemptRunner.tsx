"use client";
/**
 * AttemptRunner — the in-progress screen for practice, quizzes, unit tests,
 * reviews and exam sets. One question at a time with Previous/Next and a
 * question navigator. Immediate modes grade each answer as it's checked;
 * deferred modes save drafts, then offer a review screen and a confirm-submit
 * dialog. Timed attempts show a countdown and submit automatically at zero.
 * After submitting, the page re-renders on the server as the results view.
 */
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, CircleDot, ListChecks, Send, Sparkles, XCircle } from "lucide-react";
import { QuestionCard } from "@/components/questions/QuestionCard";
import { waitForDraftSaves } from "@/components/questions/drafts";
import type { QuestionState } from "@/components/questions/types";
import { TutorPanel } from "@/components/tutor/TutorPanel";
import type { TutorPanelProps } from "@/components/tutor/types";
import { Badge, Button, Dialog, Drawer, ProgressBar } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { AttemptView } from "@/modules/assessments/service";
import { CountdownTimer } from "./CountdownTimer";

export interface AttemptRunnerProps {
  view: AttemptView;
  /** Server time when the page rendered (clock-skew correction for the timer). */
  serverNow: string;
  /** Present when the AI tutor may be offered for this attempt. */
  tutor: Pick<TutorPanelProps, "availability"> | null;
}

type Status = "unanswered" | "answered" | "correct" | "incorrect" | "partial" | "pending";

function statusOf(s: QuestionState | undefined, immediate: boolean): Status {
  if (!s) return "unanswered";
  if (s.pendingReview) return "pending";
  if (immediate && s.feedback) return s.feedback.correct ? "correct" : s.feedback.score > 0 ? "partial" : "incorrect";
  return s.answered ? "answered" : "unanswered";
}

const STATUS_TEXT: Record<Status, string> = {
  unanswered: "not answered",
  answered: "answered",
  correct: "correct",
  incorrect: "incorrect",
  partial: "partly correct",
  pending: "awaiting teacher review",
};

export function AttemptRunner({ view, serverNow, tutor }: AttemptRunnerProps) {
  const router = useRouter();
  const immediate = view.feedback === "immediate";
  const total = view.questions.length;
  const [states, setStates] = useState<Record<string, QuestionState>>(view.state);
  const firstOpen = Math.max(0, view.questions.findIndex((q) => !view.state[q.id]?.answered));
  const [index, setIndex] = useState(firstOpen);
  const [screen, setScreen] = useState<"question" | "review">("question");
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tutorOpen, setTutorOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const submittingRef = useRef(false);

  const onStateChange = useCallback((questionId: string, s: QuestionState) => setStates((prev) => ({ ...prev, [questionId]: s })), []);

  const statuses = useMemo(() => view.questions.map((q) => statusOf(states[q.id], immediate)), [view.questions, states, immediate]);
  const answered = statuses.filter((s) => s !== "unanswered").length;
  const unanswered = view.questions.map((q, i) => ({ q, i })).filter(({ i }) => statuses[i] === "unanswered");
  const current = view.questions[index];

  const go = (i: number) => {
    setScreen("question");
    setIndex(Math.min(total - 1, Math.max(0, i)));
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const submit = useCallback(
    async (auto = false) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setConfirm(false);
      setError(null);
      if (auto) setScreen("review"); // unmounts the open card, which flushes its pending draft
      try {
        await new Promise((r) => setTimeout(r, 60));
        await waitForDraftSaves();
        await apiFetch(`/api/attempts/${view.id}/submit`, { method: "POST" });
        router.refresh();
      } catch (e) {
        submittingRef.current = false;
        setSubmitting(false);
        setError(e instanceof Error ? e.message : "Couldn't submit. Check your connection and try again.");
      }
    },
    [router, view.id],
  );

  const onExpire = useCallback(() => {
    setTimeUp(true);
    void submit(true);
  }, [submit]);

  const isLast = index === total - 1;

  return (
    <div className="space-y-6">
      {/* status bar */}
      <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0 flex-1">
          <ProgressBar value={total ? answered / total : 0} label={`${answered} of ${total} answered`} showValue />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:pl-6">
          {view.deadline ? <CountdownTimer deadline={view.deadline} serverNow={serverNow} onExpire={onExpire} /> : null}
          {immediate && !isLast ? (
            <Button
              variant={answered === total ? "primary" : "ghost"}
              size="sm"
              onClick={() => (unanswered.length ? setConfirm(true) : void submit())}
              loading={submitting}
              icon={<Send aria-hidden="true" className="size-4" />}
            >
              Finish
            </Button>
          ) : null}
          {tutor && tutor.availability.status !== "disabled" ? (
            <Button variant="secondary" size="sm" icon={<Sparkles aria-hidden="true" className="size-4" />} onClick={() => setTutorOpen(true)}>
              Ask the AI tutor
            </Button>
          ) : null}
        </div>
      </div>

      {timeUp ? (
        <p role="alert" className="rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-sm font-medium text-ink">
          Time is up. Your saved answers are being submitted.
        </p>
      ) : null}

      {/* navigator */}
      <nav aria-label="Questions">
        <ol className="flex flex-wrap gap-1.5">
          {view.questions.map((q, i) => {
            const st = statuses[i];
            const Icon = st === "correct" ? CheckCircle2 : st === "incorrect" ? XCircle : st === "unanswered" ? Circle : CircleDot;
            const active = screen === "question" && i === index;
            return (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-current={active ? "step" : undefined}
                  aria-label={`Question ${i + 1}, ${STATUS_TEXT[st]}`}
                  className={cn(
                    "inline-flex h-9 min-w-11 items-center justify-center gap-1 rounded-lg border px-2 text-sm font-medium tabular-nums transition-colors",
                    active ? "border-accent bg-accent-soft text-accent-ink" : "border-line-strong bg-surface text-ink-2 hover:bg-surface-2",
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      "size-3.5",
                      st === "correct" && "text-good",
                      st === "incorrect" && "text-bad",
                      (st === "partial" || st === "pending") && "text-warn",
                      st === "answered" && "text-accent",
                      st === "unanswered" && "text-faint",
                    )}
                  />
                  {i + 1}
                </button>
              </li>
            );
          })}
          {!immediate ? (
            <li>
              <button
                type="button"
                onClick={() => setScreen("review")}
                aria-current={screen === "review" ? "step" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
                  screen === "review" ? "border-accent bg-accent-soft text-accent-ink" : "border-line-strong bg-surface text-ink-2 hover:bg-surface-2",
                )}
              >
                <ListChecks aria-hidden="true" className="size-4" />
                Review
              </button>
            </li>
          ) : null}
        </ol>
      </nav>

      {screen === "question" && current ? (
        <section aria-labelledby="runner-question-heading">
          <h2 id="runner-question-heading" ref={headingRef} tabIndex={-1} className="sr-only">
            Question {index + 1} of {total}
          </h2>
          <QuestionCard
            key={current.id}
            attempt={{
              attemptId: view.id,
              feedbackMode: view.feedback,
              assistance: view.assistance,
              allowSolution: immediate && view.mode !== "course_review" && view.assistance !== "disabled",
            }}
            question={current}
            initialState={states[current.id] ?? view.state[current.id]}
            label={`Question ${index + 1} of ${total}`}
            disabled={submitting || timeUp}
            onStateChange={onStateChange}
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" icon={<ArrowLeft aria-hidden="true" className="size-4" />} onClick={() => go(index - 1)} disabled={index === 0}>
              Previous
            </Button>
            {isLast ? (
              immediate ? (
                <Button onClick={() => (unanswered.length ? setConfirm(true) : void submit())} loading={submitting} loadingText="Finishing…" icon={<Send aria-hidden="true" className="size-4" />}>
                  Finish and see results
                </Button>
              ) : (
                <Button onClick={() => setScreen("review")} iconRight={<ArrowRight aria-hidden="true" className="size-4" />}>
                  Review answers
                </Button>
              )
            ) : (
              <Button variant={statuses[index] === "unanswered" ? "secondary" : "primary"} onClick={() => go(index + 1)} iconRight={<ArrowRight aria-hidden="true" className="size-4" />}>
                {statuses[index] === "unanswered" ? "Skip for now" : "Next question"}
              </Button>
            )}
          </div>
        </section>
      ) : null}

      {screen === "review" ? (
        <section aria-labelledby="review-heading" className="rounded-card border border-line bg-surface shadow-card">
          <div className="p-5 sm:p-6">
            <h2 id="review-heading" className="font-display text-lg font-semibold text-ink">
              Review your answers
            </h2>
            <p className="mt-1 text-sm text-muted">
              {unanswered.length === 0
                ? "Every question has a saved answer. You can still change any of them before you submit."
                : `${unanswered.length} question${unanswered.length === 1 ? " has" : "s have"} no saved answer. Unanswered questions score zero and don't count toward mastery.`}
            </p>
            <ul className="mt-4 divide-y divide-line">
              {view.questions.map((q, i) => (
                <li key={q.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm text-ink">
                    <span className="font-medium tabular-nums">Question {i + 1}</span>
                    {statuses[i] === "unanswered" ? <Badge tone="warn">Not answered</Badge> : statuses[i] === "pending" ? <Badge tone="info">Awaiting review</Badge> : <Badge tone="accent">Answer saved</Badge>}
                  </span>
                  <Button variant="link" size="sm" onClick={() => go(i)} disabled={submitting}>
                    {statuses[i] === "unanswered" ? "Answer" : "Change"}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 rounded-b-card border-t border-line bg-surface-2 px-5 py-3 sm:px-6">
            <Button variant="ghost" onClick={() => go(unanswered[0]?.i ?? 0)} disabled={submitting}>
              Back to questions
            </Button>
            <Button onClick={() => setConfirm(true)} loading={submitting} loadingText="Submitting…" icon={<Send aria-hidden="true" className="size-4" />}>
              Submit answers
            </Button>
          </div>
        </section>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg border border-bad/30 bg-bad-soft px-4 py-3 text-sm font-medium text-bad">
          {error}
        </p>
      ) : null}

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={immediate ? "Finish this set?" : "Submit your answers?"}
        description={
          immediate
            ? `${unanswered.length} question${unanswered.length === 1 ? " is" : "s are"} still unanswered. They'll score zero and won't count toward mastery.`
            : "You can't change your answers after submitting. Your results, the correct answers and worked solutions appear right after."
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Keep working
            </Button>
            <Button onClick={() => void submit()} loading={submitting}>
              {immediate ? "Finish" : "Submit"}
            </Button>
          </>
        }
      >
        {!immediate && unanswered.length ? (
          <p className="text-sm text-ink-2">
            Not answered: {unanswered.map(({ i }) => `Question ${i + 1}`).join(", ")}. Unanswered questions score zero but don&apos;t count against your mastery.
          </p>
        ) : (
          <p className="text-sm text-ink-2">
            {answered} of {total} answered.
          </p>
        )}
      </Dialog>

      {tutor ? (
        <Drawer open={tutorOpen} onClose={() => setTutorOpen(false)} title="AI tutor">
          {tutorOpen && current ? (
            <TutorPanel
              compact
              availability={tutor.availability}
              context={{ courseId: view.courseId, attemptId: view.id, questionId: current.id, skillId: view.skillId ?? undefined }}
            />
          ) : null}
        </Drawer>
      ) : null}
    </div>
  );
}
