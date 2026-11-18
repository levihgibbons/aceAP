/**
 * `npm run lms:sync`            — DRY RUN: list pending grade-sync jobs per LMS
 *                                 connection and when each is next due. Contacts nobody.
 * `npm run lms:sync -- --apply` — attempt every due job (one attempt each).
 *
 * Options: --connection <id>   only this connection
 *          --limit <n>         max pending jobs examined per connection (default 500)
 *          --max-attempts <n>  attempts before a retryable failure becomes "failed" (default 5)
 *
 * Back-off (src/modules/integrations/lms/passback.ts → retryDelayMs): a pending job
 * that failed with a retryable error (5xx, 429, network) is retried 1, 2, 4, 8 …
 * minutes after its last attempt (capped at 60). Jobs on connections whose
 * diagnostics have not passed are skipped. A job is "synced" only after the LMS
 * answered 2xx. Run it every few minutes from a scheduler (see
 * docs/CANVAS_INTEGRATION.md, "Background sync"). Exit code 1 when any job failed
 * during an --apply run, so a scheduler can alert.
 */
import "./load-env";
import { closeDatabase } from "@/db/client";
import { runSyncWorker } from "@/modules/integrations/lms/passback";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

async function main(): Promise<number> {
  const apply = process.argv.includes("--apply");
  const reports = await runSyncWorker({
    apply,
    connectionId: arg("--connection"),
    limit: positiveInt(arg("--limit"), 500),
    maxAttempts: positiveInt(arg("--max-attempts"), 5),
  });
  console.log(`LMS grade sync — ${apply ? "APPLY (sending due jobs)" : "dry run (nothing sent; add --apply to send)"} — ${new Date().toISOString()}`);
  if (reports.length === 0) console.log("No LMS connections are configured.");
  let failed = 0;
  for (const r of reports) {
    console.log(`\nConnection ${r.connectionId} (${r.issuer})`);
    if (r.skipped) {
      console.log(`  skipped: ${r.skipReason}. ${r.due.length + r.waiting.length} pending job(s) left untouched.`);
      continue;
    }
    console.log(`  pending: ${r.due.length} due now, ${r.waiting.length} waiting for back-off`);
    for (const w of r.waiting.slice(0, 20)) console.log(`    waiting  job ${w.jobId} (attempts ${w.attempts}) next at ${w.nextAttemptAt.toISOString()}`);
    if (!apply) {
      for (const d of r.due.slice(0, 20)) console.log(`    due      job ${d.jobId} (attempts ${d.attempts})`);
      continue;
    }
    const s = r.summary;
    if (!s) continue;
    failed += s.failed;
    console.log(`  attempted ${s.processed}: ${s.synced} synced, ${s.pending} still pending, ${s.blocked} blocked, ${s.failed} failed`);
    for (const o of s.outcomes) if (o.status !== "synced") console.log(`    ${o.status.padEnd(8)} job ${o.jobId}: ${o.error ?? ""}`);
  }
  return apply && failed > 0 ? 1 : 0;
}

main()
  .then(async (code) => {
    await closeDatabase();
    process.exit(code);
  })
  .catch(async (error: unknown) => {
    console.error("lms:sync failed:", error instanceof Error ? error.message : error);
    await closeDatabase().catch(() => undefined);
    process.exit(2);
  });
