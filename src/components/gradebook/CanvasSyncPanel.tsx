"use client";
/**
 * Canvas grade passback for one assignment: the honest reason when grades
 * can't be sent, a teacher-approved "Send grades to Canvas" action, and the
 * per-student sync status with retry for failed/blocked jobs. Used in the
 * gradebook column drawer (loads on open) and on the assignment page
 * (server-provided initial data).
 */
import { useEffect, useId, useState, useTransition } from "react";
import Link from "next/link";
import { RotateCcw, Send } from "lucide-react";
import { Badge, Button, Checkbox, Spinner, useToast } from "@/components/ui";
import type { ActionState } from "@/components/assignments/action-state";
import { SYNC_STATUS, type PassbackPanelData, type PassbackRowData } from "./passback";

export interface CanvasSyncActions {
  load: (assignmentId: string) => Promise<ActionState & { data?: PassbackPanelData }>;
  send: (classId: string, assignmentId: string, includeComments: boolean) => Promise<ActionState & { data?: PassbackPanelData; partial?: boolean }>;
  retry: (assignmentId: string, jobId: string) => Promise<ActionState & { data?: PassbackPanelData }>;
}

const num = (x: number) => (Number.isInteger(x) ? String(x) : String(Math.round(x * 100) / 100));

function rowNote(r: PassbackRowData, points: number): string {
  if (r.skipReason === "excused") return "Excused — not sent.";
  if (r.skipReason === "ungraded") return "No grade yet — not sent.";
  if (r.status === "superseded") return SYNC_STATUS.superseded.help;
  if (r.lastError) return r.lastError;
  if (r.status === "synced" && r.outOfDate && r.currentScore !== null) return `Gradebook now shows ${num(r.currentScore)}/${num(points)}; send again to update Canvas.`;
  if (r.status === "not_queued" && !r.identityLinked) return "Student hasn't linked their Canvas account.";
  return SYNC_STATUS[r.status].help;
}

export function CanvasSyncPanel({
  assignmentId,
  assignmentTitle,
  initial,
  actions,
  headingLevel = "h3",
}: {
  assignmentId: string;
  assignmentTitle: string;
  initial?: PassbackPanelData;
  actions: CanvasSyncActions;
  headingLevel?: "h2" | "h3";
}) {
  const { toast } = useToast();
  const [data, setData] = useState<PassbackPanelData | null>(initial ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [result, setResult] = useState<ActionState & { partial?: boolean }>({});
  const [includeComments, setIncludeComments] = useState(false);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const reasonId = useId();
  const Heading = headingLevel;

  const load = actions.load;
  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    load(assignmentId).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) setData(res.data);
      else setLoadError(res.error ?? "Couldn't load the Canvas sync status.");
    });
    return () => {
      cancelled = true;
    };
  }, [load, assignmentId, initial]);

  if (loadError) {
    return (
      <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
        {loadError}
      </p>
    );
  }
  if (!data) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted" role="status">
        <Spinner size="sm" /> Loading Canvas sync status…
      </p>
    );
  }

  const send = () => {
    setBusy("send");
    start(async () => {
      const res = await actions.send(data.classId, assignmentId, includeComments);
      if (res.data) setData(res.data);
      setResult(res);
      if (res.ok) toast({ title: res.partial ? "Not every grade was confirmed" : "Canvas confirmed the grades", description: res.message, tone: res.partial ? "warn" : "good" });
      setBusy(null);
    });
  };
  const retry = (jobId: string) => {
    setBusy(jobId);
    start(async () => {
      const res = await actions.retry(assignmentId, jobId);
      if (res.data) setData(res.data);
      setResult(res);
      if (res.ok) toast({ title: "Retried", description: res.message, tone: "good" });
      setBusy(null);
    });
  };

  const counts = data.rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});

  return (
    <div className="space-y-4">
      <div>
        <Heading className="font-display text-base font-semibold text-ink">Send grades to Canvas</Heading>
        <p className="mt-1 text-sm text-muted">
          {data.connection
            ? `Connection: ${data.connection.issuer} — ${data.connection.verified ? "diagnostics passed" : "not verified"}.`
            : "No Canvas connection for this school."}{" "}
          Sends each student&apos;s current gradebook grade ({data.points} pts); excused and ungraded work is skipped. A grade shows as synced only after Canvas confirms it.
        </p>
      </div>

      {data.message ? (
        <p id={reasonId} className={data.canSend ? "rounded-lg bg-info-soft px-3 py-2 text-sm text-info" : "rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn"}>
          {data.message}
          {!data.canSend && (data.reason === "no_connection" || data.reason === "connection_unverified") ? (
            <>
              {" "}
              <Link href="/teacher/integrations" className="font-medium underline underline-offset-2">
                Open Integrations
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      <div className="space-y-3">
        <Checkbox
          label="Include gradebook comments"
          description="Your comment on each grade is sent to Canvas with it."
          checked={includeComments}
          onChange={(e) => setIncludeComments(e.target.checked)}
          disabled={!data.canSend || pending}
        />
        <Button
          onClick={send}
          disabled={!data.canSend || pending}
          aria-describedby={data.message ? reasonId : undefined}
          loading={pending && busy === "send"}
          loadingText="Sending…"
          icon={<Send aria-hidden="true" className="size-4" />}
          aria-label={`Send grades for ${assignmentTitle} to Canvas`}
        >
          Send grades to Canvas
        </Button>
      </div>

      {result.error ? (
        <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm font-medium text-bad">
          {result.error}
        </p>
      ) : result.ok && result.message ? (
        <p role="status" className={result.partial ? "rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn" : "rounded-lg bg-good-soft px-3 py-2 text-sm text-good"}>
          {result.message}
        </p>
      ) : null}

      {data.rows.length > 0 ? (
        <div>
          <p className="text-xs text-muted">
            {(["synced", "pending", "blocked", "failed", "not_queued", "superseded"] as const)
              .filter((s) => counts[s])
              .map((s) => `${counts[s]} ${SYNC_STATUS[s].label.toLowerCase()}`)
              .join(" · ")}
          </p>
          <ul className="mt-2 divide-y divide-line rounded-lg border border-line" aria-label={`Canvas sync status for ${assignmentTitle}`}>
            {data.rows.map((r) => {
              const st = SYNC_STATUS[r.status];
              return (
                <li key={r.studentId} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">
                      {r.studentName}
                      <span className="ml-2 font-normal tabular-nums text-muted">
                        {r.currentScore !== null ? `${num(r.currentScore)}/${num(data.points)}` : "—"}
                        {r.sentScore !== null && r.sentScore !== r.currentScore ? ` (last sent ${num(r.sentScore)})` : ""}
                      </span>
                    </p>
                    <p className={r.status === "failed" || r.status === "blocked" ? "mt-0.5 text-xs text-bad" : "mt-0.5 text-xs text-muted"}>{rowNote(r, data.points)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span title={st.help}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </span>
                    {r.canRetry && r.jobId ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => retry(r.jobId as string)}
                        disabled={pending}
                        loading={pending && busy === r.jobId}
                        loadingText="Retrying…"
                        icon={<RotateCcw aria-hidden="true" className="size-3.5" />}
                        aria-label={`Retry sending ${r.studentName}'s grade`}
                      >
                        Retry
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : data.connection ? (
        <p className="text-sm text-muted">No students on this assignment yet.</p>
      ) : null}
    </div>
  );
}
