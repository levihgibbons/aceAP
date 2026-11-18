/**
 * In-flight draft saves (deferred-feedback attempts). The attempt runner waits
 * for these before submitting, so the last answer typed is the one graded.
 */
const inflight = new Set<Promise<unknown>>();

export function trackDraftSave<T>(p: Promise<T>): Promise<T> {
  inflight.add(p);
  void p.finally(() => inflight.delete(p)).catch(() => {});
  return p;
}

export async function waitForDraftSaves(timeoutMs = 4_000): Promise<void> {
  if (inflight.size === 0) return;
  await Promise.race([Promise.allSettled([...inflight]), new Promise((r) => setTimeout(r, timeoutMs))]);
}
