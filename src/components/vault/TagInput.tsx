"use client";
/**
 * Tag chips with an input: Enter or comma adds, Backspace on an empty input
 * removes the last tag. Tags are normalised exactly as the vault service does.
 */
import { useId, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { MAX_TAGS, normaliseTag } from "@/modules/vault/links";

export interface TagInputProps {
  id: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  /** Tags that come from #hashtags in the body (shown read-only). */
  bodyTags?: string[];
}

export function TagInput({ id, tags, onChange, suggestions = [], bodyTags = [] }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const listId = useId();
  const hintId = `${id}-hint`;

  const commit = (raw: string) => {
    const parts = raw
      .split(",")
      .map(normaliseTag)
      .filter((t): t is string => Boolean(t));
    const next = [...tags];
    for (const t of parts) if (!next.includes(t) && next.length < MAX_TAGS) next.push(t);
    if (next.length !== tags.length) onChange(next);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      if (draft.trim()) {
        e.preventDefault();
        commit(draft);
      } else if (e.key === ",") e.preventDefault();
    } else if (e.key === "Backspace" && !draft && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  const extra = bodyTags.filter((t) => !tags.includes(t));

  return (
    <div>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2 py-1.5 shadow-card focus-within:border-accent focus-within:outline-2 focus-within:outline-accent">
        <ul className="contents" aria-label="Tags">
          {tags.map((t) => (
            <li
              key={t}
              className="inline-flex items-center gap-1 rounded-md bg-sunken py-0.5 pl-2 pr-1 text-xs font-medium text-ink-2"
            >
              #{t}
              <button
                type="button"
                onClick={() => onChange(tags.filter((x) => x !== t))}
                aria-label={`Remove tag ${t}`}
                className="inline-flex size-5 items-center justify-center rounded text-muted hover:bg-line hover:text-ink"
              >
                <X aria-hidden="true" className="size-3" />
              </button>
            </li>
          ))}
          {extra.map((t) => (
            <li
              key={`body-${t}`}
              className="inline-flex items-center rounded-md border border-dashed border-line-strong px-2 py-0.5 text-xs text-muted"
              title="From a #tag in your note"
            >
              #{t}
              <span className="sr-only"> (from the note text)</span>
            </li>
          ))}
        </ul>
        <input
          id={id}
          value={draft}
          list={suggestions.length ? listId : undefined}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) commit(v);
            else setDraft(v);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => draft.trim() && commit(draft)}
          placeholder={tags.length ? "" : "Add a tag…"}
          aria-describedby={hintId}
          className="h-7 min-w-24 flex-1 bg-transparent px-1 text-sm text-ink outline-none placeholder:text-faint"
        />
        {suggestions.length ? (
          <datalist id={listId}>
            {suggestions
              .filter((s) => !tags.includes(s))
              .map((s) => (
                <option key={s} value={s} />
              ))}
          </datalist>
        ) : null}
      </div>
      <p id={hintId} className="mt-1 text-xs text-muted">
        Press Enter or comma to add. #tags typed in the note are added automatically.
      </p>
    </div>
  );
}
