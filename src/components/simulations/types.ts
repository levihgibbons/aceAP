/** Shared contract for every native simulation. */
export type SimParams = Record<string, number | string>;

export interface SimulationProps {
  /** Initial values. Unknown keys are ignored; missing keys use defaults. */
  params?: SimParams;
  /** Tighter layout when embedded inside a question as a stimulus. */
  compact?: boolean;
  /**
   * Called on meaningful interaction (slider change, drag, play/pause).
   * The host throttles this and records an engagement event only —
   * a simulation never writes mastery.
   */
  onInteract?: () => void;
}

export const SIMULATION_IDS = ["derivative-explorer", "firm-behavior-lab", "motion-lab"] as const;
export type SimulationId = (typeof SIMULATION_IDS)[number];
