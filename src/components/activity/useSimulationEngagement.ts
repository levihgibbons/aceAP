"use client";
/**
 * Throttled engagement reporting for simulations. Returns an `onInteract`
 * callback for <Simulation>. Every call marks a meaningful interaction for
 * the active-time meter; at most one SIMULATION_INTERACTED event per
 * simulation per 30 s is sent, containing only the simulation id and the
 * lesson or question it lives in. Simulations never change mastery.
 */
import { useCallback, useRef } from "react";
import { markInteraction } from "./interaction";

const THROTTLE_MS = 30_000;

export function useSimulationEngagement(target: { simId: string; lessonId?: string; questionId?: string }) {
  const last = useRef(0);
  const { simId, lessonId, questionId } = target;
  return useCallback(() => {
    markInteraction();
    const now = Date.now();
    if (now - last.current < THROTTLE_MS) return;
    last.current = now;
    const body = lessonId ? { simId, lessonId } : questionId ? { simId, questionId } : { simId };
    void fetch("/api/activity/simulation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  }, [simId, lessonId, questionId]);
}
