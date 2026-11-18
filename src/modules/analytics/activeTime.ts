/**
 * Active learning time.
 *
 * Definitions (see docs/ANALYTICS.md):
 *  - open time   = time the activity was on screen (tab visible).
 *  - active time = open time minus any stretch longer than the inactivity
 *                  threshold with no meaningful interaction.
 *
 * "Meaningful interaction" is a timestamp only (pointer press, key press,
 * scroll, simulation change, answer submit). No key values, pointer paths,
 * page content or anything outside the activity is captured.
 *
 * This file is pure and shared by the browser tracker and the server, so the
 * tested logic is the logic that runs.
 */

export const DEFAULT_IDLE_THRESHOLD_MS = 60_000;
/** A single gap between ticks longer than this is treated as the device sleeping. */
const MAX_TICK_GAP_MS = 5_000;

export class ActiveTimeMeter {
  private last: number;
  private lastInteraction: number;
  private visible = true;
  private open = 0;
  private active = 0;

  constructor(
    private readonly idleThresholdMs: number,
    now: number,
  ) {
    this.last = now;
    // Opening the activity is itself an interaction.
    this.lastInteraction = now;
  }

  /** Advance the clock. Call about once a second while the page is alive. */
  tick(now: number): void {
    const dt = now - this.last;
    if (dt <= 0) return;
    if (this.visible && dt <= MAX_TICK_GAP_MS) {
      this.open += dt;
      const activeUntil = this.lastInteraction + this.idleThresholdMs;
      this.active += Math.max(0, Math.min(now, activeUntil) - this.last);
    }
    this.last = now;
  }

  /** A meaningful interaction happened now. */
  interaction(now: number): void {
    this.tick(now);
    this.lastInteraction = now;
  }

  /** The tab became visible or hidden. Hidden time counts as neither open nor active. */
  setVisible(visible: boolean, now: number): void {
    this.tick(now);
    this.visible = visible;
    this.last = now;
  }

  /** Take and reset the accumulated deltas (sent to the server as a heartbeat). */
  drain(): { openMs: number; activeMs: number } {
    const out = { openMs: Math.round(this.open), activeMs: Math.round(this.active) };
    this.open = 0;
    this.active = 0;
    return out;
  }

  peek(): { openMs: number; activeMs: number } {
    return { openMs: Math.round(this.open), activeMs: Math.round(this.active) };
  }
}

/**
 * Server-side sanity bounds for a heartbeat. The client is not trusted: it can
 * never report more open time than wall-clock time since its last heartbeat,
 * nor more active time than open time.
 */
export function clampHeartbeat(reported: { openMs: number; activeMs: number }, elapsedSinceLastMs: number): { openMs: number; activeMs: number } {
  const ceiling = Math.max(0, elapsedSinceLastMs + 2_000);
  const openMs = Math.round(Math.min(Math.max(0, Number.isFinite(reported.openMs) ? reported.openMs : 0), ceiling));
  const activeMs = Math.round(Math.min(Math.max(0, Number.isFinite(reported.activeMs) ? reported.activeMs : 0), openMs));
  return { openMs, activeMs };
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000);
  if (ms > 0 && totalMinutes === 0) return "<1 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
