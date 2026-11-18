"use client";

import clsx from "clsx";
import { Pause, Play, RotateCcw, StepBack, StepForward } from "lucide-react";
import {
  useEffect,
  useMemo,
  useReducer,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_MOTION,
  areaUnderVelocity,
  distanceTravelled,
  position,
  positionRange,
  stateAt,
  turnaroundTime,
  velocity,
  velocityRange,
  type MotionParams,
} from "@/modules/simulations/kinematics";
import {
  Area,
  Curve,
  Dot,
  LiveSummary,
  Plot,
  PlotLabel,
  SimFrame,
  SliderField,
  Stat,
  VLine,
  buttonClass,
  clamp,
  createScale,
  formatFixed,
  formatNumber,
  niceTicks,
  numberParam,
  padRange,
  spoken,
  useMeasuredWidth,
} from "./Plot";
import type { SimParams, SimulationProps } from "./types";

/* ── State ────────────────────────────────────────────────────────────────── */

interface LabState extends MotionParams {
  /** Seconds since the start of the run. */
  time: number;
  playing: boolean;
  duration: number;
}

type LabAction =
  | { type: "tick"; dt: number }
  | { type: "play" }
  | { type: "pause" }
  | { type: "reset" }
  | { type: "scrub"; time: number }
  | { type: "set"; key: keyof MotionParams; value: number };

function reducer(state: LabState, action: LabAction): LabState {
  switch (action.type) {
    case "tick": {
      if (!state.playing) return state;
      const time = state.time + action.dt;
      return time >= state.duration
        ? { ...state, time: state.duration, playing: false }
        : { ...state, time };
    }
    case "play":
      return { ...state, playing: true, time: state.time >= state.duration ? 0 : state.time };
    case "pause":
      return state.playing ? { ...state, playing: false } : state;
    case "reset":
      return { ...state, time: 0, playing: false };
    case "scrub":
      return { ...state, time: clamp(action.time, 0, state.duration), playing: false };
    case "set":
      return { ...state, [action.key]: action.value };
  }
}

function initialise(params: SimParams | undefined): LabState {
  return {
    x0: numberParam(params, "x0", DEFAULT_MOTION.x0, -20, 20),
    v0: numberParam(params, "v0", DEFAULT_MOTION.v0, -10, 10),
    a: numberParam(params, "a", DEFAULT_MOTION.a, -5, 5),
    duration: numberParam(params, "duration", 8, 2, 20),
    time: 0,
    playing: false,
  };
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/* ── Formatting ───────────────────────────────────────────────────────────── */

const fixed = (value: number) => formatFixed(value, 2);
const trimmed = (value: number) => formatNumber(value, 2);
/** Negative numbers get parentheses when substituted into an equation. */
const sub = (text: string) => (text.startsWith("−") ? `(${text})` : text);

/** "moving in the positive direction at 4 m/s and slowing down" */
function describeMotion(v: number, a: number): string {
  if (Math.abs(v) < 0.005) return a === 0 ? "at rest" : "momentarily at rest";
  const direction = v > 0 ? "moving in the positive direction" : "moving in the negative direction";
  const speed = trimmed(Math.abs(v));
  if (a === 0) return `${direction} at a constant ${speed} m/s`;
  return `${direction} at ${speed} m/s and ${v * a > 0 ? "speeding up" : "slowing down"}`;
}

/* ── Track ────────────────────────────────────────────────────────────────── */

interface TrackProps {
  x: number;
  v: number;
  x0: number;
  /** Position of the turnaround, when it happens during the run. */
  turnX: number | null;
  domain: [number, number];
  /** Velocity that maps to the longest arrow. */
  vRef: number;
  height: number;
  ariaLabel: string;
}

function Track({ x, v, x0, turnX, domain, vRef, height, ariaLabel }: TrackProps) {
  const [containerRef, width] = useMeasuredWidth<HTMLDivElement>();
  if (width === null) return <div ref={containerRef} className="w-full" style={{ height }} />;

  const scale = createScale(
    width,
    height,
    { top: 0, right: 24, bottom: 0, left: 24 },
    domain,
    [0, 1],
  );
  const ticks = niceTicks(scale.xMin, scale.xMax, Math.max(3, Math.round(scale.innerWidth / 72)));
  const lineY = height - 42;
  const radius = 10;
  const objectX = scale.sx(x);
  const objectY = lineY - radius - 1;
  const arrowY = objectY - radius - 12;
  const moving = Math.abs(v) >= 0.005;
  const arrowLength = moving
    ? Math.max(10, clamp(Math.abs(v) / vRef, 0, 1) * Math.min(110, scale.innerWidth * 0.32))
    : 0;
  const tipX = clamp(objectX + Math.sign(v) * arrowLength, 5, width - 5);
  const head = 7 * Math.sign(v);
  const startX = scale.sx(x0);
  const turnPx = turnX === null ? null : scale.sx(turnX);
  const turnRight = turnPx !== null && turnPx >= startX;
  const labelY = height - 5;

  return (
    <div ref={containerRef} className="w-full" style={{ height }}>
      <svg
        role="img"
        aria-label={ariaLabel}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block select-none"
      >
        <g aria-hidden="true">
          <line
            x1={scale.margin.left - 10}
            x2={width - scale.margin.right + 10}
            y1={lineY}
            y2={lineY}
            className="stroke-line-strong"
            strokeWidth={2}
            strokeLinecap="round"
          />
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={scale.sx(tick)}
                x2={scale.sx(tick)}
                y1={lineY}
                y2={lineY + 6}
                className="stroke-faint"
                strokeWidth={1}
              />
              <text
                x={scale.sx(tick)}
                y={lineY + 19}
                textAnchor="middle"
                className="fill-muted text-[11px] tabular-nums"
              >
                {formatNumber(tick, 2)}
              </text>
            </g>
          ))}

          {/* Where the run starts, and where the object turns around */}
          <line
            x1={startX}
            x2={startX}
            y1={lineY - 7}
            y2={lineY + 7}
            className="stroke-ink-2"
            strokeWidth={2}
          />
          <text
            x={turnRight ? Math.max(startX, 34) : Math.min(startX, width - 34)}
            y={labelY}
            textAnchor={turnRight ? "end" : "start"}
            className="fill-ink-2 text-[11px] font-medium"
          >
            start
          </text>
          {turnPx !== null ? (
            <>
              <line
                x1={turnPx}
                x2={turnPx}
                y1={lineY - 7}
                y2={lineY + 7}
                className="stroke-chart-2"
                strokeWidth={2}
                strokeDasharray="2 2"
              />
              <text
                x={turnRight ? Math.min(turnPx, width - 64) : Math.max(turnPx, 64)}
                y={labelY}
                textAnchor={turnRight ? "start" : "end"}
                className="fill-ink-2 text-[11px] font-medium"
              >
                turnaround
              </text>
            </>
          ) : null}

          {/* Velocity arrow: length and direction follow v(t) */}
          {moving ? (
            <>
              <line
                x1={objectX}
                x2={tipX - head * 0.6}
                y1={arrowY}
                y2={arrowY}
                className="stroke-chart-2"
                strokeWidth={3}
                strokeLinecap="round"
              />
              <polygon
                points={`${tipX},${arrowY} ${tipX - head},${arrowY - 5} ${tipX - head},${arrowY + 5}`}
                className="fill-chart-2"
              />
            </>
          ) : (
            <circle cx={objectX} cy={arrowY} r={3} className="fill-chart-2" />
          )}
          <text
            x={clamp(objectX, 52, width - 52)}
            y={arrowY - 9}
            textAnchor="middle"
            className="fill-ink text-[12px] font-semibold tabular-nums"
          >
            v = {fixed(v)} m/s
          </text>

          <circle
            cx={objectX}
            cy={objectY}
            r={radius}
            className="fill-chart-1 stroke-surface"
            strokeWidth={2}
          />
        </g>
      </svg>
    </div>
  );
}

/* ── Component ────────────────────────────────────────────────────────────── */

export default function MotionLab({ params, compact = false, onInteract }: SimulationProps) {
  const [state, dispatch] = useReducer(reducer, params, initialise);
  const [showEquations, setShowEquations] = useState(!compact);
  const reducedMotion = usePrefersReducedMotion();
  const { x0, v0, a, duration } = state;
  const running = state.playing && !reducedMotion;

  // Real elapsed time drives the clock; the model decides where the object is.
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last: number | null = null;
    const step = (now: number) => {
      if (last !== null) dispatch({ type: "tick", dt: clamp((now - last) / 1000, 0, 0.1) });
      last = now;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    const onVisibility = () => {
      if (document.hidden) dispatch({ type: "pause" });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [running]);

  const motion = useMemo<MotionParams>(() => ({ x0, v0, a }), [x0, v0, a]);
  const xOf = useMemo(() => (s: number) => position(s, motion), [motion]);
  const vOf = useMemo(() => (s: number) => velocity(s, motion), [motion]);

  // The clock is read to the hundredth of a second, so the substituted
  // equations below reproduce the readouts exactly.
  const t = Math.round(state.time * 100) / 100;
  const now = stateAt(t, motion);
  const area = areaUnderVelocity(t, motion);

  const [xLow, xHigh] = positionRange(duration, motion);
  const [vLow, vHigh] = velocityRange(duration, motion);
  const trackDomain = padRange(xLow, xHigh, 0.06, 4);
  const xDomain = padRange(xLow, xHigh, 0.12, 2);
  const vDomain = padRange(Math.min(vLow, 0), Math.max(vHigh, 0), 0.12, 2);
  const vRef = Math.max(Math.abs(vLow), Math.abs(vHigh), 1);

  const turn = turnaroundTime(motion);
  const turnInRun = turn !== null && turn < duration ? turn : null;
  const turned = turn !== null && t > turn;
  const outbound = turned && turn !== null ? distanceTravelled(turn, motion) : 0;
  const returning = turned ? now.distance - outbound : 0;

  const act = (action: LabAction) => {
    dispatch(action);
    onInteract?.();
  };

  // Spoken summaries move in 2-second steps while running, not every frame.
  const liveT = running ? Math.floor(t / 2) * 2 : t;
  const live = stateAt(liveT, motion);
  const summary =
    `${running ? "Running. " : ""}At t = ${trimmed(liveT)} s the object is at x = ${trimmed(live.x)} m, ${describeMotion(live.v, a)}. ` +
    `Displacement ${trimmed(live.displacement)} m, distance travelled ${trimmed(live.distance)} m.`;

  const trackLabel = spoken(
    `Track with a position scale from ${trimmed(trackDomain[0])} to ${trimmed(trackDomain[1])} metres. At t = ${trimmed(liveT)} seconds the object is at ${trimmed(live.x)} metres, ${describeMotion(live.v, a)}. Velocity ${trimmed(live.v)} metres per second.`,
  );
  const positionGraphLabel = spoken(
    `Position versus time from 0 to ${trimmed(duration)} seconds, starting at ${trimmed(x0)} metres` +
      (turnInRun !== null
        ? `, turning around at t = ${trimmed(turnInRun)} seconds at ${trimmed(position(turnInRun, motion))} metres`
        : "") +
      `. At t = ${trimmed(liveT)} seconds the position is ${trimmed(live.x)} metres.`,
  );
  const velocityGraphLabel = spoken(
    `Velocity versus time: a straight line from ${trimmed(v0)} metres per second with slope ${trimmed(a)} metres per second squared. ` +
      `At t = ${trimmed(liveT)} seconds the velocity is ${trimmed(live.v)} metres per second, and the shaded area so far is ${trimmed(areaUnderVelocity(liveT, motion))} metres.`,
  );

  const atEnd = state.time >= duration;
  const runLabel = running ? "Pause" : atEnd ? "Run again" : state.time > 0 ? "Resume" : "Run";

  const T = fixed(t);
  const X0 = trimmed(x0);
  const V0 = trimmed(v0);
  const A = trimmed(a);

  const equations = (
    <div
      className="overflow-x-auto"
      tabIndex={0}
      role="group"
      aria-label="Equations table (scrolls sideways on narrow screens)"
    >
      <table className="w-full min-w-[30rem] whitespace-nowrap text-left text-sm">
        <caption className="sr-only">
          The kinematic equations with the current values substituted, at t = {T} seconds
        </caption>
        <thead>
          <tr className="text-xs text-muted">
            <th scope="col" className="py-1.5 pr-3 font-medium">
              Equation
            </th>
            <th scope="col" className="py-1.5 pr-3 font-medium">
              With the current numbers
            </th>
            <th scope="col" className="py-1.5 text-right font-medium">
              Result
            </th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums text-ink-2">
          <EquationRow
            equation={<>x = x&#8320; + v&#8320;t + &frac12;at&sup2;</>}
            working={`${X0} + (${V0})(${T}) + ½(${A})(${T})²`}
            result={`${fixed(now.x)} m`}
          />
          <EquationRow
            equation={<>v = v&#8320; + at</>}
            working={`${V0} + (${A})(${T})`}
            result={`${fixed(now.v)} m/s`}
          />
          <EquationRow
            equation={<>&Delta;x = x &minus; x&#8320;</>}
            working={`${fixed(now.x)} − ${sub(X0)}`}
            result={`${fixed(now.displacement)} m`}
          />
          <EquationRow
            equation={<>area under v&ndash;t = &frac12;(v&#8320; + v)t</>}
            working={`½(${V0} + ${sub(fixed(now.v))})(${T})`}
            result={`${fixed(area)} m`}
          />
          <EquationRow
            equation={
              turned ? <>distance = |&Delta;x out| + |&Delta;x back|</> : <>distance = |&Delta;x|</>
            }
            working={
              turned && turn !== null
                ? `${fixed(outbound)} + ${fixed(returning)}  (turned at t = ${fixed(turn)} s)`
                : `|${fixed(now.displacement)}|`
            }
            result={`${fixed(now.distance)} m`}
          />
        </tbody>
      </table>
    </div>
  );

  return (
    <SimFrame
      title="Motion Lab"
      description="An object moving along a straight line with constant acceleration. Set the starting conditions, then run the clock."
      compact={compact}
    >
      <div className={compact ? "space-y-3" : "space-y-4"}>
        {/* Track */}
        <div className="rounded-lg border border-line bg-surface-2 px-1 pt-1">
          <Track
            x={now.x}
            v={now.v}
            x0={x0}
            turnX={turnInRun !== null ? position(turnInRun, motion) : null}
            domain={trackDomain}
            vRef={vRef}
            height={compact ? 100 : 112}
            ariaLabel={trackLabel}
          />
          <p className="px-2 pb-1.5 text-right text-xs text-muted">Position along the track (m)</p>
        </div>

        {/* Clock */}
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
          <div className="flex gap-2">
            {reducedMotion ? (
              <>
                <button
                  type="button"
                  className={buttonClass("secondary")}
                  onClick={() => act({ type: "scrub", time: state.time - 0.5 })}
                  disabled={state.time <= 0}
                >
                  <StepBack aria-hidden="true" className="size-4" />
                  Back 0.5 s
                </button>
                <button
                  type="button"
                  className={buttonClass("primary")}
                  onClick={() => act({ type: "scrub", time: state.time + 0.5 })}
                  disabled={atEnd}
                >
                  <StepForward aria-hidden="true" className="size-4" />
                  Forward 0.5 s
                </button>
              </>
            ) : (
              <button
                type="button"
                className={clsx(buttonClass("primary"), "min-w-30")}
                onClick={() => act({ type: running ? "pause" : "play" })}
              >
                {running ? (
                  <Pause aria-hidden="true" className="size-4" />
                ) : (
                  <Play aria-hidden="true" className="size-4" />
                )}
                {runLabel}
              </button>
            )}
            <button
              type="button"
              className={buttonClass("secondary")}
              onClick={() => act({ type: "reset" })}
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Reset
            </button>
          </div>
          <div className="min-w-48 flex-1">
            <SliderField
              label="Time t"
              value={Math.round(state.time * 10) / 10}
              min={0}
              max={duration}
              step={0.1}
              onChange={(value) => act({ type: "scrub", time: value })}
              display={`${T} s`}
              valueText={spoken(
                `${trimmed(liveT)} seconds, position ${trimmed(live.x)} metres, velocity ${trimmed(live.v)} metres per second`,
              )}
            />
          </div>
        </div>
        {reducedMotion ? (
          <p className="text-xs text-muted">
            Animation is off because your device asks for reduced motion. Step through time with the
            buttons or the slider.
          </p>
        ) : null}

        {/* Readouts */}
        <dl
          className={clsx(
            "grid grid-cols-2 gap-2",
            compact ? "@md:grid-cols-5" : "@lg:grid-cols-5",
          )}
        >
          <Stat label="Time t" value={`${T} s`} />
          <Stat label="Position x" value={`${fixed(now.x)} m`} />
          <Stat label="Velocity v" value={`${fixed(now.v)} m/s`} />
          <Stat label={<>Displacement &Delta;x</>} value={`${fixed(now.displacement)} m`} />
          <Stat
            label="Distance travelled"
            value={`${fixed(now.distance)} m`}
            className={compact ? "col-span-2 @md:col-span-1" : "col-span-2 @lg:col-span-1"}
          />
        </dl>

        {/* Graphs */}
        <div
          className={clsx("grid gap-3", compact ? "@min-[30rem]:grid-cols-2" : "@lg:grid-cols-2")}
        >
          <div className="min-w-0">
            <Plot
              xDomain={[0, duration]}
              yDomain={xDomain}
              height={compact ? 170 : 220}
              ariaLabel={positionGraphLabel}
              xLabel="Time (s)"
              yLabel="Position x (m)"
            >
              <Curve f={xOf} className="stroke-chart-1" strokeWidth={2.5} />
              {turnInRun !== null ? (
                <Dot
                  x={turnInRun}
                  y={position(turnInRun, motion)}
                  r={4}
                  className="fill-surface stroke-chart-2"
                />
              ) : null}
              <VLine x={t} className="stroke-ink-2" dash="4 3" strokeWidth={1.25} />
              <Dot x={t} y={now.x} r={5.5} className="fill-chart-1 stroke-surface" />
              <PlotLabel
                x={t}
                y={now.x}
                text={`${fixed(now.x)} m`}
                dx={9}
                dy={-9}
                anchor="auto"
                className="fill-ink"
              />
            </Plot>
            <p className="mt-0.5 text-xs text-muted">
              The slope of this graph is the velocity
              {turnInRun !== null
                ? "; the open circle marks the turnaround, where the slope is zero."
                : "."}
            </p>
          </div>
          <div className="min-w-0">
            <Plot
              xDomain={[0, duration]}
              yDomain={vDomain}
              height={compact ? 170 : 220}
              ariaLabel={velocityGraphLabel}
              xLabel="Time (s)"
              yLabel="Velocity v (m/s)"
            >
              <Area f={vOf} from={0} to={t} className="fill-chart-3" fillOpacity={0.22} />
              <Curve f={vOf} className="stroke-chart-3" strokeWidth={2.5} dash="9 4" />
              <VLine x={t} className="stroke-ink-2" dash="4 3" strokeWidth={1.25} />
              <Dot x={t} y={now.v} r={5.5} className="fill-chart-3 stroke-surface" />
              <PlotLabel
                x={t}
                y={now.v}
                text={`${fixed(now.v)} m/s`}
                dx={9}
                dy={-9}
                anchor="auto"
                className="fill-ink"
              />
            </Plot>
            <p className="mt-0.5 text-xs text-muted">
              Shaded area (below the axis counts as negative) = displacement ={" "}
              <span className="font-mono tabular-nums text-ink-2">{fixed(area)} m</span>
            </p>
          </div>
        </div>

        {/* Starting conditions */}
        <fieldset className="min-w-0">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Starting conditions
          </legend>
          <div className="grid gap-x-5 gap-y-1 @xl:grid-cols-3">
            <SliderField
              label={<>Initial position x&#8320;</>}
              value={x0}
              min={-20}
              max={20}
              step={0.5}
              onChange={(value) => act({ type: "set", key: "x0", value })}
              display={`${X0} m`}
              valueText={spoken(`${X0} metres`)}
            />
            <SliderField
              label={<>Initial velocity v&#8320;</>}
              value={v0}
              min={-10}
              max={10}
              step={0.5}
              onChange={(value) => act({ type: "set", key: "v0", value })}
              display={`${V0} m/s`}
              valueText={spoken(`${V0} metres per second`)}
            />
            <SliderField
              label="Acceleration a"
              value={a}
              min={-5}
              max={5}
              step={0.25}
              onChange={(value) => act({ type: "set", key: "a", value })}
              display={`${A} m/s²`}
              valueText={spoken(`${A} metres per second squared`)}
            />
          </div>
        </fieldset>

        {/* Equations */}
        <section
          aria-label="Check with the equations"
          className="rounded-lg border border-line bg-surface-2 px-3 py-1"
        >
          <button
            type="button"
            aria-expanded={showEquations}
            className="flex min-h-10 w-full cursor-pointer items-center justify-between gap-3 text-left text-sm font-semibold text-ink"
            onClick={() => {
              setShowEquations((open) => !open);
              onInteract?.();
            }}
          >
            Check with the equations
            <span aria-hidden="true" className="font-normal text-muted">
              {showEquations ? "Hide" : "Show"}
            </span>
          </button>
          {showEquations ? <div className="pb-2">{equations}</div> : null}
        </section>

        <LiveSummary text={summary} />
      </div>
    </SimFrame>
  );
}

function EquationRow({
  equation,
  working,
  result,
}: {
  equation: ReactNode;
  working: string;
  result: string;
}) {
  return (
    <tr className="border-t border-line">
      <th scope="row" className="py-1.5 pr-3 font-normal text-ink">
        {equation}
      </th>
      <td className="py-1.5 pr-3">= {working}</td>
      <td className="py-1.5 text-right font-semibold text-ink">{result}</td>
    </tr>
  );
}
