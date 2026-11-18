/**
 * DailyBars — a tiny inline bar chart of daily values with a text alternative.
 *   <DailyBars values={msPerDay} labels={["2026-11-04", …]} label="Avery's estimated active time" />
 * Server-safe (no hooks). Zero days draw as a faint baseline tick so gaps read
 * as "no activity", not missing data.
 */
import { formatDuration } from "@/modules/analytics/activeTime";
import { dayLabel } from "./format";

export function DailyBars({ values, labels, label, width = 112, height = 28 }: { values: number[]; labels: string[]; label: string; width?: number; height?: number }) {
  const max = Math.max(...values, 0);
  const n = values.length || 1;
  const gap = 2;
  const bw = Math.max(1, (width - gap * (n - 1)) / n);
  const activeDays = values.filter((v) => v > 0).length;
  const peakIdx = values.indexOf(max);
  const summary =
    activeDays === 0
      ? `${label}: no estimated active time in the last ${n} days.`
      : `${label}: active on ${activeDays} of ${n} days; most on ${dayLabel(labels[peakIdx] ?? "")} (${formatDuration(max)}).`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summary} className="block overflow-visible">
      <title>{summary}</title>
      {values.map((v, i) => {
        const h = max > 0 && v > 0 ? Math.max(2, (v / max) * (height - 2)) : 1;
        return <rect key={i} x={i * (bw + gap)} y={height - h} width={bw} height={h} rx={1} className={v > 0 ? "fill-chart-1" : "fill-line-strong"} />;
      })}
    </svg>
  );
}
