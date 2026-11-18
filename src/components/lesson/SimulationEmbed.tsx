"use client";
/** Client island for a lesson simulation block: renders the simulation and reports throttled engagement. */
import { Simulation } from "@/components/simulations/registry";
import { useSimulationEngagement } from "@/components/activity/useSimulationEngagement";

export function SimulationEmbed({ simId, params, lessonId }: { simId: string; params?: Record<string, number | string>; lessonId: string }) {
  const onInteract = useSimulationEngagement({ simId, lessonId });
  return <Simulation id={simId} params={params} onInteract={onInteract} />;
}
