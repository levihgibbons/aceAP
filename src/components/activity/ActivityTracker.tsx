"use client";
/**
 * ActivityTracker — measures active learning time on a lesson, attempt or
 * simulation page and reports it as heartbeats.
 *
 *   <ActivityTracker activityKind="lesson" courseId={courseId} activityId={lessonId} />
 *
 * Privacy: only the *timestamps* of meaningful interactions (pointer press,
 * key press, scrolling, simulation interaction, answer submit) feed the
 * meter. No key values, pointer positions or page content are read or sent —
 * a heartbeat is just { sessionId, openMs, activeMs }.
 *
 * The same ActiveTimeMeter class runs on the server's tests, so the measured
 * logic is the tested logic. The server clamps every heartbeat again.
 */
import { useEffect, useState } from "react";
import { ActiveTimeMeter, DEFAULT_IDLE_THRESHOLD_MS, formatDuration } from "@/modules/analytics/activeTime";
import { INTERACTION_EVENT, sendOnUnload } from "./interaction";

export type ActivityKind = "lesson" | "practice" | "assessment" | "simulation";

export interface ActivityTrackerProps {
  activityKind: ActivityKind;
  courseId?: string | null;
  activityId?: string | null;
  /** Gap with no interaction after which time stops counting as active (default 60 s). */
  idleThresholdMs?: number;
  /** Show a subtle "Active time this session" readout. */
  showReadout?: boolean;
}

const HEARTBEAT_MS = 15_000;
const TICK_MS = 1_000;

export function ActivityTracker({ activityKind, courseId, activityId, idleThresholdMs = DEFAULT_IDLE_THRESHOLD_MS, showReadout = false }: ActivityTrackerProps) {
  const [activeMs, setActiveMs] = useState(0);

  useEffect(() => {
    let disposed = false;
    let sessionId: string | null = null;
    let total = 0;
    const meter = new ActiveTimeMeter(idleThresholdMs, Date.now());
    meter.setVisible(document.visibilityState === "visible", Date.now());

    const flush = (mode: "fetch" | "beacon") => {
      meter.tick(Date.now());
      if (!sessionId) return;
      const { openMs, activeMs: active } = meter.drain();
      total += active;
      if (openMs <= 0 && active <= 0) return;
      const body = { sessionId, openMs, activeMs: active };
      if (mode === "beacon") sendOnUnload("/api/activity/heartbeat", body);
      else
        void fetch("/api/activity/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          keepalive: true,
        }).catch(() => {});
    };

    // Delay the session start one tick so React Strict Mode's mount/unmount/mount
    // in development doesn't open two sessions.
    const startTimer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/activity/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityKind, courseId: courseId ?? undefined, activityId: activityId ?? undefined }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { sessionId?: string };
        if (!disposed && data.sessionId) sessionId = data.sessionId;
      } catch {
        // Offline or signed out: time simply isn't recorded.
      }
    }, 50);

    const onInteraction = () => meter.interaction(Date.now());
    let lastScroll = 0;
    const onScroll = () => {
      const now = Date.now();
      if (now - lastScroll < 1_000) return;
      lastScroll = now;
      meter.interaction(now);
    };
    const onVisibility = () => {
      const visible = document.visibilityState === "visible";
      meter.setVisible(visible, Date.now());
      if (!visible) flush("beacon");
    };
    const onPageHide = () => flush("beacon");

    const tick = window.setInterval(() => {
      meter.tick(Date.now());
      if (showReadout) setActiveMs(total + meter.peek().activeMs);
    }, TICK_MS);
    const beat = window.setInterval(() => flush("fetch"), HEARTBEAT_MS);

    document.addEventListener("pointerdown", onInteraction, { capture: true, passive: true });
    document.addEventListener("keydown", onInteraction, { capture: true, passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener(INTERACTION_EVENT, onInteraction);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      disposed = true;
      window.clearTimeout(startTimer);
      window.clearInterval(tick);
      window.clearInterval(beat);
      document.removeEventListener("pointerdown", onInteraction, { capture: true });
      document.removeEventListener("keydown", onInteraction, { capture: true });
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener(INTERACTION_EVENT, onInteraction);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      // Client-side navigation away from the page: send what's left.
      flush("beacon");
    };
  }, [activityKind, courseId, activityId, idleThresholdMs, showReadout]);

  if (!showReadout) return null;
  return (
    <p className="text-xs text-muted tabular-nums">
      Active time this session: <span className="font-medium text-ink-2">{formatDuration(activeMs)}</span>
    </p>
  );
}
