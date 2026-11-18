/**
 * In-memory sliding-window rate limiter.
 *
 * Suitable for a single application instance. A multi-instance deployment
 * must replace the store with a shared one (e.g. Redis or a Postgres table) —
 * see docs/SECURITY.md.
 */
const store = ((globalThis as unknown as { __aceapRate?: Map<string, number[]> }).__aceapRate ??= new Map<string, number[]>());

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number, now: number = Date.now()): RateLimitResult {
  const cutoff = now - windowMs;
  const hits = (store.get(key) ?? []).filter((at) => at > cutoff);
  if (hits.length >= limit) {
    store.set(key, hits);
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000)) };
  }
  hits.push(now);
  store.set(key, hits);
  if (store.size > 20_000) for (const [k, v] of store) if (!v.some((at) => at > cutoff)) store.delete(k);
  return { allowed: true, remaining: limit - hits.length, retryAfterSeconds: 0 };
}

export function resetRateLimit(key?: string) {
  if (key) store.delete(key);
  else store.clear();
}
