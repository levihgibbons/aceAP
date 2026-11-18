/**
 * A tiny browser-side signal for "the student just did something meaningful"
 * (answered a question, moved a simulation). The ActivityTracker listens for
 * it. It carries no data — only the fact that an interaction happened.
 */
export const INTERACTION_EVENT = "aceap:interaction";

export function markInteraction(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(INTERACTION_EVENT));
}

/** POST JSON that survives page unload (sendBeacon, falling back to keepalive fetch). */
export function sendOnUnload(url: string, body: unknown): void {
  const json = JSON.stringify(body);
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      if (navigator.sendBeacon(url, new Blob([json], { type: "application/json" }))) return;
    }
  } catch {
    // fall through to fetch
  }
  void fetch(url, { method: "POST", body: json, headers: { "Content-Type": "application/json" }, keepalive: true, credentials: "same-origin" }).catch(() => {});
}
