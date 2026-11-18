/**
 * Rate limiter (src/lib/rate-limit.ts): both stores share the same sliding-
 * window semantics, and the database store keeps its state in Postgres so it
 * holds across processes / serverless instances (simulated here by clearing
 * the in-memory store, which must not reset a database-backed limit).
 */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

const WINDOW = 60_000;
const T0 = 1_800_000_000_000;

beforeAll(async () => {
  await getDb(); // migrates the embedded database
});

afterEach(async () => {
  await resetRateLimit();
  vi.unstubAllEnvs();
});

for (const store of ["memory", "database"] as const) {
  describe(`${store} store`, () => {
    it("allows `limit` requests per window, refuses the rest without counting them, then slides", async () => {
      vi.stubEnv("ACEAP_RATE_LIMIT_STORE", store);
      const key = `test:${store}:slide`;
      const results = [];
      for (let i = 0; i < 3; i++) results.push(await rateLimit(key, 3, WINDOW, T0 + i * 1000));
      expect(results.map((r) => r.allowed)).toEqual([true, true, true]);
      expect(results.map((r) => r.remaining)).toEqual([2, 1, 0]);

      const refused = await rateLimit(key, 3, WINDOW, T0 + 10_000);
      expect(refused).toEqual({ allowed: false, remaining: 0, retryAfterSeconds: 50 });
      // Refusals are not counted: once the first hit leaves the window, one slot opens.
      expect((await rateLimit(key, 3, WINDOW, T0 + WINDOW + 1)).allowed).toBe(true);
      expect((await rateLimit(key, 3, WINDOW, T0 + WINDOW + 2)).allowed).toBe(false);
    });

    it("keeps keys independent", async () => {
      vi.stubEnv("ACEAP_RATE_LIMIT_STORE", store);
      expect((await rateLimit(`test:${store}:a`, 1, WINDOW, T0)).allowed).toBe(true);
      expect((await rateLimit(`test:${store}:a`, 1, WINDOW, T0 + 1)).allowed).toBe(false);
      expect((await rateLimit(`test:${store}:b`, 1, WINDOW, T0 + 2)).allowed).toBe(true);
    });
  });
}

describe("database store", () => {
  it("survives a process restart (in-memory state cleared) and is shared state in Postgres", async () => {
    vi.stubEnv("ACEAP_RATE_LIMIT_STORE", "database");
    const key = "test:db:restart";
    await rateLimit(key, 2, WINDOW, T0);
    await rateLimit(key, 2, WINDOW, T0 + 1);

    vi.stubEnv("ACEAP_RATE_LIMIT_STORE", "memory");
    await resetRateLimit(); // a fresh process has an empty memory store…
    vi.stubEnv("ACEAP_RATE_LIMIT_STORE", "database");
    expect((await rateLimit(key, 2, WINDOW, T0 + 2)).allowed).toBe(false); // …but the shared limit still holds

    const db = await getDb();
    const res = (await db.execute(sql`select hits from rate_limit_buckets where key = ${key}`)) as unknown as { rows: { hits: unknown[] }[] };
    expect(res.rows[0].hits.map(Number)).toEqual([T0, T0 + 1]);
  });

  it("serialises concurrent requests for one key: exactly `limit` succeed", async () => {
    vi.stubEnv("ACEAP_RATE_LIMIT_STORE", "database");
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => rateLimit("test:db:burst", 5, WINDOW, T0 + i)));
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
  });

  it("is a service-only table: the restricted role cannot read it", async () => {
    vi.stubEnv("ACEAP_RATE_LIMIT_STORE", "database");
    await rateLimit("test:db:rls", 1, WINDOW, T0);
    const db = await getDb();
    await expect(
      db.transaction(async (tx) => {
        await tx.execute(sql`set local role aceap_app`);
        await tx.execute(sql`select count(*) from rate_limit_buckets`);
      }),
    ).rejects.toThrow();
  });
});

describe("LTI nonce store (database)", () => {
  it("accepts a nonce once, refuses replays until it expires, then may reuse it", async () => {
    const { DatabaseNonceStore } = await import("@/modules/integrations/lms/lti/launch");
    let now = new Date(T0);
    const store = new DatabaseNonceStore(() => now);
    const expires = new Date(T0 + 5 * 60_000);
    expect(await store.consume("nonce-1", expires)).toBe(true);
    expect(await store.consume("nonce-1", expires)).toBe(false);
    expect(await store.consume("nonce-2", expires)).toBe(true);
    now = new Date(T0 + 6 * 60_000);
    expect(await store.consume("nonce-1", new Date(T0 + 11 * 60_000))).toBe(true);
    expect(await store.consume("nonce-1", new Date(T0 + 11 * 60_000))).toBe(false);
  });
});
