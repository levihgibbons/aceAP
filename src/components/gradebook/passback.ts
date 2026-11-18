/**
 * Serialisable view of the LMS grade-passback state for the gradebook column
 * drawer and the assignment page, plus the status wording. Server-safe (no
 * hooks); the mapper runs on the server, the types are shared with clients.
 */
import type { BadgeTone } from "@/components/ui";
import type { AssignmentPassbackView, PassbackBlockReason, SendGradesResult } from "@/modules/integrations/lms/passback";

export type SyncDisplayStatus = "not_queued" | "pending" | "synced" | "failed" | "blocked" | "superseded";

export interface PassbackRowData {
  studentId: string;
  studentName: string;
  status: SyncDisplayStatus;
  jobId: string | null;
  identityLinked: boolean;
  /** Score the gradebook shows now (null = excused / ungraded / not assigned). */
  currentScore: number | null;
  skipReason: "excused" | "ungraded" | "no_points" | null;
  /** Last queued or sent score. */
  sentScore: number | null;
  outOfDate: boolean;
  attempts: number;
  lastError: string | null;
  syncedAt: string | null;
  canRetry: boolean;
}

export interface PassbackPanelData {
  classId: string;
  assignmentId: string;
  points: number;
  connection: { issuer: string; verified: boolean } | null;
  canSend: boolean;
  reason: PassbackBlockReason | null;
  message: string | null;
  assignedStudents: number;
  linkedStudents: number;
  rows: PassbackRowData[];
}

export function toPanelData(view: AssignmentPassbackView): PassbackPanelData {
  return {
    classId: view.classId,
    assignmentId: view.assignmentId,
    points: view.points,
    connection: view.connection ? { issuer: view.connection.issuer, verified: view.connection.verified } : null,
    canSend: view.eligibility.canSend,
    reason: view.eligibility.reason,
    message: view.eligibility.message,
    assignedStudents: view.eligibility.assignedStudents,
    linkedStudents: view.eligibility.linkedStudents,
    rows: view.rows.map((r) => {
      const status: SyncDisplayStatus = r.superseded ? "superseded" : r.status;
      return {
        studentId: r.studentId,
        studentName: r.studentName ?? "Unknown student",
        status,
        jobId: r.jobId,
        identityLinked: r.identityLinked,
        currentScore: r.currentScore,
        skipReason: r.skipReason,
        sentScore: r.scoreGiven,
        outOfDate: r.outOfDate,
        attempts: r.attempts,
        lastError: r.superseded ? null : r.lastError,
        syncedAt: r.syncedAt ? r.syncedAt.toISOString() : null,
        canRetry: (status === "failed" || status === "blocked") && r.jobId !== null,
      };
    }),
  };
}

export const SYNC_STATUS: Record<SyncDisplayStatus, { label: string; tone: BadgeTone; help: string }> = {
  not_queued: { label: "Not sent", tone: "neutral", help: "No grade has been queued for Canvas." },
  pending: { label: "Pending", tone: "info", help: "Queued, not yet confirmed by Canvas. Retried automatically by the background sync." },
  synced: { label: "Synced", tone: "good", help: "Canvas confirmed it received this grade." },
  failed: { label: "Failed", tone: "bad", help: "Canvas rejected the grade or kept failing. Retry once the cause is fixed." },
  blocked: { label: "Blocked", tone: "warn", help: "Something must be fixed first (a link or a permission). Retry afterwards." },
  superseded: { label: "Superseded", tone: "neutral", help: "A newer grade replaced this one before it was delivered." },
};

/** Honest one-line summary of a send: only 2xx-confirmed grades are called synced. */
export function describeSend(result: SendGradesResult): string {
  const sum = (k: "queued" | "requeued" | "unchanged" | "skipped") => result.assignments.reduce((n, a) => n + a[k], 0);
  const d = result.delivery;
  const parts: string[] = [];
  parts.push(d.synced > 0 ? `Canvas confirmed ${d.synced} grade${d.synced === 1 ? "" : "s"}.` : "Canvas confirmed no new grades.");
  if (d.pending > 0) parts.push(`${d.pending} couldn't be delivered yet; the background sync retries them.`);
  if (result.statusCounts.blocked > 0) parts.push(`${result.statusCounts.blocked} blocked (see the reasons).`);
  if (d.failed > 0) parts.push(`${d.failed} failed.`);
  if (sum("unchanged") > 0) parts.push(`${sum("unchanged")} unchanged since the last send.`);
  if (sum("skipped") > 0) parts.push(`${sum("skipped")} skipped (excused or ungraded).`);
  return parts.join(" ");
}

/** True only when every grade this send queued was confirmed by Canvas. */
export function fullyConfirmed(result: SendGradesResult): boolean {
  const d = result.delivery;
  return d.pending === 0 && d.failed === 0 && d.blocked === 0 && result.statusCounts.blocked === 0 && result.statusCounts.failed === 0;
}
