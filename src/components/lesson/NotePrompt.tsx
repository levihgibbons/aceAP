"use client";
/**
 * NotePrompt — a small inline editor that saves a note to the student's
 * knowledge vault (POST /api/vault/notes { title, body, tags }). If the vault
 * endpoint isn't there or the title is taken, the text stays in the editor and
 * the student gets a clear message and a link to the vault.
 */
import Link from "next/link";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, NotebookPen } from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/ui";

export interface NotePromptProps {
  prompt: ReactNode;
  suggestedTitle: string;
  starter?: string;
  tags: string[];
}

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; title: string } | { kind: "error"; message: string; vaultLink?: boolean };

export function NotePrompt({ prompt, suggestedTitle, starter, tags }: NotePromptProps) {
  const id = useId();
  const [title, setTitle] = useState(suggestedTitle);
  const [body, setBody] = useState(starter ?? "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setStatus({ kind: "error", message: "Add a title and a few words before saving." });
      return;
    }
    setStatus({ kind: "saving" });
    try {
      const res = await fetch("/api/vault/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body, tags }),
      });
      if (res.ok) {
        setStatus({ kind: "saved", title: title.trim() });
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (res.status === 404 || res.status === 405)
        setStatus({ kind: "error", message: "Saving notes from a lesson isn't available right now. Your text is still here — copy it into your vault.", vaultLink: true });
      else if (res.status === 409)
        setStatus({ kind: "error", message: data?.error?.message ?? "You already have a note with this title. Change the title, or add to the existing note in your vault.", vaultLink: true });
      else if (res.status === 401) setStatus({ kind: "error", message: "Your session has ended. Sign in again to save notes." });
      else setStatus({ kind: "error", message: data?.error?.message ?? "Couldn't save your note. Please try again." });
    } catch {
      setStatus({ kind: "error", message: "Couldn't reach the server. Check your connection and try again." });
    }
  };

  return (
    <form onSubmit={save} className="rounded-card border border-line bg-surface-2 p-5 sm:p-6" aria-labelledby={`${id}-title`}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-accent">
          <NotebookPen className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-title`} className="font-display text-base font-semibold text-ink">
            Write it in your own words
          </h2>
          <div className="mt-1 text-sm text-ink-2">{prompt}</div>
        </div>
      </div>

      {status.kind === "saved" ? (
        <div role="status" className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-good/30 bg-good-soft px-4 py-3 text-sm">
          <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-good" />
          <span className="text-ink">
            Saved “{status.title}” to your knowledge vault.
          </span>
          <Link href="/app/vault" className="font-medium text-accent underline-offset-4 hover:underline">
            Open vault
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <Field label="Note title" htmlFor={`${id}-note-title`}>
            <Input id={`${id}-note-title`} value={title} maxLength={200} onChange={(e) => setTitle(e.currentTarget.value)} />
          </Field>
          <Field label="Your note" htmlFor={`${id}-note-body`} hint="Markdown and $math$ work here. Notes are private to you.">
            <Textarea id={`${id}-note-body`} rows={5} value={body} maxLength={20000} onChange={(e) => setBody(e.currentTarget.value)} />
          </Field>
          {status.kind === "error" ? (
            <p role="alert" className="flex flex-wrap items-start gap-x-2 gap-y-1 text-sm text-bad">
              <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0 flex-1 font-medium">{status.message}</span>
              {status.vaultLink ? (
                <Link href="/app/vault" className="font-medium text-accent underline-offset-4 hover:underline">
                  Go to your vault
                </Link>
              ) : null}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" loading={status.kind === "saving"} loadingText="Saving…">
              Save to vault
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
