/**
 * Numerical calculus used by the Derivative Explorer.
 *
 * Framework-free and deterministic: every slope shown in the UI is computed
 * here from real function evaluations (no lookup tables, no symbolic shortcuts).
 */

export type RealFunction = (x: number) => number;

export interface Point {
  x: number;
  y: number;
}

export interface Line {
  slope: number;
  intercept: number;
}

export interface TangentLine extends Line {
  x0: number;
  y0: number;
}

export interface ChainRuleBreakdown {
  /** u = inner(x0) */
  u: number;
  /** outer(u) — the value of the composite at x0 */
  value: number;
  /** inner′(x0) = du/dx */
  innerSlope: number;
  /** outer′(u) = dy/du, evaluated at u = inner(x0) */
  outerSlope: number;
  /** outer′(u) · inner′(x0) = dy/dx by the chain rule */
  product: number;
}

/** Evaluate f, mapping thrown errors and non-finite results to NaN. */
export function evaluate(f: RealFunction, x: number): number {
  try {
    const y = f(x);
    return Number.isFinite(y) ? y : Number.NaN;
  } catch {
    return Number.NaN;
  }
}

function centralDifference(f: RealFunction, x: number, h: number): number {
  return (evaluate(f, x + h) - evaluate(f, x - h)) / (2 * h);
}

/**
 * f′(x) by a central difference with one step of Richardson extrapolation
 * (error O(h⁴)).
 *
 * Returns NaN where f is undefined at x, undefined on either side of x, or
 * where the difference quotients do not settle as the step shrinks (a vertical
 * tangent, a jump). Corners such as |x| at 0 are symmetric, so use
 * `oneSidedSlopes` to detect those.
 */
export function numericDerivative(f: RealFunction, x: number, h?: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(evaluate(f, x))) return Number.NaN;
  let step = h !== undefined && Number.isFinite(h) && h > 0 ? h : 1e-3 * Math.max(1, Math.abs(x));
  for (let attempt = 0; attempt < 5; attempt++) {
    const coarse = centralDifference(f, x, step);
    const fine = centralDifference(f, x, step / 2);
    if (Number.isFinite(coarse) && Number.isFinite(fine)) {
      const settled = Math.abs(coarse - fine) <= 1e-2 * Math.max(1, Math.abs(fine));
      if (settled) return (4 * fine - coarse) / 3;
    }
    // Too close to a domain edge or changing too quickly: try a smaller step.
    step /= 10;
  }
  return Number.NaN;
}

/** Slopes of f just to the left and just to the right of x0. */
export function oneSidedSlopes(
  f: RealFunction,
  x0: number,
  h = 1e-5,
): { left: number; right: number } {
  const y0 = evaluate(f, x0);
  return {
    left: (y0 - evaluate(f, x0 - h)) / h,
    right: (evaluate(f, x0 + h) - y0) / h,
  };
}

/** True when f has a single well-defined (finite) slope at x0. */
export function isDifferentiableAt(f: RealFunction, x0: number): boolean {
  if (!Number.isFinite(numericDerivative(f, x0))) return false;
  const { left, right } = oneSidedSlopes(f, x0);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  return Math.abs(left - right) <= 1e-3 * Math.max(1, Math.abs(left), Math.abs(right));
}

/** The tangent to f at x0: y = slope · x + intercept, through (x0, f(x0)). */
export function tangentLine(f: RealFunction, x0: number): TangentLine {
  const y0 = evaluate(f, x0);
  const slope = numericDerivative(f, x0);
  return { x0, y0, slope, intercept: y0 - slope * x0 };
}

/** [f(x0 + h) − f(x0)] / h — the slope of the secant from x0 to x0 + h. */
export function differenceQuotient(f: RealFunction, x0: number, h: number): number {
  if (!Number.isFinite(h) || h === 0) return Number.NaN;
  return (evaluate(f, x0 + h) - evaluate(f, x0)) / h;
}

/** The secant line through (x0, f(x0)) and (x0 + h, f(x0 + h)). */
export function secantLine(f: RealFunction, x0: number, h: number): Line {
  const slope = differenceQuotient(f, x0, h);
  return { slope, intercept: evaluate(f, x0) - slope * x0 };
}

/** x ↦ outer(inner(x)) */
export function compose(outer: RealFunction, inner: RealFunction): RealFunction {
  return (x) => evaluate(outer, evaluate(inner, x));
}

/**
 * Chain rule at x0 for y = outer(u), u = inner(x). Each slope is measured
 * numerically and independently; `product` is dy/du · du/dx.
 */
export function chainRuleBreakdown(
  outer: RealFunction,
  inner: RealFunction,
  x0: number,
): ChainRuleBreakdown {
  const u = evaluate(inner, x0);
  const innerSlope = numericDerivative(inner, x0);
  const outerSlope = numericDerivative(outer, u);
  return { u, value: evaluate(outer, u), innerSlope, outerSlope, product: outerSlope * innerSlope };
}

/**
 * Sample f at n evenly spaced x values on [xmin, xmax] (endpoints included).
 * Points where f is undefined or non-finite are omitted.
 */
export function sampleCurve(f: RealFunction, xmin: number, xmax: number, n: number): Point[] {
  const count = Math.max(2, Math.floor(n));
  const points: Point[] = [];
  if (!Number.isFinite(xmin) || !Number.isFinite(xmax) || xmax <= xmin) return points;
  for (let i = 0; i < count; i++) {
    const x = xmin + ((xmax - xmin) * i) / (count - 1);
    const y = evaluate(f, x);
    if (Number.isFinite(y)) points.push({ x, y });
  }
  return points;
}

function quantile(sorted: number[], q: number): number {
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export interface AutoRangeOptions {
  /** Fraction of the span added above and below. Default 0.08. */
  padding?: number;
  /** Smallest span returned. Default 1. */
  minSpan?: number;
}

/**
 * A sensible vertical window for sampled values. Extremes that run away
 * (eˣ, ln x near 0, tan x near an asymptote) are clamped to one central span
 * beyond the 5th–95th percentile band so the interesting part stays visible.
 */
export function autoRange(values: number[], options: AutoRangeOptions = {}): [number, number] {
  const padding = options.padding ?? 0.08;
  const minSpan = options.minSpan ?? 1;
  const finite = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (finite.length === 0) return [-1, 1];

  const min = finite[0];
  const max = finite[finite.length - 1];
  const q05 = quantile(finite, 0.05);
  const q95 = quantile(finite, 0.95);
  const band = q95 - q05;
  let lo = Math.max(min, q05 - band);
  let hi = Math.min(max, q95 + band);
  lo = Math.max(lo, -1e6);
  hi = Math.min(hi, 1e6);

  if (hi - lo < minSpan) {
    const mid = (hi + lo) / 2;
    lo = mid - minSpan / 2;
    hi = mid + minSpan / 2;
  }
  const pad = (hi - lo) * padding;
  return [lo - pad, hi + pad];
}
