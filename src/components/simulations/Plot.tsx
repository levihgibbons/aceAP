"use client";

/**
 * Shared building blocks for the native simulations.
 *
 *  1. SVG plotting primitives — <Plot> (responsive frame, linear scales,
 *     gridlines, ticks, axis titles) and the marks drawn inside it: <Curve>,
 *     <StraightLine>, <HLine>, <VLine>, <Segment>, <Dot>, <Region>, <Area>,
 *     <PlotLabel>. No chart library.
 *  2. Small helpers every simulation needs: number formatting, param parsing,
 *     a labelled slider, readout tiles and the polite live summary.
 *
 * Colours come only from the design tokens (Tailwind semantic classes or CSS
 * variables) so light and dark themes stay in step.
 */

import clsx from "clsx";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import type { SimParams } from "./types";

/* ── Numbers and params ───────────────────────────────────────────────────── */

const MINUS = "−";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Round to at most `maxDecimals` places and drop trailing zeros. */
export function formatNumber(value: number, maxDecimals = 2): string {
  if (!Number.isFinite(value)) return "undefined";
  const rounded = Number(value.toFixed(maxDecimals));
  const text = Math.abs(rounded).toString();
  return rounded < 0 ? MINUS + text : text;
}

/** Fixed number of decimals — for readouts that change while animating. */
export function formatFixed(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "undefined";
  const text = Math.abs(value).toFixed(decimals);
  return value < 0 && Number(text) !== 0 ? MINUS + text : text;
}

export function formatMoney(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "—";
  const text = Math.abs(value).toFixed(decimals);
  return value < 0 && Number(text) !== 0 ? `${MINUS}$${text}` : `$${text}`;
}

/** Make formatted numbers read naturally in aria text. */
export function spoken(text: string): string {
  return text.replaceAll(MINUS, "negative ");
}

/** A numeric param, clamped; non-finite or missing values fall back. */
export function numberParam(
  params: SimParams | undefined,
  key: string,
  fallback: number,
  min = -Infinity,
  max = Infinity,
): number {
  const raw = params?.[key];
  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim() !== ""
        ? Number(raw)
        : Number.NaN;
  return Number.isFinite(value) ? clamp(value, min, max) : fallback;
}

/** A non-empty string param, or null. */
export function stringParam(params: SimParams | undefined, key: string): string | null {
  const raw = params?.[key];
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  if (typeof raw === "string" && raw.trim() !== "") return raw.trim();
  return null;
}

/* ── Hooks ────────────────────────────────────────────────────────────────── */

/** Width of an element in CSS pixels (null until first measured). */
export function useMeasuredWidth<T extends HTMLElement>(): [
  (element: T | null) => void | (() => void),
  number | null,
] {
  const [width, setWidth] = useState<number | null>(null);
  const ref = useCallback((element: T | null) => {
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0]?.contentRect.width ?? 0);
      if (next > 0) setWidth(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/** The value, once it has stopped changing for `delayMs`. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/* ── Scales and ticks ─────────────────────────────────────────────────────── */

export interface PlotMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PlotScale {
  width: number;
  height: number;
  margin: PlotMargin;
  innerWidth: number;
  innerHeight: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  /** data x → pixel x */
  sx(x: number): number;
  /** data y → pixel y */
  sy(y: number): number;
  /** pixel x → data x */
  invX(px: number): number;
  /** pixel y → data y */
  invY(py: number): number;
}

export function createScale(
  width: number,
  height: number,
  margin: PlotMargin,
  xDomain: readonly [number, number],
  yDomain: readonly [number, number],
): PlotScale {
  const innerWidth = Math.max(1, width - margin.left - margin.right);
  const innerHeight = Math.max(1, height - margin.top - margin.bottom);
  const xMin = Number.isFinite(xDomain[0]) ? xDomain[0] : 0;
  const xMax = Number.isFinite(xDomain[1]) && xDomain[1] > xMin ? xDomain[1] : xMin + 1;
  const yMin = Number.isFinite(yDomain[0]) ? yDomain[0] : 0;
  const yMax = Number.isFinite(yDomain[1]) && yDomain[1] > yMin ? yDomain[1] : yMin + 1;
  const kx = innerWidth / (xMax - xMin);
  const ky = innerHeight / (yMax - yMin);
  return {
    width,
    height,
    margin,
    innerWidth,
    innerHeight,
    xMin,
    xMax,
    yMin,
    yMax,
    sx: (x) => margin.left + (x - xMin) * kx,
    sy: (y) => margin.top + (yMax - y) * ky,
    invX: (px) => xMin + (px - margin.left) / kx,
    invY: (py) => yMax - (py - margin.top) / ky,
  };
}

/** Round tick positions (multiples of 1, 2 or 5 × 10ⁿ) covering [min, max]. */
export function niceTicks(min: number, max: number, target = 6): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [];
  const rough = (max - min) / Math.max(1, target);
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
  const ticks: number[] = [];
  const first = Math.ceil(min / step - 1e-9);
  const last = Math.floor(max / step + 1e-9);
  for (let i = first; i <= last && ticks.length < 200; i++)
    ticks.push(Number((i * step).toPrecision(12)));
  return ticks;
}

/** Widen [min, max] by a fraction of its span, guaranteeing a minimum span. */
export function padRange(min: number, max: number, fraction = 0.1, minSpan = 1): [number, number] {
  let lo = Math.min(min, max);
  let hi = Math.max(min, max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [0, 1];
  if (hi - lo < minSpan) {
    const mid = (lo + hi) / 2;
    lo = mid - minSpan / 2;
    hi = mid + minSpan / 2;
  }
  const pad = (hi - lo) * fraction;
  return [lo - pad, hi + pad];
}

const px = (value: number) => value.toFixed(2);

/**
 * SVG path for y = f(x) between `from` and `to`. The pen lifts wherever f is
 * undefined or non-finite and across asymptote-sized jumps, so the path never
 * contains NaN and never draws a false vertical line.
 */
export function curvePath(
  f: (x: number) => number,
  scale: PlotScale,
  from?: number,
  to?: number,
  samples?: number,
): string {
  const lo = Math.max(from ?? scale.xMin, scale.xMin);
  const hi = Math.min(to ?? scale.xMax, scale.xMax);
  if (!(hi > lo)) return "";
  const n = Math.round(clamp(samples ?? scale.innerWidth / 1.5, 2, 600));
  const top = scale.margin.top;
  const bottom = top + scale.innerHeight;
  const reach = 4 * scale.innerHeight;
  let d = "";
  let penDown = false;
  let previous = 0;
  for (let i = 0; i <= n; i++) {
    const x = lo + ((hi - lo) * i) / n;
    let y: number;
    try {
      y = f(x);
    } catch {
      y = Number.NaN;
    }
    const raw = Number.isFinite(y) ? scale.sy(y) : Number.NaN;
    if (!Number.isFinite(raw)) {
      penDown = false;
      continue;
    }
    const py = clamp(raw, top - reach, bottom + reach);
    if (penDown) {
      const oppositeSides = (py < top && previous > bottom) || (py > bottom && previous < top);
      if (oppositeSides || Math.abs(py - previous) > 3 * scale.innerHeight) penDown = false;
    }
    d += `${penDown ? "L" : "M"}${px(scale.sx(x))},${px(py)}`;
    penDown = true;
    previous = py;
  }
  return d;
}

/* ── Plot frame ───────────────────────────────────────────────────────────── */

interface PlotContextValue {
  scale: PlotScale;
  clipId: string;
}

const PlotContext = createContext<PlotContextValue | null>(null);

/** Scale and clip path of the surrounding <Plot>. */
export function usePlot(): PlotContextValue {
  const value = useContext(PlotContext);
  if (!value) throw new Error("Plot marks must be rendered inside <Plot>.");
  return value;
}

export type PointerPhase = "start" | "move" | "end";

export interface PlotProps {
  xDomain: readonly [number, number];
  yDomain: readonly [number, number];
  /** Height in CSS pixels. Width follows the container. */
  height: number;
  /** Describes the graph and its current key values in words. */
  ariaLabel: string;
  xLabel?: string;
  yLabel?: string;
  /** Called with data coordinates while the pointer is pressed on the plot. */
  onPointer?: (position: { x: number; y: number }, phase: PointerPhase) => void;
  formatX?: (value: number) => string;
  formatY?: (value: number) => string;
  marginLeft?: number;
  marginRight?: number;
  className?: string;
  children?: ReactNode;
}

export function Plot({
  xDomain,
  yDomain,
  height,
  ariaLabel,
  xLabel,
  yLabel,
  onPointer,
  formatX,
  formatY,
  marginLeft = 44,
  marginRight = 14,
  className,
  children,
}: PlotProps) {
  const [containerRef, width] = useMeasuredWidth<HTMLDivElement>();
  const clipId = `plot-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const dragging = useRef(false);

  const marginTop = yLabel ? 26 : 10;
  const marginBottom = xLabel ? 42 : 24;
  const [x0, x1] = xDomain;
  const [y0, y1] = yDomain;

  const scale = useMemo(
    () =>
      width === null
        ? null
        : createScale(
            width,
            height,
            { top: marginTop, right: marginRight, bottom: marginBottom, left: marginLeft },
            [x0, x1],
            [y0, y1],
          ),
    [width, height, marginTop, marginRight, marginBottom, marginLeft, x0, x1, y0, y1],
  );
  const context = useMemo(() => (scale ? { scale, clipId } : null), [scale, clipId]);

  if (!scale || !context) {
    return <div ref={containerRef} className={clsx("w-full", className)} style={{ height }} />;
  }

  const { margin, innerWidth, innerHeight } = scale;
  const right = margin.left + innerWidth;
  const bottom = margin.top + innerHeight;
  const xTicks = niceTicks(scale.xMin, scale.xMax, Math.max(2, Math.round(innerWidth / 64)));
  const yTicks = niceTicks(scale.yMin, scale.yMax, Math.max(2, Math.round(innerHeight / 38)));
  const fx = formatX ?? ((value: number) => formatNumber(value, 3));
  const fy = formatY ?? ((value: number) => formatNumber(value, 3));
  const zeroX = scale.xMin < 0 && scale.xMax > 0 ? scale.sx(0) : null;
  const zeroY = scale.yMin < 0 && scale.yMax > 0 ? scale.sy(0) : null;

  const emit = (event: ReactPointerEvent<SVGSVGElement>, phase: PointerPhase) => {
    if (!onPointer) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const pointerX = ((event.clientX - rect.left) / rect.width) * scale.width;
    const pointerY = ((event.clientY - rect.top) / rect.height) * scale.height;
    onPointer(
      {
        x: clamp(scale.invX(pointerX), scale.xMin, scale.xMax),
        y: clamp(scale.invY(pointerY), scale.yMin, scale.yMax),
      },
      phase,
    );
  };

  const pointerHandlers = onPointer
    ? {
        onPointerDown: (event: ReactPointerEvent<SVGSVGElement>) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          emit(event, "start");
        },
        onPointerMove: (event: ReactPointerEvent<SVGSVGElement>) => {
          if (dragging.current) emit(event, "move");
        },
        onPointerUp: (event: ReactPointerEvent<SVGSVGElement>) => {
          if (!dragging.current) return;
          dragging.current = false;
          emit(event, "end");
        },
        onPointerCancel: () => {
          dragging.current = false;
        },
      }
    : {};

  return (
    <div ref={containerRef} className={clsx("w-full", className)} style={{ height }}>
      <svg
        role="img"
        aria-label={ariaLabel}
        width={scale.width}
        height={scale.height}
        viewBox={`0 0 ${scale.width} ${scale.height}`}
        className={clsx("block select-none", onPointer && "cursor-ew-resize")}
        style={onPointer ? { touchAction: "pan-y" } : undefined}
        {...pointerHandlers}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={margin.left} y={margin.top} width={innerWidth} height={innerHeight} />
          </clipPath>
        </defs>

        <g aria-hidden="true">
          {xTicks.map((tick) => (
            <line
              key={`gx${tick}`}
              x1={px(scale.sx(tick))}
              x2={px(scale.sx(tick))}
              y1={margin.top}
              y2={bottom}
              stroke="var(--chart-grid)"
              strokeWidth={1}
            />
          ))}
          {yTicks.map((tick) => (
            <line
              key={`gy${tick}`}
              x1={margin.left}
              x2={right}
              y1={px(scale.sy(tick))}
              y2={px(scale.sy(tick))}
              stroke="var(--chart-grid)"
              strokeWidth={1}
            />
          ))}
          <line
            x1={margin.left}
            x2={right}
            y1={bottom}
            y2={bottom}
            className="stroke-line-strong"
            strokeWidth={1}
          />
          <line
            x1={margin.left}
            x2={margin.left}
            y1={margin.top}
            y2={bottom}
            className="stroke-line-strong"
            strokeWidth={1}
          />
          {zeroY !== null ? (
            <line
              x1={margin.left}
              x2={right}
              y1={px(zeroY)}
              y2={px(zeroY)}
              className="stroke-faint"
              strokeWidth={1}
            />
          ) : null}
          {zeroX !== null ? (
            <line
              x1={px(zeroX)}
              x2={px(zeroX)}
              y1={margin.top}
              y2={bottom}
              className="stroke-faint"
              strokeWidth={1}
            />
          ) : null}

          {xTicks.map((tick) => (
            <text
              key={`tx${tick}`}
              x={px(scale.sx(tick))}
              y={bottom + 15}
              textAnchor="middle"
              className="fill-muted text-[11px] tabular-nums"
            >
              {fx(tick)}
            </text>
          ))}
          {yTicks.map((tick) => (
            <text
              key={`ty${tick}`}
              x={margin.left - 7}
              y={px(scale.sy(tick))}
              dy="0.32em"
              textAnchor="end"
              className="fill-muted text-[11px] tabular-nums"
            >
              {fy(tick)}
            </text>
          ))}
          {xLabel ? (
            <text
              x={margin.left + innerWidth / 2}
              y={scale.height - 6}
              textAnchor="middle"
              className="fill-ink-2 text-[12px] font-medium"
            >
              {xLabel}
            </text>
          ) : null}
          {yLabel ? (
            <text x={4} y={14} textAnchor="start" className="fill-ink-2 text-[12px] font-medium">
              {yLabel}
            </text>
          ) : null}
        </g>

        <PlotContext.Provider value={context}>
          <g aria-hidden="true">{children}</g>
        </PlotContext.Provider>
      </svg>
    </div>
  );
}

/* ── Marks ────────────────────────────────────────────────────────────────── */

interface StrokeProps {
  /** Tailwind stroke colour class, e.g. "stroke-chart-1". */
  className?: string;
  strokeWidth?: number;
  /** SVG dash pattern, e.g. "6 4". Pair with colour so lines differ by more than hue. */
  dash?: string;
}

export interface PlotLabelProps {
  x: number;
  y: number;
  text: string;
  dx?: number;
  dy?: number;
  /** "auto" flips the label to whichever side has room. */
  anchor?: "start" | "middle" | "end" | "auto";
  /** Tailwind fill colour class. */
  className?: string;
}

/** Text placed at a data coordinate, kept inside the plot, with a halo for legibility. */
export function PlotLabel({
  x,
  y,
  text,
  dx = 0,
  dy = 0,
  anchor = "start",
  className = "fill-ink-2",
}: PlotLabelProps) {
  const { scale } = usePlot();
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const left = scale.margin.left;
  const right = left + scale.innerWidth;
  const top = scale.margin.top;
  const bottom = top + scale.innerHeight;
  const rawX = scale.sx(x);
  const flip = anchor === "auto" && rawX > left + scale.innerWidth * 0.6;
  const resolved = anchor === "auto" ? (flip ? "end" : "start") : anchor;
  const labelX = clamp(rawX + (flip ? -dx : dx), left + 3, right - 3);
  const labelY = clamp(scale.sy(y) + dy, top + 11, bottom - 5);
  return (
    <text
      x={px(labelX)}
      y={px(labelY)}
      textAnchor={resolved}
      paintOrder="stroke"
      strokeWidth={3.5}
      strokeLinejoin="round"
      className={clsx("stroke-surface text-[12px] font-semibold tabular-nums", className)}
    >
      {text}
    </text>
  );
}

export interface CurveProps extends StrokeProps {
  f: (x: number) => number;
  from?: number;
  to?: number;
  samples?: number;
  /** Direct label drawn on the curve at x = labelX. */
  label?: string;
  labelX?: number;
  labelDx?: number;
  labelDy?: number;
  labelAnchor?: PlotLabelProps["anchor"];
  labelClassName?: string;
}

/** y = f(x), sampled into a path that breaks at undefined values and jumps. */
export function Curve({
  f,
  from,
  to,
  samples,
  className = "stroke-chart-1",
  strokeWidth = 2.25,
  dash,
  label,
  labelX,
  labelDx = 6,
  labelDy = -7,
  labelAnchor = "start",
  labelClassName,
}: CurveProps) {
  const { scale, clipId } = usePlot();
  const d = useMemo(() => curvePath(f, scale, from, to, samples), [f, scale, from, to, samples]);
  const at = labelX ?? scale.xMax;
  let labelY = Number.NaN;
  if (label) {
    try {
      labelY = f(at);
    } catch {
      labelY = Number.NaN;
    }
  }
  return (
    <>
      {d ? (
        <path
          d={d}
          fill="none"
          className={className}
          strokeWidth={strokeWidth}
          strokeDasharray={dash}
          strokeLinejoin="round"
          strokeLinecap="round"
          clipPath={`url(#${clipId})`}
        />
      ) : null}
      {label && Number.isFinite(labelY) ? (
        <PlotLabel
          x={at}
          y={clamp(labelY, scale.yMin, scale.yMax)}
          text={label}
          dx={labelDx}
          dy={labelDy}
          anchor={labelAnchor}
          className={labelClassName}
        />
      ) : null}
    </>
  );
}

/** The part of y = slope·x + intercept that lies inside the plot window. */
export function StraightLine({
  slope,
  intercept,
  className = "stroke-chart-2",
  strokeWidth = 2,
  dash,
}: StrokeProps & { slope: number; intercept: number }) {
  const { scale, clipId } = usePlot();
  if (!Number.isFinite(slope) || !Number.isFinite(intercept)) return null;
  // Clip to the y-window analytically so steep lines never produce huge coordinates.
  const span = scale.yMax - scale.yMin;
  const yLow = scale.yMin - span;
  const yHigh = scale.yMax + span;
  let xa = scale.xMin;
  let xb = scale.xMax;
  if (slope !== 0) {
    const cross1 = (yLow - intercept) / slope;
    const cross2 = (yHigh - intercept) / slope;
    xa = Math.max(xa, Math.min(cross1, cross2));
    xb = Math.min(xb, Math.max(cross1, cross2));
  } else if (intercept < yLow || intercept > yHigh) {
    return null;
  }
  if (!(xb > xa)) return null;
  return (
    <line
      x1={px(scale.sx(xa))}
      y1={px(scale.sy(slope * xa + intercept))}
      x2={px(scale.sx(xb))}
      y2={px(scale.sy(slope * xb + intercept))}
      className={className}
      strokeWidth={strokeWidth}
      strokeDasharray={dash}
      strokeLinecap="round"
      clipPath={`url(#${clipId})`}
    />
  );
}

/** A straight segment between two data points (clipped to the plot). */
export function Segment({
  x1,
  y1,
  x2,
  y2,
  className = "stroke-faint",
  strokeWidth = 1.5,
  dash,
}: StrokeProps & { x1: number; y1: number; x2: number; y2: number }) {
  const { scale, clipId } = usePlot();
  if (![x1, y1, x2, y2].every(Number.isFinite)) return null;
  const span = scale.yMax - scale.yMin;
  const cy = (y: number) => clamp(y, scale.yMin - span, scale.yMax + span);
  return (
    <line
      x1={px(scale.sx(x1))}
      y1={px(scale.sy(cy(y1)))}
      x2={px(scale.sx(x2))}
      y2={px(scale.sy(cy(y2)))}
      className={className}
      strokeWidth={strokeWidth}
      strokeDasharray={dash}
      clipPath={`url(#${clipId})`}
    />
  );
}

/** Horizontal reference line at y, optionally only between x = from and x = to. */
export function HLine({
  y,
  from,
  to,
  ...stroke
}: StrokeProps & { y: number; from?: number; to?: number }) {
  const { scale } = usePlot();
  if (!Number.isFinite(y) || y < scale.yMin || y > scale.yMax) return null;
  return <Segment x1={from ?? scale.xMin} x2={to ?? scale.xMax} y1={y} y2={y} {...stroke} />;
}

/** Vertical reference line at x, optionally only between y = from and y = to. */
export function VLine({
  x,
  from,
  to,
  ...stroke
}: StrokeProps & { x: number; from?: number; to?: number }) {
  const { scale } = usePlot();
  if (!Number.isFinite(x) || x < scale.xMin || x > scale.xMax) return null;
  return <Segment x1={x} x2={x} y1={from ?? scale.yMin} y2={to ?? scale.yMax} {...stroke} />;
}

export interface DotProps {
  x: number;
  y: number;
  r?: number;
  /**
   * Tailwind fill and stroke classes. Solid: "fill-chart-1 stroke-surface".
   * Hollow (a second way to tell markers apart): "fill-surface stroke-chart-2".
   */
  className?: string;
  strokeWidth?: number;
}

/** A point marker. Hidden when it falls outside the plot window. */
export function Dot({
  x,
  y,
  r = 5,
  className = "fill-chart-1 stroke-surface",
  strokeWidth = 2,
}: DotProps) {
  const { scale } = usePlot();
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < scale.xMin || x > scale.xMax || y < scale.yMin || y > scale.yMax) return null;
  return (
    <circle
      cx={px(scale.sx(x))}
      cy={px(scale.sy(y))}
      r={r}
      className={className}
      strokeWidth={strokeWidth}
    />
  );
}

export interface RegionProps {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  /** Tailwind fill colour class for a solid fill. */
  className?: string;
  /** Tailwind stroke colour class for the outline and hatch lines. */
  strokeClassName?: string;
  /** Diagonal hatching instead of a solid fill, so regions differ by more than colour. */
  hatch?: boolean;
  fillOpacity?: number;
}

/** A shaded rectangle between two x values and two y values. */
export function Region({
  x1,
  x2,
  y1,
  y2,
  className = "fill-chart-1",
  strokeClassName = "stroke-chart-1",
  hatch = false,
  fillOpacity = 0.16,
}: RegionProps) {
  const { scale, clipId } = usePlot();
  const patternId = `plot-hatch-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (![x1, x2, y1, y2].every(Number.isFinite)) return null;
  const left = scale.sx(clamp(Math.min(x1, x2), scale.xMin, scale.xMax));
  const right = scale.sx(clamp(Math.max(x1, x2), scale.xMin, scale.xMax));
  const top = scale.sy(clamp(Math.max(y1, y2), scale.yMin, scale.yMax));
  const bottom = scale.sy(clamp(Math.min(y1, y2), scale.yMin, scale.yMax));
  if (right - left <= 0 || bottom - top <= 0) return null;
  return (
    <g clipPath={`url(#${clipId})`}>
      {hatch ? (
        <defs>
          <pattern
            id={patternId}
            width={7}
            height={7}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={7}
              className={strokeClassName}
              strokeWidth={2}
              strokeOpacity={0.55}
            />
          </pattern>
        </defs>
      ) : null}
      <rect
        x={px(left)}
        y={px(top)}
        width={px(right - left)}
        height={px(bottom - top)}
        fill={hatch ? `url(#${patternId})` : undefined}
        fillOpacity={hatch ? 1 : fillOpacity}
        className={clsx(!hatch && className, strokeClassName)}
        strokeWidth={1.25}
      />
    </g>
  );
}

/** The signed area between y = f(x) and a baseline, from x = from to x = to. */
export function Area({
  f,
  from,
  to,
  baseline = 0,
  className = "fill-chart-1",
  fillOpacity = 0.16,
}: {
  f: (x: number) => number;
  from: number;
  to: number;
  baseline?: number;
  className?: string;
  fillOpacity?: number;
}) {
  const { scale, clipId } = usePlot();
  const d = useMemo(() => {
    const lo = clamp(Math.min(from, to), scale.xMin, scale.xMax);
    const hi = clamp(Math.max(from, to), scale.xMin, scale.xMax);
    if (!(hi > lo)) return "";
    const span = scale.yMax - scale.yMin;
    const cy = (y: number) => clamp(y, scale.yMin - span, scale.yMax + span);
    const base = px(scale.sy(cy(baseline)));
    const n = 48;
    let path = `M${px(scale.sx(lo))},${base}`;
    for (let i = 0; i <= n; i++) {
      const x = lo + ((hi - lo) * i) / n;
      const y = f(x);
      if (!Number.isFinite(y)) return "";
      path += `L${px(scale.sx(x))},${px(scale.sy(cy(y)))}`;
    }
    return `${path}L${px(scale.sx(hi))},${base}Z`;
  }, [f, from, to, baseline, scale]);
  if (!d) return null;
  return (
    <path
      d={d}
      className={className}
      fillOpacity={fillOpacity}
      stroke="none"
      clipPath={`url(#${clipId})`}
    />
  );
}

/* ── Shared simulation chrome ─────────────────────────────────────────────── */

export function SimFrame({
  title,
  description,
  compact,
  children,
}: {
  title: string;
  description?: string;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={clsx(
        "@container rounded-xl border border-line bg-surface text-ink",
        compact ? "p-3" : "p-4 @2xl:p-5",
      )}
    >
      <header className={compact ? "mb-2" : "mb-4"}>
        <h3
          className={clsx(
            "font-semibold tracking-tight text-ink",
            compact ? "text-sm" : "text-base",
          )}
        >
          {title}
        </h3>
        {description && !compact ? (
          <p className="mt-0.5 text-sm text-muted">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export interface SliderFieldProps {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Visible value, e.g. "4 m/s". */
  display: string;
  /** Spoken value including units, e.g. "4 metres per second". */
  valueText: string;
  hint?: string;
}

/** A native range input with a visible label and value. */
export function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  valueText,
  hint,
}: SliderFieldProps) {
  const id = useId();
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink-2">
          {label}
        </label>
        <span className="shrink-0 font-mono text-sm tabular-nums text-ink">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        className="sim-range block cursor-pointer"
        style={{ height: "2.5rem" }}
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueText}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
      />
      {hint ? (
        <p id={`${id}-hint`} className="-mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** A labelled checkbox with a full-height touch target. */
export function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm font-medium text-ink-2">
      <input
        type="checkbox"
        className="size-4 shrink-0 accent-accent"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

export type StatTone = "neutral" | "good" | "bad" | "warn";

const TONE_CLASS: Record<StatTone, string> = {
  neutral: "text-ink",
  good: "text-good",
  bad: "text-bad",
  warn: "text-warn",
};

/** One readout: a small label over a tabular value. */
export function Stat({
  label,
  value,
  note,
  tone = "neutral",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  tone?: StatTone;
  className?: string;
}) {
  return (
    <div
      className={clsx("min-w-0 rounded-lg border border-line bg-surface-2 px-3 py-2", className)}
    >
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={clsx(
          "mt-0.5 font-mono text-[15px] font-semibold tabular-nums [overflow-wrap:anywhere]",
          TONE_CLASS[tone],
        )}
      >
        {value}
      </dd>
      {note ? <dd className="mt-0.5 text-xs text-muted">{note}</dd> : null}
    </div>
  );
}

/**
 * The state of the simulation in a sentence, so it can be used without seeing
 * the graph. Sighted users see the sentence update immediately; the copy that
 * is announced (aria-live="polite") is debounced so dragging a slider or
 * running an animation does not flood a screen reader.
 */
export function LiveSummary({ text, className }: { text: string; className?: string }) {
  const settled = useDebouncedValue(text, 450);
  return (
    <div
      className={clsx(
        "rounded-lg bg-sunken px-3 py-2 text-sm leading-relaxed text-ink-2",
        className,
      )}
    >
      <p aria-hidden="true">{text}</p>
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {settled}
      </p>
    </div>
  );
}

/** A line-style swatch with its name, for the legend under a plot. */
export function LegendItem({
  label,
  className,
  dash,
  strokeWidth = 2.25,
}: {
  label: string;
  className: string;
  dash?: string;
  strokeWidth?: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
      <svg width={30} height={8} aria-hidden="true" className="shrink-0">
        <line
          x1={1}
          y1={4}
          x2={29}
          y2={4}
          className={className}
          strokeWidth={strokeWidth}
          strokeDasharray={dash}
          strokeLinecap="round"
        />
      </svg>
      {label}
    </span>
  );
}

/** Class names for the simulations' buttons (≥ 40px touch target). */
export function buttonClass(variant: "primary" | "secondary" | "chip", active = false): string {
  const base =
    "inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  if (variant === "primary") return clsx(base, "bg-accent text-on-accent hover:bg-accent-hover");
  if (variant === "secondary")
    return clsx(base, "border border-line-strong bg-surface text-ink hover:bg-surface-2");
  return clsx(
    base,
    "border font-mono",
    active
      ? "border-accent bg-accent-soft text-accent-ink"
      : "border-line bg-surface text-ink-2 hover:border-line-strong hover:bg-surface-2",
  );
}
