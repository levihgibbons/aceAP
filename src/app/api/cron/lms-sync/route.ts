import { cronHandler } from "@/lib/cron";
import { runSyncWorker } from "@/modules/integrations/lms/passback";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/cron/lms-sync — scheduled equivalent of `npm run lms:sync -- --apply`
 * (see vercel.json). Requires `Authorization: Bearer $CRON_SECRET`. Attempts
 * every due Canvas grade-sync job once, with the worker's back-off. With no
 * LMS connection configured it does nothing. Responds 500 when any job failed
 * so the scheduler surfaces it. Returns counts only.
 */
export const GET = cronHandler(async () => {
  const reports = await runSyncWorker({ apply: true, limit: 500, maxAttempts: 5 });
  const connections = reports.map((r) => ({
    connectionId: r.connectionId,
    skipped: r.skipped,
    skipReason: r.skipReason,
    due: r.due.length,
    waiting: r.waiting.length,
    summary: r.summary ? { processed: r.summary.processed, synced: r.summary.synced, pending: r.summary.pending, blocked: r.summary.blocked, failed: r.summary.failed } : null,
  }));
  const failed = connections.reduce((n, c) => n + (c.summary?.failed ?? 0), 0);
  return { ok: failed === 0, connections, failed };
});
