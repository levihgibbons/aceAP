"use client";
/**
 * Class-level "Send grades to Canvas": sends every assignment of the class
 * that is linked to a Canvas grade column. Disabled — with the honest reason —
 * when nothing can be sent.
 */
import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { Button, Checkbox, useToast } from "@/components/ui";
import type { ActionState } from "@/components/assignments/action-state";

export function CanvasClassSync({
  classId,
  connectionLabel,
  sendableCount,
  reason,
  showIntegrationsLink,
  action,
}: {
  classId: string;
  /** e.g. "https://canvas.instructure.com — diagnostics passed"; null when there is no connection. */
  connectionLabel: string | null;
  sendableCount: number;
  /** Why nothing can be sent (null when sendableCount > 0). */
  reason: string | null;
  showIntegrationsLink: boolean;
  action: (classId: string, includeComments: boolean) => Promise<ActionState & { partial?: boolean }>;
}) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionState & { partial?: boolean }>({});
  const [includeComments, setIncludeComments] = useState(false);
  const reasonId = useId();
  const canSend = sendableCount > 0;

  return (
    <section aria-labelledby={`${reasonId}-h`} className="mb-5 rounded-lg border border-line bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`${reasonId}-h`} className="text-sm font-semibold text-ink">
            Canvas grade sync
          </h2>
          <p id={reasonId} className="mt-0.5 text-sm text-muted">
            {canSend
              ? `${sendableCount} assignment${sendableCount === 1 ? " is" : "s are"} linked to a Canvas grade column${connectionLabel ? ` (${connectionLabel})` : ""}. Nothing is sent until you choose to.`
              : reason}
            {!canSend && showIntegrationsLink ? (
              <>
                {" "}
                <Link href="/teacher/integrations" className="font-medium text-accent underline-offset-2 hover:underline">
                  Open Integrations
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {canSend ? (
            <Checkbox label="Include comments" checked={includeComments} onChange={(e) => setIncludeComments(e.target.checked)} disabled={pending} />
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            disabled={!canSend || pending}
            aria-describedby={reasonId}
            loading={pending}
            loadingText="Sending…"
            icon={<Send aria-hidden="true" className="size-4" />}
            onClick={() =>
              start(async () => {
                const res = await action(classId, includeComments);
                setResult(res);
                if (res.ok) toast({ title: res.partial ? "Not every grade was confirmed" : "Canvas confirmed the grades", description: res.message, tone: res.partial ? "warn" : "good" });
              })
            }
          >
            Send all linked grades to Canvas
          </Button>
        </div>
      </div>
      {result.error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-bad">
          {result.error}
        </p>
      ) : result.ok && result.message ? (
        <p role="status" className={result.partial ? "mt-2 text-sm text-warn" : "mt-2 text-sm text-good"}>
          {result.message}
        </p>
      ) : null}
    </section>
  );
}
