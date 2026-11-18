"use client";

import clsx from "clsx";
import { useId, useMemo, useState, type FormEvent } from "react";
import {
  compileExpression,
  ExpressionError,
  type CompiledExpression,
} from "@/modules/assessments/math";
import {
  autoRange,
  chainRuleBreakdown,
  compose,
  differenceQuotient,
  evaluate,
  isDifferentiableAt,
  numericDerivative,
  sampleCurve,
  secantLine,
  tangentLine,
  type RealFunction,
} from "@/modules/simulations/calculus";
import {
  Curve,
  Dot,
  LegendItem,
  LiveSummary,
  Plot,
  PlotLabel,
  SimFrame,
  SliderField,
  Stat,
  StraightLine,
  ToggleField,
  VLine,
  buttonClass,
  clamp,
  formatNumber,
  numberParam,
  spoken,
  stringParam,
  type PointerPhase,
} from "./Plot";
import type { SimParams, SimulationProps } from "./types";

/* ── Functions the student can explore ────────────────────────────────────── */

interface FunctionSpec {
  /** Preset id, or null for a typed / supplied function. */
  id: string | null;
  /** How f(x) is written for the student. */
  label: string;
  /** Expression in x (used when there is no chain decomposition). */
  expr: string;
  /** y = outer(u), u = inner(x) — enables the chain-rule panel. */
  chain?: { outer: string; inner: string };
  domain: [number, number];
}

interface ActiveFunction extends FunctionSpec {
  f: RealFunction;
  outer?: RealFunction;
  inner?: RealFunction;
}

const PRESETS: FunctionSpec[] = [
  { id: "square", label: "x^2", expr: "x^2", domain: [-3, 3] },
  { id: "cubic", label: "x^3 - 3x", expr: "x^3 - 3x", domain: [-3, 3] },
  { id: "sine", label: "sin(x)", expr: "sin(x)", domain: [-6.5, 6.5] },
  {
    id: "sine-square",
    label: "sin(x^2)",
    expr: "sin(x^2)",
    chain: { outer: "sin(u)", inner: "x^2" },
    domain: [-3, 3],
  },
  { id: "exp", label: "e^x", expr: "e^x", domain: [-3, 3] },
  { id: "ln", label: "ln(x)", expr: "ln(x)", domain: [-1, 6] },
  {
    id: "power",
    label: "(x^2+1)^3/20",
    expr: "(x^2+1)^3/20",
    chain: { outer: "u^3/20", inner: "x^2+1" },
    domain: [-2, 2],
  },
  {
    id: "cosine",
    label: "cos(2x)",
    expr: "cos(2x)",
    chain: { outer: "cos(u)", inner: "2x" },
    domain: [-3.5, 3.5],
  },
];

const X_STEP = 0.05;
const DEFAULT_X = 1;

const squash = (text: string) => text.replace(/\s+/g, "").toLowerCase();

function snap(x: number, [min, max]: [number, number]): number {
  return clamp(Number((Math.round(x / X_STEP) * X_STEP).toFixed(2)), min, max);
}

function customDomain(x: number): [number, number] {
  const reach = clamp(Math.ceil(Math.abs(x)) + 1, 4, 50);
  return [-reach, reach];
}

function toFunction(compiled: CompiledExpression, variable: string): RealFunction {
  return (value) => {
    try {
      const y = compiled.evaluate({ [variable]: value });
      return typeof y === "number" && Number.isFinite(y) ? y : Number.NaN;
    } catch {
      return Number.NaN;
    }
  };
}

/** Compile a spec with the whitelisted parser. Throws ExpressionError if it can't be graphed. */
function activate(spec: FunctionSpec): ActiveFunction {
  let active: ActiveFunction;
  if (spec.chain) {
    const inner = toFunction(compileExpression(spec.chain.inner, ["x"]), "x");
    const outer = toFunction(compileExpression(spec.chain.outer, ["u"]), "u");
    active = { ...spec, f: compose(outer, inner), outer, inner };
  } else {
    active = { ...spec, f: toFunction(compileExpression(spec.expr, ["x"]), "x") };
  }
  const [min, max] = spec.domain;
  if (sampleCurve(active.f, min, max, 161).length < 2) {
    throw new ExpressionError(
      `That function has no real values between x = ${formatNumber(min)} and x = ${formatNumber(max)}.`,
    );
  }
  return active;
}

function messageOf(error: unknown): string {
  return error instanceof ExpressionError ? error.userMessage : "We couldn't read that function.";
}

/** Write outer(inner(x)) as one expression in x, for display only. */
function substitute(outer: string, inner: string): string {
  return outer
    .replace(/\(\s*u\s*\)/g, `(${inner})`)
    .replace(/(?<![A-Za-z])u(?![A-Za-z])/g, `(${inner})`);
}

/** A defined x near the requested one (ln x is undefined for x ≤ 0, for example). */
function definedPoint(f: RealFunction, wanted: number, domain: [number, number]): number {
  const start = snap(wanted, domain);
  if (Number.isFinite(evaluate(f, start))) return start;
  for (const candidate of [1, 2, 0.5, 0, -1, (domain[0] + domain[1]) / 2]) {
    const x = snap(candidate, domain);
    if (Number.isFinite(evaluate(f, x))) return x;
  }
  return sampleCurve(f, domain[0], domain[1], 161)[0]?.x ?? start;
}

interface InitialState {
  active: ActiveFunction;
  x0: number;
  showDerivative: boolean;
  notice: string | null;
}

function initialise(params: SimParams | undefined): InitialState {
  const wantedX = numberParam(params, "x", DEFAULT_X, -49, 49);
  const showDerivative = numberParam(params, "showDerivative", 1) !== 0;
  const outer = stringParam(params, "outer");
  const inner = stringParam(params, "inner");
  const expr = stringParam(params, "expr");
  // Optional half-width of the x-window for authored (non-preset) functions, e.g. span: 1.5 → [-1.5, 1.5].
  const span = numberParam(params, "span", 0, 0, 50);
  const windowFor = (x: number): [number, number] => (span > 0 ? [-span, span] : customDomain(x));

  const candidates: FunctionSpec[] = [];
  if (outer && inner) {
    const preset = PRESETS.find(
      (p) =>
        p.chain &&
        squash(p.chain.outer) === squash(outer) &&
        squash(p.chain.inner) === squash(inner),
    );
    const composed = substitute(outer, inner);
    candidates.push(
      preset ?? {
        id: null,
        label: composed,
        expr: composed,
        chain: { outer, inner },
        domain: windowFor(wantedX),
      },
    );
  }
  if (expr) {
    const preset = PRESETS.find((p) => squash(p.expr) === squash(expr));
    candidates.push(preset ?? { id: null, label: expr, expr, domain: windowFor(wantedX) });
  }

  for (const spec of candidates) {
    try {
      const active = activate(spec);
      return {
        active,
        x0: definedPoint(active.f, wantedX, active.domain),
        showDerivative,
        notice: null,
      };
    } catch {
      // Try the next candidate, then the default.
    }
  }
  const active = activate(PRESETS[0]);
  return {
    active,
    x0: snap(wantedX, active.domain),
    showDerivative,
    notice:
      candidates.length > 0
        ? "The function set for this activity couldn't be graphed, so x^2 is shown instead."
        : null,
  };
}

/* ── Formatting ───────────────────────────────────────────────────────────── */

const fmt = (value: number, decimals = 3) => formatNumber(value, decimals);

function lineEquation(slope: number, intercept: number): string {
  if (!Number.isFinite(slope) || !Number.isFinite(intercept)) return "undefined";
  const m = Number(slope.toFixed(3));
  const b = Number(intercept.toFixed(3));
  if (m === 0) return `y = ${fmt(b)}`;
  const mx = m === 1 ? "x" : m === -1 ? "−x" : `${fmt(m)}x`;
  if (b === 0) return `y = ${mx}`;
  return `y = ${mx} ${b < 0 ? "−" : "+"} ${fmt(Math.abs(b))}`;
}

/* ── Component ────────────────────────────────────────────────────────────── */

export default function DerivativeExplorer({
  params,
  compact = false,
  onInteract,
}: SimulationProps) {
  const [initial] = useState(() => initialise(params));
  const [active, setActive] = useState<ActiveFunction>(initial.active);
  const [x0, setX0] = useState(initial.x0);
  const [showDerivative, setShowDerivative] = useState(initial.showDerivative);
  const [showSecant, setShowSecant] = useState(false);
  const [h, setH] = useState(1);
  const [draft, setDraft] = useState(
    initial.active.id === null && !initial.active.chain ? initial.active.expr : "",
  );
  const [error, setError] = useState<string | null>(initial.notice);
  const fieldId = useId();

  const { f, domain } = active;
  const [xMin, xMax] = domain;

  const yDomain = useMemo(
    () => autoRange(sampleCurve(f, xMin, xMax, 401).map((p) => p.y)),
    [f, xMin, xMax],
  );
  const fPrime = useMemo<RealFunction>(() => (x) => numericDerivative(f, x), [f]);
  const slopeDomain = useMemo<[number, number]>(
    () =>
      showDerivative ? autoRange(sampleCurve(fPrime, xMin, xMax, 241).map((p) => p.y)) : [-1, 1],
    [fPrime, xMin, xMax, showDerivative],
  );

  // Everything below is recomputed from the model for the current point.
  const y0 = evaluate(f, x0);
  const defined = Number.isFinite(y0);
  const tangent = tangentLine(f, x0);
  const differentiable = defined && isDifferentiableAt(f, x0);
  const slope = differentiable ? tangent.slope : Number.NaN;
  const secantActive = showSecant && !compact;
  const quotient = secantActive ? differenceQuotient(f, x0, h) : Number.NaN;
  const secant = secantActive ? secantLine(f, x0, h) : null;
  const secantDrawn =
    secant !== null && Number.isFinite(quotient) && Number.isFinite(secant.intercept);
  const chain =
    active.outer && active.inner ? chainRuleBreakdown(active.outer, active.inner, x0) : null;

  const selectFunction = (spec: FunctionSpec): boolean => {
    try {
      const next = activate(spec);
      setActive(next);
      setX0(definedPoint(next.f, x0, next.domain));
      setError(null);
      onInteract?.();
      return true;
    } catch (caught) {
      // Keep the last valid function on screen and say so.
      setError(`${messageOf(caught)} Still showing f(x) = ${active.label}.`);
      return false;
    }
  };

  const submitCustom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) {
      setError("Type a function of x first, for example x^2 - 1.");
      return;
    }
    selectFunction({ id: null, label: text, expr: text, domain: customDomain(0) });
  };

  const moveTo = (next: number) => {
    if (next !== x0) {
      setX0(next);
      onInteract?.();
    }
  };

  const handlePointer = (position: { x: number }, phase: PointerPhase) => {
    if (phase === "end") return;
    const next = snap(position.x, domain);
    if (next === x0 && phase === "start") onInteract?.();
    moveTo(next);
  };

  /*
   * Label placement. The coordinates go on the side of the point facing the
   * middle of the window (where there is room); "tangent" sits on the line on
   * the other side, pulled in so it stays inside the window.
   */
  const towardCentre = x0 < (xMin + xMax) / 2 ? 1 : -1;
  const span = xMax - xMin;
  const tangentLabel = (() => {
    if (!differentiable || y0 < yDomain[0] || y0 > yDomain[1]) return null;
    const direction = -towardCentre;
    const room = slope * direction > 0 ? yDomain[1] - y0 : y0 - yDomain[0];
    let dx = 0.22 * span;
    if (slope !== 0) dx = Math.min(dx, (0.8 * room) / Math.abs(slope));
    const x = clamp(x0 + direction * dx, xMin + 0.08 * span, xMax - 0.08 * span);
    return { x, y: slope * x + tangent.intercept };
  })();
  const pointLabelDy = differentiable && slope * towardCentre > 0 ? 18 : -10;
  const pointLabelAnchor = towardCentre > 0 ? "start" : "end";

  const xText = fmt(x0, 2);
  const trend = !differentiable
    ? ""
    : Math.abs(slope) < 1e-6
      ? "has a horizontal tangent"
      : slope > 0
        ? "is increasing"
        : "is decreasing";

  let summary: string;
  if (!defined) {
    summary = `f(x) = ${active.label} is undefined at x = ${xText}, so there is no point or tangent line here.`;
  } else if (!differentiable) {
    summary = `At x = ${xText}, f(x) = ${fmt(y0)}. The slope is undefined here: the graph has a corner, a vertical tangent or a break.`;
  } else {
    summary = `At x = ${xText}, f(x) = ${fmt(y0)}. The tangent line has slope f′(${xText}) = ${fmt(slope)}, so f ${trend} here.`;
    if (secantActive && Number.isFinite(quotient)) {
      const gap = quotient - slope;
      summary += ` With h = ${fmt(h, 2)} the secant slope is ${fmt(quotient)}, which is ${fmt(Math.abs(gap))} ${gap >= 0 ? "above" : "below"} the tangent slope.`;
    }
  }

  const graphLabel = spoken(
    `Graph of f(x) = ${active.label} for x from ${fmt(xMin)} to ${fmt(xMax)}. ` +
      (defined
        ? `The point is at x = ${xText}, y = ${fmt(y0)}. ` +
          (differentiable
            ? `The tangent line there has slope ${fmt(slope)}.`
            : "The slope is undefined there.")
        : `The function is undefined at x = ${xText}.`),
  );
  const slopeGraphLabel = spoken(
    `Graph of the derivative f′(x) for x from ${fmt(xMin)} to ${fmt(xMax)}. ` +
      (differentiable
        ? `At x = ${xText}, f′(x) = ${fmt(slope)}.`
        : `f′(x) is undefined at x = ${xText}.`),
  );

  const chainMatches =
    chain !== null &&
    differentiable &&
    Number.isFinite(chain.product) &&
    Math.abs(chain.product - slope) <= 1e-4 * Math.max(1, Math.abs(slope));

  return (
    <SimFrame
      title="Derivative Explorer"
      description="Move the point along the curve. The slope of the tangent line at the point is the derivative there."
      compact={compact}
    >
      {/* Function choice */}
      <div className={compact ? "mb-2" : "mb-4"}>
        {compact ? (
          <label className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink-2">
            Function
            <select
              className="min-h-10 min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-2 font-mono text-sm text-ink"
              value={active.id ?? "custom"}
              onChange={(event) => {
                const preset = PRESETS.find((p) => p.id === event.target.value);
                if (preset) selectFunction(preset);
              }}
            >
              {active.id === null ? <option value="custom">f(x) = {active.label}</option> : null}
              {PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id ?? ""}>
                  f(x) = {preset.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="grid gap-3 @3xl:grid-cols-[minmax(0,1fr)_18rem] @3xl:gap-5">
            <fieldset className="min-w-0">
              <legend className="mb-1.5 text-sm font-medium text-ink-2">Choose a function</legend>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={active.id === preset.id}
                    className={buttonClass("chip", active.id === preset.id)}
                    onClick={() => selectFunction(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <form onSubmit={submitCustom} className="min-w-0" noValidate>
              <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-ink-2">
                Or type your own f(x)
              </label>
              <div className="flex gap-2">
                <input
                  id={fieldId}
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="x^2 - 1"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  aria-invalid={error !== null}
                  aria-describedby={error ? `${fieldId}-error` : `${fieldId}-help`}
                  className="min-h-10 min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-3 font-mono text-sm text-ink placeholder:text-faint"
                />
                <button type="submit" className={buttonClass("secondary")}>
                  Graph
                </button>
              </div>
              <p id={`${fieldId}-help`} className="mt-1 text-xs text-muted">
                Use x, ^ for powers, and sin, cos, tan, sqrt, exp, ln, abs.
              </p>
            </form>
          </div>
        )}
        {error ? (
          <p id={`${fieldId}-error`} role="alert" className="mt-2 text-sm font-medium text-bad">
            {error}
          </p>
        ) : null}
      </div>

      <div
        className={clsx(
          "grid gap-4",
          !compact && "@3xl:grid-cols-[minmax(0,1fr)_18rem] @3xl:gap-5",
        )}
      >
        {/* Graphs */}
        <div className="min-w-0">
          <p className="mb-1 font-mono text-sm text-ink">f(x) = {active.label}</p>
          <Plot
            xDomain={domain}
            yDomain={yDomain}
            height={compact ? 210 : 300}
            ariaLabel={graphLabel}
            xLabel="x"
            yLabel="y"
            onPointer={handlePointer}
          >
            <Curve
              f={f}
              className="stroke-chart-1"
              strokeWidth={2.5}
              label="f"
              labelX={xMax}
              labelAnchor="end"
              labelDx={-8}
              labelDy={16}
              labelClassName="fill-chart-1"
            />
            {secantDrawn && secant ? (
              <>
                <StraightLine
                  slope={secant.slope}
                  intercept={secant.intercept}
                  className="stroke-chart-4"
                  dash="2 5"
                  strokeWidth={2.25}
                />
                <Dot
                  x={x0 + h}
                  y={evaluate(f, x0 + h)}
                  r={4.5}
                  className="fill-surface stroke-chart-4"
                />
                <PlotLabel
                  x={x0 + h}
                  y={evaluate(f, x0 + h)}
                  text="secant"
                  dx={9}
                  dy={16}
                  anchor="auto"
                  className="fill-chart-4"
                />
              </>
            ) : null}
            {differentiable ? (
              <StraightLine
                slope={slope}
                intercept={tangent.intercept}
                className="stroke-chart-2"
                dash="8 4"
                strokeWidth={2}
              />
            ) : null}
            {tangentLabel ? (
              <PlotLabel
                x={tangentLabel.x}
                y={tangentLabel.y}
                text="tangent"
                dy={-8}
                anchor="middle"
                className="fill-chart-2"
              />
            ) : null}
            <VLine x={x0} className="stroke-faint" dash="3 3" strokeWidth={1} />
            {defined ? (
              <>
                <Dot x={x0} y={y0} r={6} className="fill-chart-1 stroke-surface" />
                <PlotLabel
                  x={x0}
                  y={y0}
                  text={`(${xText}, ${fmt(y0, 2)})`}
                  dx={10 * towardCentre}
                  dy={pointLabelDy}
                  anchor={pointLabelAnchor}
                  className="fill-ink"
                />
              </>
            ) : null}
          </Plot>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            <LegendItem label="f(x)" className="stroke-chart-1" strokeWidth={2.5} />
            <LegendItem label="tangent line" className="stroke-chart-2" dash="8 4" />
            {secantActive ? (
              <LegendItem label="secant line" className="stroke-chart-4" dash="2 5" />
            ) : null}
          </div>

          <div className="mt-2">
            <SliderField
              label="x-coordinate of the point"
              value={x0}
              min={xMin}
              max={xMax}
              step={X_STEP}
              onChange={(value) => moveTo(snap(value, domain))}
              display={`x = ${xText}`}
              valueText={
                spoken(`x = ${xText}`) +
                (differentiable ? spoken(`, slope ${fmt(slope)}`) : ", slope undefined")
              }
              hint={
                compact
                  ? undefined
                  : "Drag on either graph, or use this slider (arrow keys work too)."
              }
            />
          </div>

          {showDerivative ? (
            <div className="mt-3">
              <p className="mb-1 text-sm text-ink-2">
                <span className="font-mono text-ink">f&prime;(x)</span> &mdash; the slope of f at
                every x
              </p>
              <Plot
                xDomain={domain}
                yDomain={slopeDomain}
                height={compact ? 150 : 210}
                ariaLabel={slopeGraphLabel}
                xLabel="x"
                yLabel="slope"
                onPointer={handlePointer}
              >
                <Curve
                  f={fPrime}
                  className="stroke-chart-3"
                  dash="10 3 2 3"
                  label={"f′"}
                  labelX={xMax}
                  labelAnchor="end"
                  labelDx={-8}
                  labelDy={16}
                  labelClassName="fill-chart-3"
                />
                <VLine x={x0} className="stroke-faint" dash="3 3" strokeWidth={1} />
                {differentiable ? (
                  <>
                    <Dot x={x0} y={slope} r={6} className="fill-chart-2 stroke-surface" />
                    <PlotLabel
                      x={x0}
                      y={slope}
                      text={`f′(${xText}) = ${fmt(slope, 2)}`}
                      dx={10 * towardCentre}
                      dy={-10}
                      anchor={pointLabelAnchor}
                      className="fill-ink"
                    />
                  </>
                ) : null}
              </Plot>
            </div>
          ) : null}
        </div>

        {/* Readouts and options */}
        <div className="min-w-0 space-y-3">
          <dl
            className={clsx("grid gap-2", compact ? "grid-cols-3" : "grid-cols-2 @3xl:grid-cols-1")}
          >
            <Stat label="Point" value={defined ? `(${xText}, ${fmt(y0)})` : "undefined"} />
            <Stat
              label={<>Slope f&prime;({xText})</>}
              value={differentiable ? fmt(slope) : "undefined"}
              tone={differentiable ? "neutral" : "warn"}
            />
            <Stat
              label="Tangent line"
              value={differentiable ? lineEquation(slope, tangent.intercept) : "none"}
              className={compact ? undefined : "col-span-2 @3xl:col-span-1"}
            />
          </dl>

          <div className={clsx("flex flex-wrap gap-x-5", !compact && "@3xl:flex-col")}>
            <ToggleField
              label={"Show the graph of f′(x)"}
              checked={showDerivative}
              onChange={(checked) => {
                setShowDerivative(checked);
                onInteract?.();
              }}
            />
            {!compact ? (
              <ToggleField
                label="Show a secant line"
                checked={showSecant}
                onChange={(checked) => {
                  setShowSecant(checked);
                  onInteract?.();
                }}
              />
            ) : null}
          </div>

          {secantActive ? (
            <div className="rounded-lg border border-line bg-surface-2 p-3">
              <SliderField
                label="Step h"
                value={h}
                min={0.01}
                max={2}
                step={0.01}
                onChange={(value) => {
                  setH(value);
                  onInteract?.();
                }}
                display={`h = ${fmt(h, 2)}`}
                valueText={
                  `h = ${fmt(h, 2)}` +
                  (Number.isFinite(quotient) ? spoken(`, secant slope ${fmt(quotient)}`) : "")
                }
              />
              <p className="font-mono text-xs leading-relaxed text-ink-2">
                [f({fmt(x0 + h, 2)}) &minus; f({xText})] / {fmt(h, 2)}
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-2">
                <Stat
                  label="Secant slope"
                  value={Number.isFinite(quotient) ? fmt(quotient, 4) : "undefined"}
                />
                <Stat
                  label="Secant − tangent"
                  value={
                    Number.isFinite(quotient) && differentiable
                      ? fmt(quotient - slope, 4)
                      : "undefined"
                  }
                />
              </dl>
              <p className="mt-2 text-xs text-muted">
                Shrink h toward 0: the secant slope approaches the tangent slope.
              </p>
            </div>
          ) : null}

          {chain && active.chain ? (
            <section
              aria-label="Chain rule breakdown"
              className="rounded-lg border border-line bg-surface-2 p-3"
            >
              <h4 className="text-sm font-semibold text-ink">Chain rule</h4>
              <p className="mt-1 font-mono text-sm text-ink-2">
                y = {active.chain.outer}, &nbsp;u = {active.chain.inner}
              </p>
              <table className="mt-2 w-full text-sm">
                <caption className="sr-only">Chain rule pieces at x = {xText}</caption>
                <tbody>
                  <ChainRow name="Inside value" symbol={`u at x = ${xText}`} value={chain.u} />
                  <ChainRow name="Inside slope" symbol="du/dx" value={chain.innerSlope} />
                  <ChainRow
                    name="Outside slope"
                    symbol={`dy/du at u = ${fmt(chain.u, 4)}`}
                    value={chain.outerSlope}
                  />
                  <ChainRow name="Product" symbol="dy/du · du/dx" value={chain.product} strong />
                  <ChainRow name="Tangent slope" symbol="measured on f" value={slope} strong />
                </tbody>
              </table>
              <p className="mt-2 text-xs leading-relaxed text-ink-2">
                {chainMatches
                  ? `Match: ${fmt(chain.outerSlope, 4)} × ${fmt(chain.innerSlope, 4)} = ${fmt(chain.product, 4)}, the same as the tangent slope.`
                  : "One of these slopes is undefined at this point, so the product can't be compared here."}
              </p>
            </section>
          ) : null}

          <LiveSummary text={summary} />
        </div>
      </div>
    </SimFrame>
  );
}

function ChainRow({
  name,
  symbol,
  value,
  strong = false,
}: {
  name: string;
  symbol: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <tr className="border-t border-line first:border-t-0">
      <th scope="row" className="py-1.5 pr-2 text-left font-normal text-ink-2">
        {name}
        <span className="block font-mono text-xs text-muted">{symbol}</span>
      </th>
      <td
        className={clsx(
          "py-1.5 text-right font-mono tabular-nums text-ink",
          strong && "font-semibold",
        )}
      >
        {Number.isFinite(value) ? formatNumber(value, 4) : "undefined"}
      </td>
    </tr>
  );
}
