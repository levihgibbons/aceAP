"use client";
/** A read-only value with a copy-to-clipboard button. */
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui";

export function CopyField({
  id,
  label,
  value,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setFailed(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
      (document.getElementById(id) as HTMLInputElement | null)?.select();
    }
  };
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="block h-10 w-full min-w-0 rounded-lg border border-line-strong bg-surface-2 px-3 font-mono text-[0.8125rem] text-ink focus-visible:outline-2 focus-visible:outline-accent"
        />
        <Button
          variant="secondary"
          onClick={copy}
          icon={
            copied ? (
              <Check aria-hidden="true" className="size-4 text-good" />
            ) : (
              <Copy aria-hidden="true" className="size-4" />
            )
          }
          aria-label={`Copy ${label}`}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="text-xs text-muted" aria-live="polite">
        {failed ? "Couldn't access the clipboard — the text is selected; press Ctrl+C / ⌘C." : hint}
      </p>
    </div>
  );
}
