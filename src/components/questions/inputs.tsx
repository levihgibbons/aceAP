"use client";
/**
 * Answer inputs for every StudentQuestion type. Each is controlled: it gets
 * the current (possibly partial) response and reports the next one.
 */
import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { InlineMarkdown } from "@/components/content/Markdown";
import { Checkbox, Field, Input, RadioGroup, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import { renderExpressionPreview } from "./expressionPreview";
import type { QuestionResponse, StudentQuestion } from "./types";

export interface ResponseInputProps {
  question: StudentQuestion;
  value: QuestionResponse | null;
  onChange: (next: QuestionResponse) => void;
  disabled?: boolean;
  /** Prefix for element ids (unique per attempt + question). */
  idBase: string;
  /** Inline validation message (e.g. "We couldn't read that"), tied to the input. */
  error?: string | null;
}

export function ResponseInput(props: ResponseInputProps) {
  switch (props.question.type) {
    case "multiple_choice":
      return <MultipleChoiceInput {...props} />;
    case "multi_select":
      return <MultiSelectInput {...props} />;
    case "numeric":
      return <NumericInput {...props} />;
    case "expression":
      return <ExpressionInput {...props} />;
    case "ordering":
      return <OrderingInput {...props} />;
    case "matching":
      return <MatchingInput {...props} />;
    case "short_response":
      return <ShortResponseInput {...props} />;
  }
}

/**
 * Choice label with a screen-reader-only "Choice A:" prefix. A choice that is
 * pure math renders as KaTeX (MathML + aria-hidden HTML), which some assistive
 * tech and checkers can't turn into a name; the prefix guarantees every
 * option has a non-empty accessible name and gives a stable way to refer to it.
 */
function ChoiceLabel({ index, text }: { index: number; text: string }) {
  return (
    <>
      <span className="sr-only">Choice {String.fromCharCode(65 + index)}: </span>
      <InlineMarkdown>{text}</InlineMarkdown>
    </>
  );
}

function MultipleChoiceInput({ question, value, onChange, disabled, idBase, error }: ResponseInputProps) {
  const selected = value?.type === "multiple_choice" ? value.choiceId : undefined;
  return (
    <RadioGroup
      name={`${idBase}-choice`}
      legend="Choose one answer"
      variant="cards"
      value={selected ?? ""}
      onChange={(choiceId) => onChange({ type: "multiple_choice", choiceId })}
      error={error ?? undefined}
      options={(question.choices ?? []).map((c, i) => ({ value: c.id, label: <ChoiceLabel index={i} text={c.text} />, disabled }))}
    />
  );
}

function MultiSelectInput({ question, value, onChange, disabled, idBase, error }: ResponseInputProps) {
  const picked = new Set(value?.type === "multi_select" ? value.choiceIds : []);
  const errorId = `${idBase}-ms-error`;
  const toggle = (id: string, on: boolean) => {
    const next = new Set(picked);
    if (on) next.add(id);
    else next.delete(id);
    // Keep the authored display order.
    onChange({ type: "multi_select", choiceIds: (question.choices ?? []).map((c) => c.id).filter((c) => next.has(c)) });
  };
  return (
    <fieldset className="min-w-0" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-sm font-medium text-ink">Select all that apply</legend>
      <div className="grid gap-2">
        {(question.choices ?? []).map((c, i) => (
          <div
            key={c.id}
            className={cn(
              "rounded-lg border border-line-strong bg-surface p-3 transition-colors hover:border-faint has-checked:border-accent has-checked:bg-accent-soft",
              disabled && "opacity-70 hover:border-line-strong",
            )}
          >
            <Checkbox
              id={`${idBase}-ms-${c.id}`}
              checked={picked.has(c.id)}
              disabled={disabled}
              onChange={(e) => toggle(c.id, e.currentTarget.checked)}
              label={<ChoiceLabel index={i} text={c.text} />}
            />
          </div>
        ))}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-bad">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function NumericInput({ question, value, onChange, disabled, idBase, error }: ResponseInputProps) {
  const id = `${idBase}-numeric`;
  const unitId = `${id}-unit`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const v = value?.type === "numeric" ? value.value : "";
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        Your answer
      </label>
      <div className="flex max-w-sm items-center gap-2">
        <Input
          id={id}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={v}
          disabled={disabled}
          maxLength={100}
          aria-describedby={[error ? errorId : null, question.unit ? unitId : null, hintId].filter(Boolean).join(" ")}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange({ type: "numeric", value: e.currentTarget.value })}
          className="font-mono tabular-nums"
        />
        {question.unit ? (
          <span id={unitId} className="shrink-0 text-sm font-medium text-ink-2">
            <span className="sr-only">Unit: </span>
            {question.unit}
          </span>
        ) : null}
      </div>
      <p id={hintId} className="text-xs text-muted">
        Enter a number, for example 3.5, -7/2 or 2*sqrt(3).
      </p>
      {error ? (
        <p id={errorId} className="text-xs font-medium text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ExpressionInput({ question, value, onChange, disabled, idBase, error }: ResponseInputProps) {
  const id = `${idBase}-expr`;
  const previewId = `${id}-preview`;
  const v = value?.type === "expression" ? value.value : "";
  const [preview, setPreview] = useState<{ for: string; html: string | null } | null>(null);
  const variables = question.variables ?? [];
  const varsKey = variables.join(",");

  useEffect(() => {
    if (!v.trim()) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      renderExpressionPreview(v, varsKey ? varsKey.split(",") : [])
        .then((html) => {
          if (!cancelled) setPreview({ for: v, html });
        })
        .catch(() => {
          if (!cancelled) setPreview({ for: v, html: null });
        });
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [v, varsKey]);

  const current = v.trim() && preview?.for === v ? preview : null;
  const hint = [question.inputHint ?? "Use ^ for powers and * for multiplication.", variables.length ? `Variable${variables.length > 1 ? "s" : ""}: ${variables.join(", ")}.` : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-2">
      <Field label="Your answer" htmlFor={id} hint={hint} error={error ?? undefined}>
        <Input
          id={id}
          type="text"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={v}
          disabled={disabled}
          maxLength={200}
          aria-describedby={previewId}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange({ type: "expression", value: e.currentTarget.value })}
          className="font-mono"
          placeholder="Type your answer, e.g. 4x(2x^2-1)^3"
        />
      </Field>
      <div id={previewId} className="flex min-h-11 items-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface-2 px-3 py-2">
        <span className="shrink-0 text-xs font-medium text-muted">Preview</span>
        {!v.trim() ? (
          <span className="text-sm text-faint">Your answer will appear here as math.</span>
        ) : current?.html ? (
          // KaTeX output of the student's own input (trust: false), never authored HTML.
          <span className="min-w-0 overflow-x-auto text-base text-ink" dangerouslySetInnerHTML={{ __html: current.html }} />
        ) : current ? (
          <span className="text-sm text-muted">No preview for this yet — you can still check your answer.</span>
        ) : (
          <span className="text-sm text-faint">…</span>
        )}
      </div>
    </div>
  );
}

function OrderingInput({ question, value, onChange, disabled, idBase }: ResponseInputProps) {
  const items = question.items ?? [];
  const order = value?.type === "ordering" && value.order.length === items.length ? value.order : items.map((i) => i.id);
  const [announcement, setAnnouncement] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const text = (id: string) => items.find((i) => i.id === id)?.text ?? id;
  const plain = (s: string) => s.replace(/\$([^$]*)\$/g, "$1").replace(/[*_`]/g, "");

  const move = (from: number, to: number, focusId?: string, dir?: "up" | "down") => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [id] = next.splice(from, 1);
    next.splice(to, 0, id);
    onChange({ type: "ordering", order: next });
    setAnnouncement(`${plain(text(id))} moved to position ${to + 1} of ${next.length}.`);
    if (focusId && dir) {
      requestAnimationFrame(() => {
        const target = buttons.current.get(`${focusId}:${dir}`) ?? buttons.current.get(`${focusId}:${dir === "up" ? "down" : "up"}`);
        target?.focus();
      });
    }
  };

  const onDrop = (e: DragEvent, to: number) => {
    e.preventDefault();
    const id = dragging ?? e.dataTransfer.getData("text/plain");
    setDragging(null);
    setOverIndex(null);
    const from = order.indexOf(id);
    if (from >= 0) move(from, to);
  };

  return (
    <div>
      <p id={`${idBase}-order-help`} className="mb-2 text-sm font-medium text-ink">
        Put these in order
        <span className="ml-1 font-normal text-muted">— drag the rows, or use the arrow buttons.</span>
      </p>
      <ol aria-describedby={`${idBase}-order-help`} className="grid gap-2">
        {order.map((id, i) => (
          <li
            key={id}
            draggable={!disabled}
            onDragStart={(e) => {
              setDragging(id);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", id);
            }}
            onDragEnd={() => {
              setDragging(null);
              setOverIndex(null);
            }}
            onDragOver={(e) => {
              if (!dragging) return;
              e.preventDefault();
              setOverIndex(i);
            }}
            onDrop={(e) => onDrop(e, i)}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-line-strong bg-surface p-2 pl-1.5 transition-colors",
              !disabled && "cursor-grab active:cursor-grabbing",
              dragging === id && "opacity-50",
              overIndex === i && dragging !== id && "border-accent bg-accent-soft",
            )}
          >
            <GripVertical aria-hidden="true" className={cn("size-4 shrink-0 text-faint", disabled && "invisible")} />
            <span aria-hidden="true" className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-sunken text-xs font-semibold tabular-nums text-ink-2">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 text-sm text-ink">
              <span className="sr-only">Position {i + 1}: </span>
              <InlineMarkdown>{text(id)}</InlineMarkdown>
            </span>
            <span className="flex shrink-0 gap-1">
              <button
                type="button"
                ref={(el) => {
                  if (el) buttons.current.set(`${id}:up`, el);
                  else buttons.current.delete(`${id}:up`);
                }}
                disabled={disabled || i === 0}
                onClick={() => move(i, i - 1, id, "up")}
                aria-label={`Move "${plain(text(id))}" up`}
                className="inline-flex size-9 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-35"
              >
                <ArrowUp aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                ref={(el) => {
                  if (el) buttons.current.set(`${id}:down`, el);
                  else buttons.current.delete(`${id}:down`);
                }}
                disabled={disabled || i === order.length - 1}
                onClick={() => move(i, i + 1, id, "down")}
                aria-label={`Move "${plain(text(id))}" down`}
                className="inline-flex size-9 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-35"
              >
                <ArrowDown aria-hidden="true" className="size-4" />
              </button>
            </span>
          </li>
        ))}
      </ol>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

function MatchingInput({ question, value, onChange, disabled, idBase, error }: ResponseInputProps) {
  const pairs = value?.type === "matching" ? value.pairs : {};
  const right = question.right ?? [];
  const errorId = `${idBase}-match-error`;
  return (
    <fieldset className="min-w-0" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-sm font-medium text-ink">Match each item on the left with one on the right</legend>
      <div className="grid gap-2">
        {(question.left ?? []).map((l) => {
          const id = `${idBase}-match-${l.id}`;
          return (
            <div key={l.id} className="grid items-center gap-2 rounded-lg border border-line bg-surface-2 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-4">
              <label htmlFor={id} className="min-w-0 text-sm text-ink">
                <InlineMarkdown>{l.text}</InlineMarkdown>
              </label>
              <Select
                id={id}
                value={pairs[l.id] ?? ""}
                disabled={disabled}
                onChange={(e) => {
                  const next = { ...pairs };
                  if (e.currentTarget.value) next[l.id] = e.currentTarget.value;
                  else delete next[l.id];
                  onChange({ type: "matching", pairs: next });
                }}
              >
                <option value="">Choose a match…</option>
                {right.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.text.replace(/\$([^$]*)\$/g, "$1")}
                  </option>
                ))}
              </Select>
            </div>
          );
        })}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-bad">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function ShortResponseInput({ question, value, onChange, disabled, idBase, error }: ResponseInputProps) {
  const id = `${idBase}-text`;
  const rubricId = useId();
  const v = value?.type === "short_response" ? value.text : "";
  return (
    <div className="space-y-3">
      {question.rubric?.length ? (
        <div id={rubricId} className="rounded-lg border border-line bg-surface-2 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Your teacher will score this against</p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
            {question.rubric.map((r) => (
              <li key={r.id} className="flex gap-2">
                <span className="shrink-0 rounded bg-sunken px-1.5 text-xs font-medium leading-5 tabular-nums text-ink-2">
                  {r.points} pt{r.points === 1 ? "" : "s"}
                </span>
                <span className="min-w-0">
                  <InlineMarkdown>{r.description}</InlineMarkdown>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Field label="Your response" htmlFor={id} hint={`${v.length} / 5000 characters`} error={error ?? undefined}>
        <Textarea
          id={id}
          rows={6}
          value={v}
          maxLength={5000}
          disabled={disabled}
          aria-describedby={question.rubric?.length ? rubricId : undefined}
          onChange={(e) => onChange({ type: "short_response", text: e.currentTarget.value })}
        />
      </Field>
    </div>
  );
}
