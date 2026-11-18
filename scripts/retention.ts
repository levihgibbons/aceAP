/**
 * `npm run retention`            — dry run: print what retention WOULD delete.
 * `npm run retention -- --apply` — delete it (and purge accounts past their grace period).
 *
 * Schedule `npm run retention -- --apply` daily (cron, a platform scheduler,
 * or a CI job with DATABASE_URL); see docs/DATABASE.md → Retention.
 * Exits non-zero on failure so schedulers can alert.
 */
import "./load-env";
import { closeDatabase } from "@/db/client";
import { runRetention, type RetentionCounts } from "@/modules/accounts/retention";

const LABELS: Record<keyof RetentionCounts, string> = {
  expiredSessions: "Expired sessions",
  resetTokens: "Used/expired reset tokens (> 7 days)",
  emailOutbox: "Dev email outbox messages (> 30 days)",
  rosterProposals: "Canvas roster review proposals (> 30 days)",
  learningEvents: "Learning events (older than window)",
  learningSessions: "Learning sessions (older than window)",
  purgedAccounts: "Deleted accounts past grace period (purged)",
  blockedAccounts: "Deleted accounts past grace but blocked (own classes)",
};

async function main() {
  const args = new Set(process.argv.slice(2));
  const unknown = [...args].filter((a) => a !== "--apply" && a !== "--json");
  if (unknown.length) throw new Error(`Unknown argument(s): ${unknown.join(", ")}. Use --apply to delete, --json for machine-readable output.`);
  const report = await runRetention({ apply: args.has("--apply") });

  if (args.has("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`AceAP retention — ${report.mode === "apply" ? "APPLIED" : "dry run (nothing deleted; pass --apply to delete)"}`);
    console.log(`Now: ${report.now} · events window: ${report.cutoffs.eventsRetentionDays} days (before ${report.cutoffs.eventsBefore})`);
    const width = Math.max(...Object.values(LABELS).map((l) => l.length));
    for (const [key, label] of Object.entries(LABELS) as [keyof RetentionCounts, string][]) {
      console.log(`  ${label.padEnd(width)}  ${String(report.counts[key]).padStart(7)}`);
    }
    console.log("Never deleted: mastery evidence, question responses, mastery snapshots/states, attempts, vault notes.");
  }
  await closeDatabase();
}

main().catch(async (e) => {
  console.error(e);
  await closeDatabase().catch(() => {});
  process.exit(1);
});
