/**
 * Tiny history sparkline (server-safe SVG) with a text alternative.
 * Values are evidence estimates 0..1; the line is not a probability claim.
 */
import { cn } from "@/lib/cn";

export interface SparklineProps {
  points: { at: string | Date; estimate: number }[];
  label: string;
  className?: string;
}

export function Sparkline({ points, label, className }: SparklineProps) {
  const W = 220;
  const H = 48;
  const P = 4;
  if (points.length < 2) {
    return (
      <p className={cn("text-sm text-muted", className)}>
        {points.length === 1
          ? "One snapshot so far — the trend appears after more practice."
          : "No history yet."}
      </p>
    );
  }
  const xs = (i: number) => P + (i * (W - 2 * P)) / (points.length - 1);
  const ys = (v: number) => H - P - Math.min(1, Math.max(0, v)) * (H - 2 * P);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)},${ys(p.estimate).toFixed(1)}`)
    .join(" ");
  const first = points[0].estimate;
  const last = points[points.length - 1].estimate;
  const trend = last - first > 0.05 ? "rising" : first - last > 0.05 ? "falling" : "steady";
  return (
    <figure className={cn("m-0", className)}>
      <svg
        role="img"
        aria-label={`${label}: ${points.length} snapshots, trend ${trend}.`}
        viewBox={`0 0 ${W} ${H}`}
        className="h-12 w-full max-w-[220px]"
        preserveAspectRatio="none"
      >
        <line
          x1={P}
          x2={W - P}
          y1={ys(0.5)}
          y2={ys(0.5)}
          className="stroke-chart-grid"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <path
          d={d}
          fill="none"
          className="stroke-accent"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={xs(points.length - 1)} cy={ys(last)} r="3" className="fill-accent" />
      </svg>
      <figcaption className="mt-1 text-xs text-muted">
        Evidence trend over your last {points.length} updates:{" "}
        <span className="font-medium text-ink-2">{trend}</span>
      </figcaption>
    </figure>
  );
}
