"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { SIMULATION_IDS, type SimulationId, type SimulationProps } from "./types";

/** Placeholder with roughly the footprint of a simulation, shown while its code loads. */
function SimulationSkeleton() {
  return (
    <div role="status" aria-busy="true" className="rounded-xl border border-line bg-surface p-4">
      <span className="sr-only">Loading simulation…</span>
      <div aria-hidden="true" className="animate-pulse space-y-3">
        <div className="h-4 w-40 rounded bg-sunken" />
        <div className="h-60 rounded-lg bg-sunken" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="h-12 rounded-lg bg-sunken" />
          <div className="h-12 rounded-lg bg-sunken" />
          <div className="hidden h-12 rounded-lg bg-sunken sm:block" />
        </div>
        <div className="h-10 rounded-lg bg-sunken" />
      </div>
    </div>
  );
}

const loading = () => <SimulationSkeleton />;

/**
 * Every native simulation, keyed by the id content refers to. Each one is
 * loaded on demand in the browser only (they measure the DOM and animate).
 */
export const SIMULATIONS: Record<
  SimulationId,
  { name: string; Component: ComponentType<SimulationProps> }
> = {
  "derivative-explorer": {
    name: "Derivative Explorer",
    Component: dynamic(() => import("./DerivativeExplorer"), { ssr: false, loading }),
  },
  "firm-behavior-lab": {
    name: "Firm Behavior Lab",
    Component: dynamic(() => import("./FirmBehaviorLab"), { ssr: false, loading }),
  },
  "motion-lab": {
    name: "Motion Lab",
    Component: dynamic(() => import("./MotionLab"), { ssr: false, loading }),
  },
};

export function isSimulationId(id: string): id is SimulationId {
  return (SIMULATION_IDS as readonly string[]).includes(id);
}

/** Render a simulation by id, or say plainly that it isn't available. */
export function Simulation({ id, ...props }: { id: string } & SimulationProps) {
  if (!isSimulationId(id)) {
    return (
      <div
        role="status"
        className="rounded-xl border border-line bg-surface-2 p-4 text-sm text-ink-2"
      >
        <p className="font-medium text-ink">{"This simulation isn't available."}</p>
        <p className="mt-1 text-muted">You can keep going with the rest of the lesson.</p>
      </div>
    );
  }
  const { Component } = SIMULATIONS[id];
  return <Component {...props} />;
}
