"use client";
/**
 * WorkedExample — reveals a worked solution one step at a time so the
 * student can predict each step before seeing it. Step content is rendered
 * on the server and passed in. Keyboard: the buttons, plus "N" for the next
 * step while focus is inside the example; focus moves to each revealed step.
 */
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronsDown, ListOrdered, RotateCcw } from "lucide-react";
import { Button, Kbd } from "@/components/ui";

export interface WorkedExampleProps {
  title: string;
  problem: ReactNode;
  steps: { title?: string; body: ReactNode }[];
  answer?: ReactNode;
}

export function WorkedExample({ title, problem, steps, answer }: WorkedExampleProps) {
  const [shown, setShown] = useState(0);
  const [announce, setAnnounce] = useState("");
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const nextRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const total = steps.length;
  const done = shown >= total;

  const reveal = (count: number) => {
    const next = Math.min(total, Math.max(0, count));
    const first = shown;
    setShown(next);
    setAnnounce(next >= total ? `All ${total} steps shown.` : `Step ${next} of ${total} shown.`);
    requestAnimationFrame(() => {
      if (next === 0) nextRef.current?.focus();
      else stepRefs.current[count > first + 1 ? first : next - 1]?.focus();
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key.toLowerCase() !== "n" || e.altKey || e.ctrlKey || e.metaKey) return;
    if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable]")) return;
    if (done) return;
    e.preventDefault();
    reveal(shown + 1);
  };

  return (
    <section aria-labelledby={headingId} onKeyDown={onKeyDown} className="rounded-card border border-line bg-surface shadow-card">
      <div className="border-b border-line px-5 py-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Worked example</p>
        <h2 id={headingId} className="mt-1 font-display text-[1.0625rem] font-semibold text-ink">
          {title}
        </h2>
        <div className="mt-2 text-ink">{problem}</div>
      </div>

      <div className="px-5 py-4 sm:px-6">
        {shown > 0 ? (
          <ol className="space-y-4">
            {steps.slice(0, shown).map((s, i) => (
              <li
                key={i}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                tabIndex={-1}
                className="flex gap-3 rounded-lg focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                <span aria-hidden="true" className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold tabular-nums text-accent-ink">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">
                    <span className="sr-only">Step {i + 1} of {total}: </span>
                    {s.title ?? `Step ${i + 1}`}
                  </p>
                  <div className="mt-1">{s.body}</div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">
            Try the problem yourself first, then reveal the solution one step at a time. ({total} step{total === 1 ? "" : "s"})
          </p>
        )}

        {done && answer ? (
          <div className="mt-5 rounded-lg border border-good/30 bg-good-soft px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-good">Answer</p>
            <div className="mt-1 text-ink">{answer}</div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-b-card border-t border-line bg-surface-2 px-5 py-3 sm:px-6">
        <p className="text-xs tabular-nums text-muted">
          {shown} of {total} steps shown
          {!done ? (
            <span className="ml-2 hidden sm:inline">
              Press <Kbd>N</Kbd> for the next step
            </span>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-2">
          {done ? (
            <Button variant="ghost" size="sm" icon={<RotateCcw aria-hidden="true" className="size-4" />} onClick={() => reveal(0)}>
              Start over
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" icon={<ChevronsDown aria-hidden="true" className="size-4" />} onClick={() => reveal(total)}>
                Show all
              </Button>
              <Button ref={nextRef} variant="secondary" size="sm" icon={<ListOrdered aria-hidden="true" className="size-4" />} onClick={() => reveal(shown + 1)}>
                {shown === 0 ? "Show first step" : "Show next step"}
              </Button>
            </>
          )}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </section>
  );
}
