import { describe, expect, it } from "vitest";
import { compileExpression } from "@/modules/assessments/math";
import {
  autoRange,
  chainRuleBreakdown,
  compose,
  differenceQuotient,
  isDifferentiableAt,
  numericDerivative,
  sampleCurve,
  secantLine,
  tangentLine,
} from "@/modules/simulations/calculus";
import {
  DEFAULT_COSTS,
  averageFixedCost,
  averageTotalCost,
  averageVariableCost,
  classify,
  marginalCost,
  minAtc,
  minAvc,
  outcome,
  profitAt,
  profitMaximizingQuantity,
  totalCost,
  variableCost,
  type CostParams,
} from "@/modules/simulations/economics";
import {
  DEFAULT_MOTION,
  areaUnderVelocity,
  displacement,
  distanceTravelled,
  position,
  positionRange,
  stateAt,
  turnaroundTime,
  velocity,
  velocityRange,
  type MotionParams,
} from "@/modules/simulations/kinematics";

/* ── Calculus ─────────────────────────────────────────────────────────────── */

describe("calculus: numeric derivative", () => {
  const sinOfSquare = (x: number) => Math.sin(x * x);

  it("matches 2x·cos(x²) for sin(x²) at several points", () => {
    for (const x of [-2.5, -1.3, -0.4, 0, 0.7, 1, 1.9, 2.6, 3]) {
      expect(numericDerivative(sinOfSquare, x), `x = ${x}`).toBeCloseTo(2 * x * Math.cos(x * x), 7);
      expect(Math.abs(numericDerivative(sinOfSquare, x) - 2 * x * Math.cos(x * x))).toBeLessThan(
        1e-5,
      );
    }
  });

  it("differentiates the standard families", () => {
    expect(numericDerivative((x) => x ** 3 - 3 * x, 2)).toBeCloseTo(9, 8);
    expect(numericDerivative(Math.exp, 1.5)).toBeCloseTo(Math.exp(1.5), 8);
    expect(numericDerivative(Math.log, 0.25)).toBeCloseTo(4, 7);
    expect(numericDerivative((x) => Math.cos(2 * x), 0.6)).toBeCloseTo(-2 * Math.sin(1.2), 8);
    // Horizontal tangents come out as zero, not noise.
    expect(Math.abs(numericDerivative((x) => x ** 3 - 3 * x, 1))).toBeLessThan(1e-8);
  });

  it("works on a function compiled from student-typed text", () => {
    const compiled = compileExpression("sin(x^2)", ["x"]);
    const f = (x: number) => compiled.evaluate({ x });
    expect(numericDerivative(f, 1.2)).toBeCloseTo(2.4 * Math.cos(1.44), 7);
  });

  it("stays accurate near the edge of a domain and is undefined outside it", () => {
    expect(numericDerivative(Math.log, 0.0004)).toBeCloseTo(2500, 2);
    expect(numericDerivative(Math.log, -1)).toBeNaN();
    expect(numericDerivative(Math.log, 0)).toBeNaN();
    expect(numericDerivative(Math.sqrt, -0.5)).toBeNaN();
  });

  it("reports no slope at a vertical tangent and flags a corner", () => {
    expect(numericDerivative(Math.cbrt, 0)).toBeNaN();
    expect(isDifferentiableAt(Math.abs, 0)).toBe(false);
    expect(isDifferentiableAt(Math.abs, 0.5)).toBe(true);
    expect(isDifferentiableAt(sinOfSquare, 1)).toBe(true);
  });
});

describe("calculus: tangent, secant and difference quotient", () => {
  const f = (x: number) => x ** 3 - 3 * x;

  it("tangent line passes through the point with the derivative as its slope", () => {
    for (const x0 of [-2, -0.5, 0, 1, 2.2]) {
      const line = tangentLine(f, x0);
      expect(line.y0).toBeCloseTo(f(x0), 12);
      expect(line.slope * x0 + line.intercept).toBeCloseTo(f(x0), 9);
      expect(line.slope).toBeCloseTo(3 * x0 * x0 - 3, 7);
    }
  });

  it("tangent to x² at x = 1 is y = 2x − 1", () => {
    const line = tangentLine((x) => x * x, 1);
    expect(line.slope).toBeCloseTo(2, 9);
    expect(line.intercept).toBeCloseTo(-1, 9);
  });

  it("difference quotient is exactly 2x₀ + h for x²", () => {
    expect(differenceQuotient((x) => x * x, 1, 0.5)).toBeCloseTo(2.5, 12);
    expect(differenceQuotient((x) => x * x, 3, -0.25)).toBeCloseTo(5.75, 12);
    expect(differenceQuotient((x) => x * x, 1, 0)).toBeNaN();
  });

  it("difference quotient converges to the derivative as h → 0", () => {
    const x0 = 0.8;
    const exact = Math.cos(x0);
    const errors = [1, 0.1, 0.01, 0.001, 0.0001].map((h) =>
      Math.abs(differenceQuotient(Math.sin, x0, h) - exact),
    );
    for (let i = 1; i < errors.length; i++) expect(errors[i]).toBeLessThan(errors[i - 1]);
    expect(errors[errors.length - 1]).toBeLessThan(1e-4);
    // First-order convergence: a 10× smaller step gives roughly a 10× smaller error.
    expect(errors[2] / errors[3]).toBeGreaterThan(8);
    expect(errors[2] / errors[3]).toBeLessThan(12);
  });

  it("secant line passes through both of its points", () => {
    const line = secantLine(f, 1, 0.75);
    expect(line.slope * 1 + line.intercept).toBeCloseTo(f(1), 10);
    expect(line.slope * 1.75 + line.intercept).toBeCloseTo(f(1.75), 10);
  });
});

describe("calculus: chain rule", () => {
  it("product of the inner and outer slopes equals the derivative of the composite", () => {
    const cases: { outer: (u: number) => number; inner: (x: number) => number }[] = [
      { outer: Math.sin, inner: (x) => x * x },
      { outer: (u) => u ** 3 / 20, inner: (x) => x * x + 1 },
      { outer: Math.cos, inner: (x) => 2 * x },
      { outer: Math.exp, inner: (x) => -0.5 * x * x },
    ];
    for (const { outer, inner } of cases) {
      const composite = compose(outer, inner);
      for (const x0 of [-1.7, -0.3, 0.9, 1.4]) {
        const parts = chainRuleBreakdown(outer, inner, x0);
        expect(parts.u).toBeCloseTo(inner(x0), 12);
        expect(parts.value).toBeCloseTo(composite(x0), 12);
        expect(parts.product).toBeCloseTo(parts.outerSlope * parts.innerSlope, 12);
        expect(parts.product).toBeCloseTo(numericDerivative(composite, x0), 6);
      }
    }
  });

  it("gives the textbook pieces for sin(x²) at x = 1", () => {
    const parts = chainRuleBreakdown(Math.sin, (x) => x * x, 1);
    expect(parts.u).toBeCloseTo(1, 12);
    expect(parts.innerSlope).toBeCloseTo(2, 8);
    expect(parts.outerSlope).toBeCloseTo(Math.cos(1), 8);
    expect(parts.product).toBeCloseTo(2 * Math.cos(1), 8);
  });
});

describe("calculus: sampling and auto range", () => {
  it("samples only finite points and includes both endpoints", () => {
    const parabola = sampleCurve((x) => x * x, -2, 2, 5);
    expect(parabola.map((p) => p.x)).toEqual([-2, -1, 0, 1, 2]);
    expect(parabola.map((p) => p.y)).toEqual([4, 1, 0, 1, 4]);

    const log = sampleCurve(Math.log, -1, 6, 141);
    expect(log.length).toBeGreaterThan(0);
    expect(log.length).toBeLessThan(141);
    for (const p of log) {
      expect(p.x).toBeGreaterThan(0);
      expect(Number.isFinite(p.y)).toBe(true);
    }
    expect(sampleCurve(() => Number.NaN, 0, 1, 20)).toEqual([]);
  });

  it("covers a tame curve completely and clamps a runaway one", () => {
    const tame = sampleCurve((x) => x ** 3 - 3 * x, -3, 3, 300).map((p) => p.y);
    const [lo, hi] = autoRange(tame);
    expect(lo).toBeLessThanOrEqual(-18);
    expect(hi).toBeGreaterThanOrEqual(18);

    const runaway = sampleCurve(Math.tan, -4, 4, 400).map((p) => p.y);
    const [tanLo, tanHi] = autoRange(runaway);
    expect(tanHi).toBeLessThan(Math.max(...runaway));
    expect(tanLo).toBeGreaterThan(Math.min(...runaway));
    expect(tanHi - tanLo).toBeLessThan(120);

    expect(autoRange([])).toEqual([-1, 1]);
    const [flatLo, flatHi] = autoRange([3, 3, 3]);
    expect(flatLo).toBeLessThan(3);
    expect(flatHi).toBeGreaterThan(3);
    expect(Number.isFinite(flatLo) && Number.isFinite(flatHi)).toBe(true);
  });
});

/* ── Economics ────────────────────────────────────────────────────────────── */

describe("firm: cost curves", () => {
  const p = DEFAULT_COSTS;

  it("uses the documented default cost function", () => {
    expect(p).toEqual({ F: 60, a: 10, b: 1, c: 0.05 });
    expect(totalCost(0)).toBe(60);
    expect(totalCost(10)).toBeCloseTo(60 + 100 - 100 + 50, 10);
    expect(variableCost(10)).toBeCloseTo(50, 10);
    expect(averageVariableCost(10)).toBeCloseTo(5, 10);
    expect(averageFixedCost(10)).toBeCloseTo(6, 10);
    expect(averageTotalCost(10)).toBeCloseTo(11, 10);
    expect(marginalCost(10)).toBeCloseTo(5, 10);
    expect(averageTotalCost(0)).toBeNaN();
  });

  it("MC is the derivative of total cost and of variable cost", () => {
    for (const q of [0.5, 3, 7.5, 12, 20]) {
      expect(marginalCost(q)).toBeCloseTo(
        numericDerivative((x) => totalCost(x), q),
        6,
      );
      expect(marginalCost(q)).toBeCloseTo(
        numericDerivative((x) => variableCost(x), q),
        6,
      );
    }
  });

  it("averages are totals divided by quantity, and ATC = AVC + AFC", () => {
    for (const q of [1, 4, 9.5, 16]) {
      expect(averageVariableCost(q)).toBeCloseTo(variableCost(q) / q, 10);
      expect(averageTotalCost(q)).toBeCloseTo(totalCost(q) / q, 10);
      expect(averageTotalCost(q)).toBeCloseTo(averageVariableCost(q) + averageFixedCost(q), 10);
    }
  });

  it("MC crosses AVC at the minimum of AVC", () => {
    const low = minAvc();
    expect(low.q).toBeCloseTo(10, 12);
    expect(low.value).toBeCloseTo(5, 12);
    expect(marginalCost(low.q)).toBeCloseTo(low.value, 10);
    expect(averageVariableCost(low.q - 0.01)).toBeGreaterThan(low.value);
    expect(averageVariableCost(low.q + 0.01)).toBeGreaterThan(low.value);
    // Below the minimum MC pulls the average down; above, it pulls it up.
    expect(marginalCost(low.q - 1)).toBeLessThan(averageVariableCost(low.q - 1));
    expect(marginalCost(low.q + 1)).toBeGreaterThan(averageVariableCost(low.q + 1));
  });

  it("MC crosses ATC at the minimum of ATC", () => {
    const low = minAtc();
    expect(marginalCost(low.q)).toBeCloseTo(low.value, 8);
    expect(averageTotalCost(low.q)).toBeCloseTo(low.value, 12);
    expect(Math.abs(numericDerivative((q) => averageTotalCost(q), low.q))).toBeLessThan(1e-6);
    for (const dq of [-2, -0.5, -0.01, 0.01, 0.5, 2])
      expect(averageTotalCost(low.q + dq)).toBeGreaterThan(low.value);
    expect(low.q).toBeGreaterThan(minAvc().q);
    expect(low.value).toBeGreaterThan(minAvc().value);
  });

  it("holds for other cost structures, including zero fixed cost", () => {
    const variants: CostParams[] = [
      { F: 0, a: 10, b: 1, c: 0.05 },
      { F: 150, a: 16, b: 1, c: 0.05 },
      { F: 25, a: 7, b: 1, c: 0.05 },
      { F: 90, a: 12, b: 0.6, c: 0.02 },
    ];
    for (const v of variants) {
      const avc = minAvc(v);
      const atc = minAtc(v);
      expect(marginalCost(avc.q, v)).toBeCloseTo(avc.value, 9);
      expect(marginalCost(atc.q, v)).toBeCloseTo(atc.value, 7);
      expect(atc.value).toBeGreaterThanOrEqual(avc.value);
    }
    const noFixed = variants[0];
    expect(minAtc(noFixed).q).toBeCloseTo(minAvc(noFixed).q, 9);
    expect(minAtc(noFixed).value).toBeCloseTo(minAvc(noFixed).value, 9);
  });
});

describe("firm: profit maximisation", () => {
  it("chooses the quantity on the rising branch of MC where MC = P", () => {
    for (const P of [5, 6, 8, 10.5, 14, 19, 24]) {
      const { q, shutDown } = profitMaximizingQuantity(P);
      expect(shutDown).toBe(false);
      expect(marginalCost(q)).toBeCloseTo(P, 9);
      // Rising branch: MC is increasing at q*.
      expect(numericDerivative((x) => marginalCost(x), q)).toBeGreaterThan(0);
      expect(q).toBeGreaterThanOrEqual(minAvc().q - 1e-9);
    }
  });

  it("q* earns more profit than any neighbouring quantity", () => {
    for (const P of [6, 9, 14, 20]) {
      const { q } = profitMaximizingQuantity(P);
      const best = profitAt(P, q);
      for (const dq of [-5, -1, -0.1, -0.001, 0.001, 0.1, 1, 5]) {
        expect(best, `P = ${P}, dq = ${dq}`).toBeGreaterThan(profitAt(P, q + dq));
      }
      // …and more than any quantity on a coarse grid of the whole range.
      for (let grid = 0; grid <= 30; grid += 0.25)
        expect(best).toBeGreaterThanOrEqual(profitAt(P, grid) - 1e-9);
    }
  });

  it("reports the outcome at the default price", () => {
    const P = 14;
    const { q } = profitMaximizingQuantity(P);
    expect(q).toBeCloseTo((2 + Math.sqrt(6.4)) / 0.3, 10);
    const r = outcome(P, q);
    expect(r.revenue).toBeCloseTo(P * q, 10);
    expect(r.totalCost).toBeCloseTo(totalCost(q), 10);
    expect(r.variableCost).toBeCloseTo(r.totalCost - DEFAULT_COSTS.F, 10);
    expect(r.profit).toBeCloseTo(r.revenue - r.totalCost, 10);
    expect(r.profit).toBeCloseTo((P - r.atc) * q, 9);
    expect(r.mc).toBeCloseTo(P, 9);
    expect(r.profit).toBeGreaterThan(0);
  });

  it("shuts down when price is below minimum AVC, losing exactly the fixed cost", () => {
    for (const P of [0, 2, 4.99]) {
      const best = profitMaximizingQuantity(P);
      expect(best).toEqual({ q: 0, shutDown: true });
      const r = outcome(P, best.q);
      expect(r.revenue).toBe(0);
      expect(r.profit).toBe(-DEFAULT_COSTS.F);
      expect(r.atc).toBeNaN();
      // Producing anything would lose more than the fixed cost.
      for (const q of [0.5, 5, 10, 15]) expect(profitAt(P, q)).toBeLessThan(-DEFAULT_COSTS.F);
      expect(classify(P)).toBe("shut_down");
    }
  });

  it("at the shutdown price the firm is indifferent: loss equals fixed cost either way", () => {
    const P = minAvc().value;
    const best = profitMaximizingQuantity(P);
    expect(best.shutDown).toBe(false);
    expect(best.q).toBeCloseTo(minAvc().q, 9);
    expect(profitAt(P, best.q)).toBeCloseTo(-DEFAULT_COSTS.F, 9);
  });

  it("continues at a loss smaller than fixed cost between min AVC and min ATC", () => {
    for (const P of [5.5, 7, 9.5]) {
      const { q, shutDown } = profitMaximizingQuantity(P);
      expect(shutDown).toBe(false);
      const profit = profitAt(P, q);
      expect(profit).toBeLessThan(0);
      expect(profit).toBeGreaterThan(-DEFAULT_COSTS.F);
      expect(classify(P)).toBe("loss_continue");
    }
  });
});

describe("firm: classification boundaries", () => {
  const shutdownPrice = minAvc().value;
  const breakEvenPrice = minAtc().value;

  it("separates the four cases at min AVC and min ATC", () => {
    expect(classify(shutdownPrice - 1e-6)).toBe("shut_down");
    expect(classify(shutdownPrice)).toBe("loss_continue");
    expect(classify(shutdownPrice + 1e-6)).toBe("loss_continue");
    expect(classify(breakEvenPrice - 0.05)).toBe("loss_continue");
    expect(classify(breakEvenPrice)).toBe("break_even");
    expect(classify(breakEvenPrice + 0.05)).toBe("economic_profit");
    expect(classify(14)).toBe("economic_profit");
    expect(classify(24)).toBe("economic_profit");
  });

  it("break-even means zero economic profit, and the sign of profit matches the label", () => {
    const { q } = profitMaximizingQuantity(breakEvenPrice);
    expect(q).toBeCloseTo(minAtc().q, 6);
    expect(profitAt(breakEvenPrice, q)).toBeCloseTo(0, 6);
    expect(
      profitAt(breakEvenPrice + 0.5, profitMaximizingQuantity(breakEvenPrice + 0.5).q),
    ).toBeGreaterThan(0);
    expect(
      profitAt(breakEvenPrice - 0.5, profitMaximizingQuantity(breakEvenPrice - 0.5).q),
    ).toBeLessThan(0);
  });

  it("respects the tolerance and a different cost structure", () => {
    expect(classify(breakEvenPrice + 0.02, DEFAULT_COSTS, 0.05)).toBe("break_even");
    expect(classify(breakEvenPrice + 0.02, DEFAULT_COSTS, 0.001)).toBe("economic_profit");
    const noFixed: CostParams = { F: 0, a: 10, b: 1, c: 0.05 };
    expect(classify(4.9, noFixed)).toBe("shut_down");
    expect(classify(5, noFixed)).toBe("break_even");
    expect(classify(6, noFixed)).toBe("economic_profit");
  });
});

/* ── Kinematics ───────────────────────────────────────────────────────────── */

describe("kinematics: constant acceleration", () => {
  const cases: MotionParams[] = [
    DEFAULT_MOTION,
    { x0: -5, v0: 0, a: 2 },
    { x0: 12, v0: -6, a: 1.5 },
    { x0: 3, v0: 7, a: 0 },
    { x0: 0, v0: -4, a: -2 },
  ];
  const times = [0.5, 1, 2.75, 4, 6.2, 8];

  it("uses the documented defaults and equations", () => {
    expect(DEFAULT_MOTION).toEqual({ x0: 0, v0: 4, a: -1 });
    expect(position(2)).toBeCloseTo(0 + 4 * 2 + 0.5 * -1 * 4, 12);
    expect(velocity(2)).toBeCloseTo(2, 12);
    expect(position(3, { x0: 2, v0: 5, a: 4 })).toBeCloseTo(2 + 15 + 18, 12);
  });

  it("velocity equals the numerical derivative of position", () => {
    for (const p of cases) {
      for (const t of times) {
        expect(velocity(t, p)).toBeCloseTo(
          numericDerivative((s) => position(s, p), t),
          6,
        );
      }
    }
  });

  it("acceleration equals the numerical derivative of velocity", () => {
    for (const p of cases)
      expect(numericDerivative((s) => velocity(s, p), 3.3)).toBeCloseTo(p.a, 7);
  });

  it("area under the velocity–time graph equals displacement", () => {
    for (const p of cases) {
      for (const t of times) {
        expect(areaUnderVelocity(t, p)).toBeCloseTo(displacement(t, p), 10);
        // Independent check: a fine midpoint Riemann sum of v(t).
        const n = 2000;
        let sum = 0;
        for (let i = 0; i < n; i++) sum += velocity(((i + 0.5) * t) / n, p) * (t / n);
        expect(sum).toBeCloseTo(displacement(t, p), 8);
      }
    }
  });

  it("finds the turnaround only when velocity really changes sign at t > 0", () => {
    expect(turnaroundTime()).toBeCloseTo(4, 12);
    expect(velocity(turnaroundTime()!)).toBeCloseTo(0, 12);
    expect(turnaroundTime({ x0: 0, v0: 4, a: 1 })).toBeNull();
    expect(turnaroundTime({ x0: 0, v0: -4, a: -1 })).toBeNull();
    expect(turnaroundTime({ x0: 0, v0: 4, a: 0 })).toBeNull();
    expect(turnaroundTime({ x0: 0, v0: 0, a: 3 })).toBeNull();
    expect(turnaroundTime({ x0: 0, v0: -6, a: 1.5 })).toBeCloseTo(4, 12);
  });

  it("distance is at least |displacement| and equals it until the turnaround", () => {
    for (const p of cases) {
      const turn = turnaroundTime(p);
      for (const t of times) {
        const distance = distanceTravelled(t, p);
        const dx = Math.abs(displacement(t, p));
        expect(distance).toBeGreaterThanOrEqual(dx - 1e-12);
        if (turn === null || t <= turn) expect(distance).toBeCloseTo(dx, 12);
        else expect(distance).toBeGreaterThan(dx);
        // Independent check: integrate speed |v| numerically.
        const n = 20000;
        let path = 0;
        for (let i = 0; i < n; i++) path += Math.abs(velocity(((i + 0.5) * t) / n, p)) * (t / n);
        expect(distance).toBeCloseTo(path, 5);
      }
    }
  });

  it("adds both legs after a turnaround", () => {
    // Default: out 8 m by t = 4, then back. At t = 8 it is home again.
    expect(displacement(4)).toBeCloseTo(8, 12);
    expect(distanceTravelled(4)).toBeCloseTo(8, 12);
    expect(displacement(6)).toBeCloseTo(6, 12);
    expect(distanceTravelled(6)).toBeCloseTo(10, 12);
    expect(displacement(8)).toBeCloseTo(0, 12);
    expect(distanceTravelled(8)).toBeCloseTo(16, 12);
  });

  it("distance never decreases over time", () => {
    for (const p of cases) {
      let previous = 0;
      for (let t = 0; t <= 8; t += 0.05) {
        const d = distanceTravelled(t, p);
        expect(d).toBeGreaterThanOrEqual(previous - 1e-12);
        previous = d;
      }
    }
  });

  it("reset values: at t = 0 the object is at x0 moving at v0, having gone nowhere", () => {
    for (const p of cases) {
      expect(stateAt(0, p)).toEqual({ t: 0, x: p.x0, v: p.v0, displacement: 0, distance: 0 });
      expect(areaUnderVelocity(0, p)).toBe(0);
    }
  });

  it("stateAt agrees with the individual functions", () => {
    const p = { x0: 2, v0: -3, a: 1.25 };
    const s = stateAt(5.5, p);
    expect(s.x).toBe(position(5.5, p));
    expect(s.v).toBe(velocity(5.5, p));
    expect(s.displacement).toBe(displacement(5.5, p));
    expect(s.distance).toBe(distanceTravelled(5.5, p));
  });

  it("position and velocity ranges bound the whole run", () => {
    for (const p of cases) {
      const [xLo, xHi] = positionRange(8, p);
      const [vLo, vHi] = velocityRange(8, p);
      for (let t = 0; t <= 8; t += 0.01) {
        expect(position(t, p)).toBeGreaterThanOrEqual(xLo - 1e-9);
        expect(position(t, p)).toBeLessThanOrEqual(xHi + 1e-9);
        expect(velocity(t, p)).toBeGreaterThanOrEqual(vLo - 1e-9);
        expect(velocity(t, p)).toBeLessThanOrEqual(vHi + 1e-9);
      }
    }
    expect(positionRange(8)).toEqual([0, 8]);
    expect(velocityRange(8)).toEqual([-4, 4]);
  });
});
