import { cronHandler } from "@/lib/cron";
import { runRetention } from "@/modules/accounts/retention";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/cron/retention — scheduled equivalent of `npm run retention -- --apply`
 * (daily, see vercel.json). Requires `Authorization: Bearer $CRON_SECRET`.
 * Returns counts only — never names, emails or content.
 */
export const GET = cronHandler(async () => {
  const report = await runRetention({ apply: true });
  return { ok: true, mode: report.mode, now: report.now, counts: report.counts };
});
