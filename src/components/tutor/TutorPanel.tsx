"use client";
/**
 * TutorPanel — the AI tutor, embedded in the lesson player / attempt runner
 * (a section of the page, not a floating chatbot). Contract: ./types.ts.
 *
 *  - Availability is shown honestly: not configured, disabled by the teacher
 *    (with their reason), or available. A server reply can also switch it.
 *  - Intent buttons (Explain, Hint, Example, Walk me through it, Explain my
 *    mistake — only with a questionId — Practice something similar), free
 *    text and suggestion chips. The conversation lives in local state only;
 *    the last 8 turns go back to the server as `history`.
 *  - Every reply is labelled AI-generated, lists what the tutor could see,
 *    and says when using it reduces mastery credit on the current question.
 *  - compact: collapsed behind a toggle; Esc closes it.
 */
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  Info,
  Lightbulb,
  ListOrdered,
  MessageSquareText,
  RefreshCw,
  Send,
  Shapes,
  Sparkles,
  Target,
  Wand2,
  X,
} from "lucide-react";
import { Markdown } from "@/components/content/Markdown";
import { Badge, Button, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { TutorPanelProps } from "./types";

type Intent =
  "explain" | "hint" | "example" | "walkthrough" | "explain_mistake" | "similar" | "free";

interface Turn {
  id: number;
  role: "user" | "assistant";
  content: string;
  intent?: Intent;
  usedContext?: string[];
  assistanceRecorded?: boolean;
}

type Availability = TutorPanelProps["availability"];

type TutorResponse =
  | {
      status: "ok";
      reply: string;
      aiGenerated: true;
      usedContext: string[];
      assistanceRecorded: boolean;
      notice: string | null;
    }
  | { status: "disabled"; reason: string }
  | { status: "not_configured" }
  | { status: "rate_limited"; retryAfterSeconds: number }
  | { status: "error"; message: string };

const MAX_HISTORY = 8;
const MAX_CHARS = 2000;

const INTENTS: {
  id: Exclude<Intent, "free">;
  label: string;
  message: string;
  icon: typeof Lightbulb;
  needsQuestion?: boolean;
}[] = [
  { id: "explain", label: "Explain", message: "Explain this idea to me.", icon: MessageSquareText },
  {
    id: "hint",
    label: "Give me a hint",
    message: "Can I have a hint for the next step?",
    icon: Lightbulb,
  },
  {
    id: "example",
    label: "Show an example",
    message: "Show me a worked example like this.",
    icon: Shapes,
  },
  {
    id: "walkthrough",
    label: "Walk me through it",
    message: "Walk me through this one step at a time.",
    icon: ListOrdered,
  },
  {
    id: "explain_mistake",
    label: "Explain my mistake",
    message: "Help me understand what went wrong in my answer.",
    icon: Target,
    needsQuestion: true,
  },
  {
    id: "similar",
    label: "Practice something similar",
    message: "Give me a similar problem to practise.",
    icon: Wand2,
  },
];

const clock = () => Date.now();

const plain = (md: string) =>
  md
    .replace(/\$\$[\s\S]*?\$\$/g, " (equation) ")
    .replace(/[*_#>`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);

export function TutorPanel({
  context,
  suggestions = [],
  availability,
  compact = false,
}: TutorPanelProps) {
  const uid = useId();
  const [avail, setAvail] = useState<Availability>(availability);
  const [open, setOpen] = useState(!compact);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Intent | null>(null);
  const [error, setError] = useState<{
    message: string;
    retry: { intent: Intent; message: string };
  } | null>(null);
  const [limitedUntil, setLimitedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(clock);
  const [announce, setAnnounce] = useState("");
  const [assisted, setAssisted] = useState(false);
  const nextId = useRef(1);
  const listRef = useRef<HTMLOListElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hasQuestion = Boolean(context.questionId);
  const limited = limitedUntil !== null && now < limitedUntil;
  const busy = pending !== null;

  // Tick while rate limited so the countdown and buttons update.
  useEffect(() => {
    if (limitedUntil === null) return;
    const t = window.setInterval(() => {
      const n = clock();
      setNow(n);
      if (n >= limitedUntil) {
        setLimitedUntil(null);
        window.clearInterval(t);
      }
    }, 1000);
    return () => window.clearInterval(t);
  }, [limitedUntil]);

  // Keep the newest turn in view.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns.length, pending]);

  const ask = async (intent: Intent, message: string) => {
    const text = message.trim().slice(0, MAX_CHARS);
    if (!text || busy || limited) return;
    setError(null);
    const history = turns
      .slice(-MAX_HISTORY)
      .map((t) => ({ role: t.role, content: t.content.slice(0, MAX_CHARS) }));
    const userTurn: Turn = { id: nextId.current++, role: "user", content: text, intent };
    setTurns((prev) => [...prev, userTurn]);
    setPending(intent);
    setAnnounce("The tutor is thinking…");
    let data: TutorResponse | null = null;
    let failure: string | null = null;
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, message: text, history, context }),
      });
      const body = (await res.json().catch(() => null)) as {
        status?: unknown;
        error?: { message?: string };
      } | null;
      if (body && typeof body.status === "string") data = body as TutorResponse;
      else failure = body?.error?.message ?? `The tutor couldn't answer (${res.status}).`;
    } catch {
      failure = "You appear to be offline. Check your connection and try again.";
    }
    setPending(null);

    const dropUserTurn = () => setTurns((prev) => prev.filter((t) => t.id !== userTurn.id));
    if (failure || !data) {
      dropUserTurn();
      setError({ message: failure ?? "Something went wrong.", retry: { intent, message: text } });
      setAnnounce(`Tutor error: ${failure}`);
      return;
    }
    switch (data.status) {
      case "ok": {
        const reply = data;
        setTurns((prev) => [
          ...prev,
          {
            id: nextId.current++,
            role: "assistant",
            content: reply.reply,
            usedContext: reply.usedContext,
            assistanceRecorded: reply.assistanceRecorded,
          },
        ]);
        if (reply.assistanceRecorded) setAssisted(true);
        setAnnounce(`Tutor reply (AI-generated): ${plain(reply.reply)}`);
        break;
      }
      case "rate_limited": {
        dropUserTurn();
        const started = clock();
        const until = started + Math.max(1, data.retryAfterSeconds) * 1000;
        setNow(started);
        setLimitedUntil(until);
        setInput((cur) => cur || text);
        setAnnounce("You've reached the tutor's limit for now.");
        break;
      }
      case "disabled":
        dropUserTurn();
        setAvail({ status: "disabled", reason: data.reason });
        setAnnounce(data.reason);
        break;
      case "not_configured":
        dropUserTurn();
        setAvail({ status: "not_configured" });
        setAnnounce("The AI tutor isn't set up on this server.");
        break;
      case "error":
        dropUserTurn();
        setError({ message: data.message, retry: { intent, message: text } });
        setAnnounce(`Tutor error: ${data.message}`);
        break;
    }
  };

  const submit = () => {
    const text = input;
    if (!text.trim()) return;
    setInput("");
    void ask("free", text);
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const onInputKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const close = () => {
    setOpen(false);
    window.requestAnimationFrame(() => toggleRef.current?.focus());
  };

  const secondsLeft = limitedUntil ? Math.max(0, Math.ceil((limitedUntil - now) / 1000)) : 0;
  const waitText =
    secondsLeft >= 90 ? `${Math.ceil(secondsLeft / 60)} minutes` : `${secondsLeft} seconds`;

  const header = (
    <div className="flex items-center justify-between gap-3">
      <h2
        id={`${uid}-title`}
        className="flex items-center gap-2 font-display text-base font-semibold text-ink"
      >
        <Sparkles aria-hidden="true" className="size-4 text-accent" />
        AI tutor
      </h2>
      <div className="flex items-center gap-2">
        {avail.status === "available" ? (
          <Badge tone="accent">Available</Badge>
        ) : avail.status === "disabled" ? (
          <Badge tone="neutral">Turned off</Badge>
        ) : (
          <Badge tone="neutral">Not set up</Badge>
        )}
        {compact ? (
          <button
            type="button"
            onClick={close}
            aria-label="Close the tutor"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-ink"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );

  const body =
    avail.status === "not_configured" ? (
      <p className="mt-3 flex gap-2 text-sm leading-relaxed text-muted">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        The AI tutor isn&apos;t set up on this server yet. Hints and worked solutions still work.
      </p>
    ) : avail.status === "disabled" ? (
      <p className="mt-3 flex gap-2 text-sm leading-relaxed text-muted">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {avail.reason}
      </p>
    ) : (
      <div className="mt-3 space-y-3">
        {hasQuestion ? (
          <p
            className={cn(
              "flex gap-2 rounded-lg px-3 py-2 text-xs leading-relaxed",
              assisted ? "bg-warn-soft text-warn" : "bg-surface-2 text-muted",
            )}
          >
            <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            {assisted
              ? "Because you used the tutor on this question, your answer will count for less toward mastery."
              : "Using the tutor on this question is recorded, and your answer will then count for less toward mastery."}
          </p>
        ) : null}

        <div role="group" aria-label="What kind of help?" className="flex flex-wrap gap-1.5">
          {INTENTS.filter((i) => !i.needsQuestion || hasQuestion).map((i) => (
            <button
              key={i.id}
              type="button"
              disabled={busy || limited}
              onClick={() => void ask(i.id, i.message)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-[0.8125rem] font-medium text-ink-2 hover:border-faint hover:bg-surface-2 hover:text-ink disabled:opacity-55"
            >
              {pending === i.id ? (
                <Spinner size="sm" />
              ) : (
                <i.icon aria-hidden="true" className="size-3.5" />
              )}
              {i.label}
            </button>
          ))}
        </div>

        {turns.length > 0 || busy ? (
          <ol
            ref={listRef}
            aria-label="Conversation with the tutor"
            className="max-h-[28rem] space-y-3 overflow-y-auto pr-1"
          >
            {turns.map((t) =>
              t.role === "user" ? (
                <li
                  key={t.id}
                  className="ml-8 rounded-xl rounded-br-sm bg-accent-soft px-3 py-2 text-sm text-ink"
                >
                  <span className="sr-only">You: </span>
                  {t.content}
                </li>
              ) : (
                <li
                  key={t.id}
                  className="mr-2 rounded-xl rounded-bl-sm border border-line bg-surface px-3 py-2.5"
                >
                  <p className="mb-1.5 flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted">
                    <Bot aria-hidden="true" className="size-3.5" />
                    AI-generated — check it against your lesson
                  </p>
                  <Markdown compact className="text-[0.9375rem]">
                    {t.content}
                  </Markdown>
                  {t.assistanceRecorded ? (
                    <p className="mt-2 flex gap-1.5 text-xs text-warn">
                      <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                      Because you used the tutor on this question, your answer will count for less
                      toward mastery.
                    </p>
                  ) : null}
                  {t.usedContext && t.usedContext.length ? (
                    <details className="group mt-2 text-xs text-muted">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded font-medium hover:text-ink [&::-webkit-details-marker]:hidden">
                        <ChevronDown
                          aria-hidden="true"
                          className="size-3.5 transition-transform group-open:rotate-180"
                        />
                        What the tutor could see
                      </summary>
                      <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                        {t.usedContext.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </li>
              ),
            )}
            {busy ? (
              <li className="mr-2 flex items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2.5 text-sm text-muted">
                <Spinner size="sm" /> Thinking…
              </li>
            ) : null}
          </ol>
        ) : suggestions.length ? null : (
          <p className="text-sm text-muted">
            Pick the kind of help you want, or ask your own question. The tutor sees only
            what&apos;s on this page.
          </p>
        )}

        {suggestions.length && turns.length === 0 && !busy ? (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted">Try asking</p>
            <ul className="flex flex-wrap gap-1.5">
              {suggestions.slice(0, 4).map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    disabled={limited}
                    onClick={() => void ask("free", s)}
                    className="rounded-lg border border-dashed border-line-strong px-2.5 py-1 text-left text-[0.8125rem] text-ink-2 hover:border-accent hover:text-ink disabled:opacity-55"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 rounded-lg border border-bad/30 bg-bad-soft px-3 py-2 text-sm text-bad"
          >
            <span className="min-w-0 flex-1">{error.message}</span>
            <Button
              size="sm"
              variant="secondary"
              icon={<RefreshCw aria-hidden="true" className="size-3.5" />}
              onClick={() => void ask(error.retry.intent, error.retry.message)}
              disabled={busy || limited}
            >
              Try again
            </Button>
          </div>
        ) : null}
        {limited ? (
          <p role="status" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
            You&apos;ve reached the tutor&apos;s limit for now. Try again in {waitText}. Hints and
            worked solutions still work.
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <label htmlFor={`${uid}-input`} className="sr-only">
            Ask the tutor
          </label>
          <textarea
            ref={inputRef}
            id={`${uid}-input`}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={onInputKey}
            rows={2}
            maxLength={MAX_CHARS}
            placeholder="Ask your own question…"
            disabled={limited}
            className="block min-h-11 w-full flex-1 resize-y rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink shadow-card placeholder:text-faint focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent disabled:bg-sunken"
          />
          <Button
            type="submit"
            size="md"
            disabled={!input.trim() || busy || limited}
            aria-label="Send question"
            icon={<Send aria-hidden="true" className="size-4" />}
          >
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
        <p className="text-[0.6875rem] text-faint">
          Enter to send · Shift+Enter for a new line · Conversations aren&apos;t saved.
        </p>
      </div>
    );

  const live = (
    <div aria-live="polite" role="status" className="sr-only">
      {announce}
    </div>
  );

  if (compact && !open) {
    return (
      <div>
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={false}
          aria-controls={`${uid}-panel`}
          onClick={() => {
            setOpen(true);
            window.requestAnimationFrame(() => inputRef.current?.focus());
          }}
          className="inline-flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink shadow-card hover:bg-surface-2"
        >
          <span className="inline-flex items-center gap-2">
            <Sparkles aria-hidden="true" className="size-4 text-accent" />
            Ask the AI tutor
          </span>
          <span className="text-xs font-normal text-muted">
            {avail.status === "available"
              ? "Available"
              : avail.status === "disabled"
                ? "Turned off"
                : "Not set up"}
          </span>
        </button>
        {live}
      </div>
    );
  }

  return (
    <section
      id={`${uid}-panel`}
      aria-labelledby={`${uid}-title`}
      onKeyDown={(e) => {
        if (compact && e.key === "Escape") {
          e.stopPropagation();
          close();
        }
      }}
      className="rounded-card border border-line bg-surface p-4 shadow-card"
    >
      {header}
      {body}
      {live}
    </section>
  );
}
