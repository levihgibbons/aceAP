/**
 * Short-run model of a perfectly competitive (price-taking) firm.
 *
 *   TC(q)  = F + a·q − b·q² + c·q³        (q ≥ 0)
 *   VC(q)  = a·q − b·q² + c·q³
 *   MC(q)  = a − 2b·q + 3c·q²
 *   AVC(q) = a − b·q + c·q²
 *   AFC(q) = F / q
 *   ATC(q) = AVC(q) + AFC(q)
 *
 * The firm takes the market price P as given, so P = MR = AR. Framework-free;
 * every number the Firm Behavior Lab shows comes from these functions.
 */

export interface CostParams {
  /** Fixed cost F ($) */
  F: number;
  /** Linear cost coefficient a ($ per unit) — MC and AVC both start at a. */
  a: number;
  /** Quadratic coefficient b (enters as −b·q²: early increasing marginal returns). */
  b: number;
  /** Cubic coefficient c (enters as +c·q³: eventual diminishing marginal returns). */
  c: number;
}

export const DEFAULT_COSTS: CostParams = { F: 60, a: 10, b: 1, c: 0.05 };

export type FirmStatus = "economic_profit" | "break_even" | "loss_continue" | "shut_down";

export interface Extremum {
  q: number;
  value: number;
}

export interface FirmOutcome {
  revenue: number;
  totalCost: number;
  variableCost: number;
  profit: number;
  /** NaN at q = 0, where average cost is undefined. */
  atc: number;
  /** NaN at q = 0, where average cost is undefined. */
  avc: number;
  mc: number;
}

const output = (q: number) => Math.max(0, q);

export function variableCost(q: number, p: CostParams = DEFAULT_COSTS): number {
  const x = output(q);
  return p.a * x - p.b * x * x + p.c * x * x * x;
}

export function totalCost(q: number, p: CostParams = DEFAULT_COSTS): number {
  return p.F + variableCost(q, p);
}

export function marginalCost(q: number, p: CostParams = DEFAULT_COSTS): number {
  const x = output(q);
  return p.a - 2 * p.b * x + 3 * p.c * x * x;
}

export function averageVariableCost(q: number, p: CostParams = DEFAULT_COSTS): number {
  const x = output(q);
  return p.a - p.b * x + p.c * x * x;
}

/** F / q. Undefined (NaN) at q = 0. */
export function averageFixedCost(q: number, p: CostParams = DEFAULT_COSTS): number {
  return q > 0 ? p.F / q : Number.NaN;
}

/** AVC + AFC. Undefined (NaN) at q = 0. */
export function averageTotalCost(q: number, p: CostParams = DEFAULT_COSTS): number {
  return q > 0 ? averageVariableCost(q, p) + p.F / q : Number.NaN;
}

/** Minimum of AVC — the shutdown price. Analytic: dAVC/dq = −b + 2c·q = 0. */
export function minAvc(p: CostParams = DEFAULT_COSTS): Extremum {
  const q = p.b / (2 * p.c);
  return { q, value: averageVariableCost(q, p) };
}

/**
 * Minimum of ATC — the break-even price. Found numerically where MC = ATC:
 * q·(MC − ATC) = 2c·q³ − b·q² − F, which is ≤ 0 at the AVC minimum and
 * increasing beyond it, so bisection brackets the single root.
 */
export function minAtc(p: CostParams = DEFAULT_COSTS): Extremum {
  const g = (q: number) => 2 * p.c * q * q * q - p.b * q * q - p.F;
  let lo = p.b / (2 * p.c);
  if (!(p.F > 0)) return { q: lo, value: averageVariableCost(lo, p) };
  let hi = Math.max(2 * lo, 1);
  for (let i = 0; i < 80 && g(hi) < 0; i++) hi *= 2;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (g(mid) < 0) lo = mid;
    else hi = mid;
    if (hi - lo <= 1e-13 * Math.max(1, hi)) break;
  }
  const q = (lo + hi) / 2;
  return { q, value: averageTotalCost(q, p) };
}

/**
 * The profit-maximizing output at price P: the quantity on the RISING part of
 * MC where MC = P (the larger root of 3c·q² − 2b·q + (a − P) = 0), or zero
 * when P is below minimum AVC and the firm shuts down.
 */
export function profitMaximizingQuantity(
  P: number,
  p: CostParams = DEFAULT_COSTS,
): { q: number; shutDown: boolean } {
  if (!Number.isFinite(P) || P < minAvc(p).value) return { q: 0, shutDown: true };
  const discriminant = 4 * p.b * p.b - 12 * p.c * (p.a - P);
  const q = (2 * p.b + Math.sqrt(Math.max(0, discriminant))) / (6 * p.c);
  return { q, shutDown: false };
}

/** Revenue, costs and profit from selling q units at price P. */
export function outcome(P: number, q: number, p: CostParams = DEFAULT_COSTS): FirmOutcome {
  const x = output(q);
  const revenue = P * x;
  const vc = variableCost(x, p);
  const tc = p.F + vc;
  return {
    revenue,
    totalCost: tc,
    variableCost: vc,
    profit: revenue - tc,
    atc: averageTotalCost(x, p),
    avc: x > 0 ? averageVariableCost(x, p) : Number.NaN,
    mc: marginalCost(x, p),
  };
}

/** Profit from selling q units at price P (equals −F at q = 0). */
export function profitAt(P: number, q: number, p: CostParams = DEFAULT_COSTS): number {
  return outcome(P, q, p).profit;
}

/**
 * The firm's short-run position at price P:
 *   P < min AVC            → shut_down       (q = 0, loss = F)
 *   P ≈ min ATC            → break_even      (zero economic profit)
 *   P > min ATC            → economic_profit
 *   min AVC ≤ P < min ATC  → loss_continue   (loss smaller than F)
 * `tolerance` is how close P must be to min ATC to count as break-even.
 */
export function classify(P: number, p: CostParams = DEFAULT_COSTS, tolerance = 0.005): FirmStatus {
  if (P < minAvc(p).value) return "shut_down";
  const breakEven = minAtc(p).value;
  if (Math.abs(P - breakEven) <= tolerance) return "break_even";
  return P > breakEven ? "economic_profit" : "loss_continue";
}
