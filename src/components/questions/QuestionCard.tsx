"use client";
/**
 * QuestionCard — renders and answers any StudentQuestion inside an attempt.
 *
 *   <QuestionCard
 *     attempt={{ attemptId, feedbackMode: "immediate", assistance: "allowed", allowSolution: true }}
 *     question={q} initialState={view.state[q.id]} label="Question 2 of 5"
 *     onStateChange={(id, s) => …} />
 *
 * Immediate modes: "Check answer" grades on the server and shows feedback,
 * the misconception, mastery changes, and (when the server sends them) the
 * correct answer and worked solution; "Try again" after a wrong answer while
 * not locked. Deferred modes (quizzes/tests): every change is saved as a
 * draft, with a visible "Saved" state and an "unreadable input" message.
 * Invalid input never counts as a try.
 */
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Eye, Lightbulb, RotateCcw } from "lucide-react";
import { Markdown } from "@/components/content/Markdown";
import { Simulation } from "@/components/simulations/registry";
import { Badge, Button, Dialog, Spinner } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { markInteraction } from "@/components/activity/interaction";
import { useSimulationEngagement } from "@/components/activity/useSimulationEngagement";
import { trackDraftSave } from "./drafts";
import { FeedbackPanel } from "./FeedbackPanel";
import { ResponseInput } from "./inputs";
import {
  blankMessage,
  initialResponse,
  isBlank,
  newIdempotencyKey,
  type FeedbackView,
  type MasteryChange,
  type QuestionAttemptContext,
  type QuestionResponse,
  type QuestionState,
  type StudentQuestion,
  type SubmitResult,
} from "./types";

export interface QuestionCardProps {
  attempt: QuestionAttemptContext;
  question: StudentQuestion;
  initialState: QuestionState;
  /** Small label above the prompt, e.g. "Question 2 of 5" or "Check for understanding". */
  label?: string;
  /** Optional authored lead-in shown before the prompt (lesson checks). */
  lead?: string;
  /** Lesson the question is embedded in (for simulation engagement events). */
  lessonId?: string;
  /** Freeze all inputs (time is up, attempt submitting). */
  disabled?: boolean;
  /** Called whenever answered/feedback/locked/response change, so a runner can update its navigator. */
  onStateChange?: (questionId: string, state: QuestionState) => void;
  className?: string;
}

type DraftStatus = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; empty: boolean } | { kind: "unreadable"; message: string } | { kind: "error"; message: string };

const DRAFT_DEBOUNCE_MS = 700;

export function QuestionCard({ attempt, question, initialState, label, lead, lessonId, disabled = false, onStateChange, className }: QuestionCardProps) {
  const { attemptId, feedbackMode, assistance, allowSolution } = attempt;
  const immediate = feedbackMode === "immediate";
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const idBase = `q${uid}`;

  const [response, setResponse] = useState<QuestionResponse | null>(() => initialResponse(question, initialState.response));
  const [orderingTouched, setOrderingTouched] = useState(question.type !== "ordering" || initialState.response !== null);
  const [feedback, setFeedback] = useState<FeedbackView | null>(initialState.feedback);
  const [showFeedback, setShowFeedback] = useState(initialState.feedback !== null);
  const [mastery, setMastery] = useState<MasteryChange[]>([]);
  const [tries, setTries] = useState(initialState.tries);
  const [locked, setLocked] = useState(initialState.locked);
  const [pendingReview, setPendingReview] = useState(initialState.pendingReview);
  const [hints, setHints] = useState<string[]>(initialState.hints);
  const [hintsRemaining, setHintsRemaining] = useState(Math.max(0, question.hintCount - initialState.hints.length));
  const [solutionViewed, setSolutionViewed] = useState(initialState.solutionViewed);
  const [revealed, setRevealed] = useState<{ solution: string; correctAnswer: string } | null>(null);
  const [confirmSolution, setConfirmSolution] = useState(false);
  const [busy, setBusy] = useState<null | "submit" | "hint" | "solution">(null);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftStatus>(initialState.answered && !immediate ? { kind: "saved", empty: false } : { kind: "idle" });
  const [answeredDraft, setAnsweredDraft] = useState(!immediate && initialState.answered);

  const keyRef = useRef<string | null>(null);
  const startedAt = useRef<number>(0);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const draftTimer = useRef<number | null>(null);
  const pendingDraft = useRef<{ response: QuestionResponse | null } | null>(null);
  const saveSeq = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // ── report state upward ──
  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);
  const answered = immediate ? tries > 0 || pendingReview : answeredDraft;
  useEffect(() => {
    onStateChangeRef.current?.(question.id, {
      tries,
      answered,
      response,
      hints,
      solutionViewed,
      feedback,
      pendingReview,
      locked,
    });
  }, [question.id, tries, answered, response, hints, solutionViewed, feedback, pendingReview, locked]);

  // ── drafts (deferred modes) ──
  const sendDraft = useCallback(
    async (next: QuestionResponse | null) => {
      const seq = ++saveSeq.current;
      pendingDraft.current = null;
      const body = { questionId: question.id, response: next && !isBlank(next) ? next : null };
      setDraft({ kind: "saving" });
      try {
        const res = await trackDraftSave(apiFetch<{ saved: boolean; message?: string }>(`/api/attempts/${attemptId}/drafts`, { method: "PUT", json: body }));
        if (seq !== saveSeq.current) return;
        if (res.saved) {
          setDraft({ kind: "saved", empty: body.response === null });
          setAnsweredDraft(body.response !== null);
        } else {
          setDraft({ kind: "unreadable", message: res.message ?? "We couldn't read that answer yet." });
          setAnsweredDraft(false);
        }
      } catch (e) {
        if (seq !== saveSeq.current) return;
        setDraft({ kind: "error", message: e instanceof Error ? e.message : "Couldn't save your answer." });
      }
    },
    [attemptId, question.id],
  );

  const scheduleDraft = (next: QuestionResponse | null, delay: number) => {
    if (draftTimer.current) window.clearTimeout(draftTimer.current);
    pendingDraft.current = { response: next };
    setDraft({ kind: "saving" });
    draftTimer.current = window.setTimeout(() => {
      draftTimer.current = null;
      void sendDraft(next);
    }, delay);
  };

  // Navigating to another question before the debounce fires: save anyway.
  useEffect(() => {
    return () => {
      if (draftTimer.current) window.clearTimeout(draftTimer.current);
      const pending = pendingDraft.current;
      if (!pending) return;
      const r = pending.response;
      void trackDraftSave(
        fetch(`/api/attempts/${attemptId}/drafts`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: question.id, response: r && !isBlank(r) ? r : null }),
          keepalive: true,
        }),
      ).catch(() => {});
    };
  }, [attemptId, question.id]);

  // ── input changes ──
  const onChange = (next: QuestionResponse) => {
    setResponse(next);
    setInvalid(null);
    setError(null);
    keyRef.current = null; // a different answer is a different submission
    if (next.type === "ordering") setOrderingTouched(true);
    if (!immediate) {
      const typed = next.type === "numeric" || next.type === "expression" || next.type === "short_response";
      scheduleDraft(next, typed ? DRAFT_DEBOUNCE_MS : 150);
    }
  };

  // ── submit (immediate modes) ──
  const submit = async () => {
    if (!response || isBlank(response)) {
      setInvalid(blankMessage(question.type));
      return;
    }
    setBusy("submit");
    setInvalid(null);
    setError(null);
    const idempotencyKey = (keyRef.current ??= newIdempotencyKey());
    try {
      const res = await apiFetch<SubmitResult>(`/api/attempts/${attemptId}/responses`, {
        json: { questionId: question.id, response, idempotencyKey, timeSpentMs: Math.max(0, Date.now() - startedAt.current) },
      });
      markInteraction();
      keyRef.current = null;
      if (res.status === "invalid") {
        setInvalid(res.message);
      } else if (res.status === "pending_review") {
        setPendingReview(true);
        setLocked(true);
        setTries((n) => n + 1);
      } else {
        setFeedback(res.feedback);
        setShowFeedback(true);
        setTries(res.tryNumber);
        setLocked(res.locked);
        setMastery(res.mastery);
        requestAnimationFrame(() => feedbackRef.current?.focus());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't submit your answer. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  };

  const tryAgain = () => {
    setShowFeedback(false);
    setMastery([]);
    startedAt.current = Date.now();
    requestAnimationFrame(() => inputAreaRef.current?.querySelector<HTMLElement>("input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])")?.focus());
  };

  // ── hints & solution ──
  const showHint = async () => {
    setBusy("hint");
    setError(null);
    try {
      const res = await apiFetch<{ hints: string[]; remaining: number }>(`/api/attempts/${attemptId}/hints`, { json: { questionId: question.id } });
      setHints(res.hints);
      setHintsRemaining(res.remaining);
      markInteraction();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load a hint.");
    } finally {
      setBusy(null);
    }
  };

  const showSolution = async () => {
    setConfirmSolution(false);
    setBusy("solution");
    setError(null);
    try {
      const res = await apiFetch<{ solution: string; correctAnswer: string }>(`/api/attempts/${attemptId}/solution`, { json: { questionId: question.id } });
      setRevealed(res);
      setSolutionViewed(true);
      markInteraction();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the solution.");
    } finally {
      setBusy(null);
    }
  };

  const onSimInteract = useSimulationEngagement({ simId: question.stimulus?.simulation.id ?? "", lessonId, questionId: lessonId ? undefined : question.id });

  // ── derived UI state ──
  const feedbackVisible = immediate && showFeedback && feedback !== null;
  const inputsDisabled = disabled || locked || busy === "submit" || feedbackVisible || pendingReview;
  const canHint = assistance !== "disabled" && question.hintCount > 0 && !locked && !disabled;
  const solutionFromFeedback = feedback?.solution ?? null;
  const canShowSolution = allowSolution && immediate && assistance !== "disabled" && !locked && !disabled && !revealed && !solutionFromFeedback;
  const canTryAgain = feedbackVisible && !feedback.correct && !locked && !disabled;
  const headingId = `${idBase}-prompt`;

  return (
    <article aria-labelledby={headingId} className={cn("min-w-0 rounded-card border border-line bg-surface shadow-card", className)}>
      <div className="space-y-5 p-5 sm:p-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {label ? <p className="text-[0.8125rem] font-medium text-accent">{label}</p> : <span />}
            <StatusChip immediate={immediate} answered={answered} feedback={feedback} pendingReview={pendingReview} tries={tries} />
          </div>
          {lead ? <p className="text-sm text-muted">{lead}</p> : null}
          <div id={headingId}>
            <Markdown compact className="text-ink">
              {question.prompt}
            </Markdown>
          </div>
        </header>

        {question.stimulus ? (
          <div className="space-y-1.5">
            <Simulation id={question.stimulus.simulation.id} params={question.stimulus.simulation.params} compact onInteract={onSimInteract} />
            <p className="text-xs text-muted">Use the simulation to answer. Exploring it doesn&apos;t change your mastery — your answer does.</p>
          </div>
        ) : null}

        <div ref={inputAreaRef}>
          <ResponseInput question={question} value={response} onChange={onChange} disabled={inputsDisabled} idBase={idBase} error={invalid} />
        </div>

        {hints.length > 0 ? (
          <div className="rounded-lg border border-info/25 bg-info-soft p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Lightbulb aria-hidden="true" className="size-4 text-info" />
              {hints.length === 1 ? "Hint" : "Hints"}
            </p>
            <ol className="mt-2 space-y-2" aria-live="polite">
              {hints.map((h, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="shrink-0 font-medium tabular-nums text-muted">{i + 1}.</span>
                  <Markdown compact className="min-w-0 text-ink-2">
                    {h}
                  </Markdown>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {revealed ? (
          <div className="rounded-lg border border-line bg-surface-2 p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Eye aria-hidden="true" className="size-4 text-muted" />
              Worked solution
            </p>
            <p className="mt-1 text-xs text-muted">You viewed the solution, so an answer to this question now earns only minimal mastery credit.</p>
            <Markdown compact className="mt-3">
              {revealed.solution}
            </Markdown>
          </div>
        ) : null}

        {pendingReview ? (
          <div role="status" className="flex items-start gap-2.5 rounded-lg border border-line bg-surface-2 p-3 text-sm">
            <Clock3 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
            <p className="text-ink-2">
              <span className="font-medium text-ink">Submitted for review.</span> Your teacher scores written answers against the rubric; it counts toward mastery once scored.
            </p>
          </div>
        ) : null}

        {feedbackVisible ? (
          <FeedbackPanel
            ref={feedbackRef}
            id={`${idBase}-feedback`}
            feedback={feedback}
            mastery={mastery}
            meta={tries > 1 ? `Try ${tries} — retries after feedback count for less toward mastery.` : undefined}
            hideSolution={Boolean(revealed)}
          />
        ) : null}

        {error ? (
          <p role="alert" className="flex items-start gap-2 text-sm font-medium text-bad">
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>

      {/* actions */}
      <div className="flex flex-col gap-3 rounded-b-card border-t border-line bg-surface-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {canHint ? (
            hintsRemaining > 0 ? (
              <Button variant="ghost" size="sm" icon={<Lightbulb aria-hidden="true" className="size-4" />} onClick={showHint} loading={busy === "hint"} disabled={busy !== null}>
                {hints.length === 0 ? "Get a hint" : `Next hint (${hintsRemaining} left)`}
              </Button>
            ) : (
              <span className="text-xs text-muted">No more hints for this question.</span>
            )
          ) : null}
          {canShowSolution ? (
            <Button variant="ghost" size="sm" icon={<Eye aria-hidden="true" className="size-4" />} onClick={() => setConfirmSolution(true)} disabled={busy !== null}>
              Show solution
            </Button>
          ) : null}
          {canHint && hints.length === 0 && hintsRemaining > 0 ? (
            <p className="w-full text-xs text-muted sm:w-auto">Using a hint lowers how much this answer counts toward mastery.</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {immediate ? (
            locked || pendingReview ? null : canTryAgain ? (
              <Button variant="secondary" icon={<RotateCcw aria-hidden="true" className="size-4" />} onClick={tryAgain}>
                Try again
              </Button>
            ) : feedbackVisible ? null : (
              <Button onClick={submit} loading={busy === "submit"} loadingText="Checking…" disabled={disabled || busy !== null}>
                Check answer
              </Button>
            )
          ) : (
            <DraftIndicator status={draft} />
          )}
          {!immediate && question.type === "ordering" && !orderingTouched && !locked && !disabled ? (
            <Button variant="secondary" size="sm" onClick={() => onChange({ type: "ordering", order: (response?.type === "ordering" ? response.order : []) })}>
              Use this order
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog
        open={confirmSolution}
        onClose={() => setConfirmSolution(false)}
        title="Show the worked solution?"
        description="You can still answer afterwards, but it will earn only minimal mastery credit — the solution did the thinking."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmSolution(false)}>
              Keep trying
            </Button>
            <Button onClick={showSolution}>Show solution</Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">If you&apos;re stuck, a hint usually costs less credit than the full solution.</p>
      </Dialog>
    </article>
  );
}

function StatusChip({ immediate, answered, feedback, pendingReview, tries }: { immediate: boolean; answered: boolean; feedback: FeedbackView | null; pendingReview: boolean; tries: number }) {
  if (pendingReview) return <Badge tone="info">Awaiting review</Badge>;
  if (immediate && feedback) {
    if (feedback.correct) return <Badge tone="good" icon={<CheckCircle2 className="size-3" />}>{tries > 1 ? `Correct on try ${tries}` : "Correct"}</Badge>;
    return <Badge tone={feedback.score > 0 ? "warn" : "bad"}>{feedback.score > 0 ? "Partly correct" : "Incorrect"}</Badge>;
  }
  if (!immediate && answered) return <Badge tone="accent">Answered</Badge>;
  return null;
}

function DraftIndicator({ status }: { status: DraftStatus }) {
  return (
    <p className="flex min-h-8 items-center gap-1.5 text-xs" role="status" aria-live="polite">
      {status.kind === "saving" ? (
        <>
          <Spinner size="sm" />
          <span className="text-muted">Saving…</span>
        </>
      ) : status.kind === "saved" ? (
        <>
          <CheckCircle2 aria-hidden="true" className="size-3.5 text-good" />
          <span className="text-muted">{status.empty ? "Answer cleared" : "Saved"}</span>
        </>
      ) : status.kind === "unreadable" ? (
        <>
          <AlertCircle aria-hidden="true" className="size-3.5 text-warn" />
          <span className="font-medium text-warn">Not saved: {status.message}</span>
        </>
      ) : status.kind === "error" ? (
        <>
          <AlertCircle aria-hidden="true" className="size-3.5 text-bad" />
          <span className="font-medium text-bad">{status.message}</span>
        </>
      ) : (
        <span className="text-muted">Answers save automatically.</span>
      )}
    </p>
  );
}
