"use client";
/**
 * Share a note with the teacher of one or more of the student's classes.
 * Each class is a switch; turning it on/off calls the shares API right away.
 */
import { useCallback, useState } from "react";
import { Share2, Users } from "lucide-react";
import { Button, Dialog, EmptyState, Skeleton, Switch } from "@/components/ui";
import { vaultFetch } from "./client";

interface ActiveClass {
  classId: string;
  className: string;
  courseName: string;
  teacherName: string | null;
}
interface Share {
  classId: string;
  className: string;
  sharedAt: string;
}

export interface ShareButtonProps {
  noteId: string | null;
  noteTitle: string;
  size?: "sm" | "md";
  /** Shown instead of opening when the note hasn't been saved yet. */
  disabledReason?: string;
}

export function ShareButton({ noteId, noteTitle, size = "sm", disabledReason }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{
    status: "idle" | "loading" | "ready" | "error";
    classes: ActiveClass[];
    shared: Set<string>;
    error?: string;
  }>({
    status: "idle",
    classes: [],
    shared: new Set(),
  });
  const [pending, setPending] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ classId: string; message: string } | null>(null);

  const load = useCallback(async () => {
    if (!noteId) return;
    setState((s) => ({ ...s, status: "loading", error: undefined }));
    try {
      const data = await vaultFetch<{ shares: Share[]; classes: ActiveClass[] }>(
        `/api/vault/notes/${noteId}/shares`,
      );
      setState({
        status: "ready",
        classes: data.classes,
        shared: new Set(data.shares.map((s) => s.classId)),
      });
    } catch (e) {
      setState((s) => ({
        ...s,
        status: "error",
        error: e instanceof Error ? e.message : "Couldn't load your classes.",
      }));
    }
  }, [noteId]);

  const toggle = async (cls: ActiveClass, on: boolean) => {
    if (!noteId) return;
    setPending(cls.classId);
    setRowError(null);
    try {
      await vaultFetch(`/api/vault/notes/${noteId}/shares`, {
        method: on ? "POST" : "DELETE",
        json: { classId: cls.classId },
      });
      setState((s) => {
        const shared = new Set(s.shared);
        if (on) shared.add(cls.classId);
        else shared.delete(cls.classId);
        return { ...s, shared };
      });
    } catch (e) {
      setRowError({
        classId: cls.classId,
        message: e instanceof Error ? e.message : "That didn't work. Try again.",
      });
    } finally {
      setPending(null);
    }
  };

  const sharedCount = state.shared.size;

  return (
    <>
      <Button
        variant="secondary"
        size={size}
        icon={<Share2 aria-hidden="true" className="size-4" />}
        disabled={!noteId}
        title={!noteId ? disabledReason : undefined}
        onClick={() => {
          setOpen(true);
          void load();
        }}
      >
        Share
        {state.status === "ready" && sharedCount > 0 ? (
          <span className="sr-only"> (shared with {sharedCount})</span>
        ) : null}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Share with a class"
        description={`“${noteTitle || "Untitled note"}”`}
        footer={<Button onClick={() => setOpen(false)}>Done</Button>}
      >
        <div className="space-y-4 text-sm leading-relaxed text-ink-2">
          <p>
            Your vault is private. When you share this note with a class,{" "}
            <strong className="font-semibold text-ink">only that class&apos;s teacher</strong> can
            read it — its title, tags and full text, including edits you make later. It shows up on
            their &ldquo;Shared notes&rdquo; page for that class.
          </p>
          <p className="text-muted">
            Classmates never see it. Your other notes stay private. Turn sharing off at any time and
            your teacher loses access immediately.
          </p>

          {state.status === "loading" || state.status === "idle" ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading your classes">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : state.status === "error" ? (
            <div
              role="alert"
              className="rounded-lg border border-bad/30 bg-bad-soft px-3 py-2 text-bad"
            >
              {state.error}{" "}
              <button
                type="button"
                onClick={() => void load()}
                className="font-medium underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          ) : state.classes.length === 0 ? (
            <EmptyState
              headingLevel={3}
              icon={<Users />}
              title="You're not in any classes"
              description="Sharing is only possible with the teacher of a class you've joined. Your note stays private."
            />
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {state.classes.map((c) => (
                <li key={c.classId} className="px-3 py-3">
                  <Switch
                    labelFirst
                    label={c.className}
                    description={`${c.courseName} · Teacher: ${c.teacherName ?? "your teacher"}${state.shared.has(c.classId) ? " · Shared" : ""}`}
                    checked={state.shared.has(c.classId)}
                    disabled={pending !== null}
                    aria-busy={pending === c.classId || undefined}
                    onChange={(e) => void toggle(c, e.target.checked)}
                  />
                  {rowError?.classId === c.classId ? (
                    <p role="alert" className="mt-1.5 text-xs font-medium text-bad">
                      {rowError.message}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Dialog>
    </>
  );
}
