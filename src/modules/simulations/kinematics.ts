/**
 * One-dimensional motion with constant acceleration (AP Physics 1).
 *
 *   x(t) = x0 + v0·t + ½·a·t²
 *   v(t) = v0 + a·t
 *
 * SI units throughout: metres, seconds, m/s, m/s². Framework-free; the Motion
 * Lab's animation, graphs, readouts and equation table all read from here.
 */

export interface MotionParams {
  /** Initial position (m) */
  x0: number;
  /** Initial velocity (m/s) */
  v0: number;
  /** Constant acceleration (m/s²) */
  a: number;
}

export const DEFAULT_MOTION: MotionParams = { x0: 0, v0: 4, a: -1 };

export interface MotionState {
  t: number;
  x: number;
  v: number;
  displacement: number;
  distance: number;
}

export function position(t: number, p: MotionParams = DEFAULT_MOTION): number {
  return p.x0 + p.v0 * t + 0.5 * p.a * t * t;
}

export function velocity(t: number, p: MotionParams = DEFAULT_MOTION): number {
  return p.v0 + p.a * t;
}

/** Change in position from t = 0: x(t) − x0. */
export function displacement(t: number, p: MotionParams = DEFAULT_MOTION): number {
  return position(t, p) - p.x0;
}

/**
 * The time t > 0 at which velocity passes through zero and the object
 * reverses direction, or null if it never does.
 */
export function turnaroundTime(p: MotionParams = DEFAULT_MOTION): number | null {
  if (p.a === 0 || p.v0 === 0) return null;
  const t = -p.v0 / p.a;
  return t > 0 && Number.isFinite(t) ? t : null;
}

/**
 * Total path length covered from 0 to t. Equals |displacement| until the
 * object turns around; after that the two legs are added.
 */
export function distanceTravelled(t: number, p: MotionParams = DEFAULT_MOTION): number {
  if (!(t > 0)) return 0;
  const turn = turnaroundTime(p);
  if (turn === null || t <= turn) return Math.abs(displacement(t, p));
  const outbound = displacement(turn, p);
  return Math.abs(outbound) + Math.abs(displacement(t, p) - outbound);
}

/**
 * Signed area between the velocity–time graph and the time axis from 0 to t.
 * v(t) is a straight line, so the trapezoid ½·(v(0) + v(t))·t is exact — and
 * it equals the displacement.
 */
export function areaUnderVelocity(t: number, p: MotionParams = DEFAULT_MOTION): number {
  // "+ 0" turns a negative zero (negative velocity × zero time) into plain 0.
  return 0.5 * (velocity(0, p) + velocity(t, p)) * t + 0;
}

/** Everything the readouts show at time t. */
export function stateAt(t: number, p: MotionParams = DEFAULT_MOTION): MotionState {
  return {
    t,
    x: position(t, p),
    v: velocity(t, p),
    displacement: displacement(t, p),
    distance: distanceTravelled(t, p),
  };
}

/** Smallest and largest position reached during 0 ≤ t ≤ duration. */
export function positionRange(
  duration: number,
  p: MotionParams = DEFAULT_MOTION,
): [number, number] {
  const candidates = [position(0, p), position(duration, p)];
  const turn = turnaroundTime(p);
  if (turn !== null && turn < duration) candidates.push(position(turn, p));
  return [Math.min(...candidates), Math.max(...candidates)];
}

/** Smallest and largest velocity during 0 ≤ t ≤ duration. */
export function velocityRange(
  duration: number,
  p: MotionParams = DEFAULT_MOTION,
): [number, number] {
  const start = velocity(0, p);
  const end = velocity(duration, p);
  return [Math.min(start, end), Math.max(start, end)];
}
