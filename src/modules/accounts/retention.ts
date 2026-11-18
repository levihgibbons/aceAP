/**
 * Retention enforcement (framework-free). Run by `npm run retention`
 * (scripts/retention.ts) — dry run by default, `--apply` to delete.
 *
 * Removes:
 *  - expired sessions;
 *  - password-reset tokens used or expired more than 7 days ago;
 *  - development email_outbox messages older than 30 days;
 *  - Canvas roster review snapshots (lms_roster_proposals) older than 30 days;
 *  - raw engagement telemetry older than RETENTION_EVENTS_DAYS (default 730):
 *    learning_events and learning_sessions. Daily activity_aggregates are kept;
 *  - accounts soft-deleted longer than the grace period (purgeDeletedAccounts).
 *
 * Never touches the student's learning record: mastery_evidence,
 * question_responses, mastery_snapshots, mastery_states, attempts, vault notes
 * — those live as long as the account (the student can export them).
 */
import { and, isNotNull, lt, or, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { getDb, type Db } from "@/db/client";
import * as t from "@/db/schema";
import { purgeDeletedAccounts } from "./deletion";

const DAY_MS = 24 * 60 * 60 * 1000;
export const RESET_TOKEN_RETENTION_DAYS = 7;
export const OUTBOX_RETENTION_DAYS = 30;
/** Canvas roster review snapshots; src/modules/integrations/lms/roster.ts also hides older ones. */
export const ROSTER_PROPOSAL_RETENTION_DAYS = 30;

export function eventsRetentionDays(): number {
  const raw = Number(process.env.RETENTION_EVENTS_DAYS ?? 730);
  // Guard against an accidental 0 / negative / garbage value wiping recent telemetry.
  return Number.isFinite(raw) && raw >= 30 ? Math.floor(raw) : 730;
}

export interface RetentionCounts {
  expiredSessions: number;
  resetTokens: number;
  emailOutbox: number;
  /** Canvas roster review proposals older than 30 days. */
  rosterProposals: number;
  learningEvents: number;
  learningSessions: number;
  /** Soft-deleted accounts past their grace period that were (or would be) purged. */
  purgedAccounts: number;
  /** Past grace but blocked (e.g. still own classes) — need manual handling. */
  blockedAccounts: number;
}

export interface RetentionReport {
  mode: "dry-run" | "apply";
  now: string;
  cutoffs: { resetTokensBefore: string; emailOutboxBefore: string; rosterProposalsBefore: string; eventsBefore: string; eventsRetentionDays: number };
  counts: RetentionCounts;
}

async function countWhere(db: Db, table: PgTable, where: SQL | undefined): Promise<number> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(table).where(where);
  return n;
}

async function deleteWhere(db: Db, table: PgTable, where: SQL | undefined): Promise<number> {
  // `returning` a constant keeps it cheap while still yielding a row count on both drivers.
  const rows = (await db.delete(table).where(where).returning({ one: sql<number>`1` })) as unknown[];
  return rows.length;
}

export async function runRetention(opts: { now?: Date; apply?: boolean } = {}): Promise<RetentionReport> {
  const now = opts.now ?? new Date();
  const apply = opts.apply === true;
  const db = await getDb();

  const tokenCutoff = new Date(now.getTime() - RESET_TOKEN_RETENTION_DAYS * DAY_MS);
  const outboxCutoff = new Date(now.getTime() - OUTBOX_RETENTION_DAYS * DAY_MS);
  const rosterCutoff = new Date(now.getTime() - ROSTER_PROPOSAL_RETENTION_DAYS * DAY_MS);
  const days = eventsRetentionDays();
  const eventsCutoff = new Date(now.getTime() - days * DAY_MS);

  const targets: [keyof RetentionCounts, PgTable, SQL | undefined][] = [
    ["expiredSessions", t.sessions, lt(t.sessions.expiresAt, now)],
    [
      "resetTokens",
      t.passwordResetTokens,
      or(and(isNotNull(t.passwordResetTokens.usedAt), lt(t.passwordResetTokens.usedAt, tokenCutoff)), lt(t.passwordResetTokens.expiresAt, tokenCutoff)),
    ],
    ["emailOutbox", t.emailOutbox, lt(t.emailOutbox.createdAt, outboxCutoff)],
    ["rosterProposals", t.lmsRosterProposals, lt(t.lmsRosterProposals.createdAt, rosterCutoff)],
    ["learningEvents", t.learningEvents, lt(t.learningEvents.occurredAt, eventsCutoff)],
    ["learningSessions", t.learningSessions, lt(t.learningSessions.lastHeartbeatAt, eventsCutoff)],
  ];

  const counts: RetentionCounts = { expiredSessions: 0, resetTokens: 0, emailOutbox: 0, rosterProposals: 0, learningEvents: 0, learningSessions: 0, purgedAccounts: 0, blockedAccounts: 0 };
  for (const [key, table, where] of targets) counts[key] = apply ? await deleteWhere(db, table, where) : await countWhere(db, table, where);

  const purge = await purgeDeletedAccounts(now, { dryRun: !apply });
  counts.purgedAccounts = purge.purged.length;
  counts.blockedAccounts = purge.blocked.length;

  if (apply) {
    await db.insert(t.auditLogs).values({ actorId: null, action: "retention.applied", entityType: "system", metadata: { ...counts, eventsRetentionDays: days } });
  }

  return {
    mode: apply ? "apply" : "dry-run",
    now: now.toISOString(),
    cutoffs: { resetTokensBefore: tokenCutoff.toISOString(), emailOutboxBefore: outboxCutoff.toISOString(), rosterProposalsBefore: rosterCutoff.toISOString(), eventsBefore: eventsCutoff.toISOString(), eventsRetentionDays: days },
    counts,
  };
}
