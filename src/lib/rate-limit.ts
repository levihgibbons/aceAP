/**
 * Sliding-window rate limiter with two stores.
 *
 *  - "database": a row per key in `rate_limit_buckets`, updated by ONE atomic
 *    upsert (the row lock serialises concurrent requests for the same key).
 *    Limits therefore hold across every serverless instance and process.
 *    Default whenever DATABASE_URL is set (staging / production).
 *  - "memory": a per-process Map. Default for the embedded single-process
 *    database (local dev, tests), where there is only one process anyway.
 *
 * ACEAP_RATE_LIMIT_STORE=database|memory overrides the default (tests use it
 * to exercise the database store on the embedded database).
 *
 * Semantics are identical in both stores: a request is allowed when fewer than
 * `limit` allowed requests happened in the last `windowMs`; refused requests
 * are not counted.
 */
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

type Store = "database" | "memory";

function store(): Store {
  const forced = process.env.ACEAP_RATE_LIMIT_STORE?.trim().toLowerCase();
  if (forced === "database" || forced === "memory") return forced;
  return process.env.DATABASE_URL?.trim() ? "database" : "memory";
}

// ───────────────────────────────── memory ─────────────────────────────────

const memory = ((globalThis as unknown as { __aceapRate?: Map<string, number[]> }).__aceapRate ??= new Map<string, number[]>());

function memoryLimit(key: string, limit: number, windowMs: number, now: number): RateLimitResult {
  const cutoff = now - windowMs;
  const hits = (memory.get(key) ?? []).filter((at) => at > cutoff);
  if (hits.length >= limit) {
    memory.set(key, hits);
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000)) };
  }
  hits.push(now);
  memory.set(key, hits);
  if (memory.size > 20_000) for (const [k, v] of memory) if (!v.some((at) => at > cutoff)) memory.delete(k);
  return { allowed: true, remaining: limit - hits.length, retryAfterSeconds: 0 };
}

// ──────────────────────────────── database ────────────────────────────────

/** Fraction of calls that also prune expired buckets (keeps the table small without a job). */
const PRUNE_PROBABILITY = 0.01;

async function databaseLimit(key: string, limit: number, windowMs: number, now: number): Promise<RateLimitResult> {
  const db = await getDb();
  const cutoff = now - windowMs;
  const expiresAt = new Date(now + windowMs).toISOString();
  // `kept` = the bucket's hits still inside the window, oldest first. The new
  // hit is appended only when fewer than `limit` remain; `allowed` records the
  // decision so RETURNING can report it.
  const kept = sql`array(select h from unnest(b.hits) as h where h > ${cutoff} order by h)`;
  const result = await db.execute(sql`
    insert into rate_limit_buckets as b (key, hits, allowed, expires_at)
    values (${key}, array[${now}::bigint], ${limit > 0}, ${expiresAt}::timestamptz)
    on conflict (key) do update set
      hits = case when cardinality(${kept}) >= ${limit} then ${kept} else ${kept} || ${now}::bigint end,
      allowed = cardinality(${kept}) < ${limit},
      expires_at = ${expiresAt}::timestamptz
    returning hits, allowed`);
  const row = (result as unknown as { rows: { hits: (string | number)[]; allowed: boolean }[] }).rows[0];
  const hits = (row?.hits ?? []).map(Number);

  if (Math.random() < PRUNE_PROBABILITY) {
    await db.execute(sql`delete from rate_limit_buckets where expires_at < now()`).catch(() => {});
  }

  if (!row?.allowed) {
    const oldest = hits[0] ?? now;
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)) };
  }
  return { allowed: true, remaining: Math.max(0, limit - hits.length), retryAfterSeconds: 0 };
}

// ───────────────────────────────── public ─────────────────────────────────

export async function rateLimit(key: string, limit: number, windowMs: number, now: number = Date.now()): Promise<RateLimitResult> {
  return store() === "database" ? databaseLimit(key, limit, windowMs, now) : memoryLimit(key, limit, windowMs, now);
}

/** Clear one key or every key (tests; simulating a restart only clears the memory store). */
export async function resetRateLimit(key?: string): Promise<void> {
  if (key) memory.delete(key);
  else memory.clear();
  if (store() !== "database") return;
  const db = await getDb();
  if (key) await db.execute(sql`delete from rate_limit_buckets where key = ${key}`);
  else await db.execute(sql`delete from rate_limit_buckets`);
}
