/**
 * ProgressBar — a single 0..1 value with an accessible name.
 *   <ProgressBar value={0.42} label="Unit 2 completion" showValue />
 * SegmentedProgress — stacked bar of a mastery distribution with a text
 * alternative (sr-only list, or a visible legend with showLegend).
 *   <SegmentedProgress label="Calculus AB skills" total={24}
 *     segments={[{ level: "mastered", count: 3 }, { level: "proficient", count: 5 }, …]} showLegend />
 * Missing evidence is never hidden: whatever isn't covered by segments is
 * drawn as "Not started".
 */
import { cn } from "@/lib/cn";
import { LEVEL_LABEL, MASTERY_LEVELS, type MasteryLevel } from "@/modules/mastery/types";
import { MASTERY_FILL, MasteryGlyph } from "./Mastery";

export type ProgressTone = "accent" | "good" | "warn" | "bad" | "info";

const TONE: Record<ProgressTone, string> = {
  accent: "bg-accent",
  good: "bg-good",
  warn: "bg-warn",
  bad: "bg-bad",
  info: "bg-info",
};

export interface ProgressBarProps {
  /** 0..1 */
  value: number;
  /** Accessible name. */
  label: string;
  tone?: ProgressTone;
  size?: "sm" | "md";
  /** Show the label and percentage above the bar. */
  showValue?: boolean;
  className?: string;
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

export function ProgressBar({ value, label, tone = "accent", size = "md", showValue = false, className }: ProgressBarProps) {
  const pct = Math.round(clamp01(value) * 100);
  return (
    <div className={cn("w-full", className)}>
      {showValue ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
          <span className="truncate text-muted">{label}</span>
          <span className="font-medium tabular-nums text-ink-2">{pct}%</span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${pct}%`}
        className={cn("w-full overflow-hidden rounded-full bg-sunken", size === "sm" ? "h-1.5" : "h-2.5")}
      >
        <div className={cn("h-full rounded-full transition-[width] duration-300", TONE[tone])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export interface SegmentedProgressProps {
  segments: { level: MasteryLevel; count: number }[];
  total: number;
  /** Accessible name, e.g. "Unit 2 skills". */
  label: string;
  showLegend?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function SegmentedProgress({ segments, total, label, showLegend = false, size = "md", className }: SegmentedProgressProps) {
  const counts = new Map<MasteryLevel, number>();
  for (const s of segments) counts.set(s.level, (counts.get(s.level) ?? 0) + Math.max(0, s.count));
  const covered = MASTERY_LEVELS.filter((l) => l !== "not_started").reduce((n, l) => n + (counts.get(l) ?? 0), 0);
  const safeTotal = Math.max(total, covered + (counts.get("not_started") ?? 0), 0);
  counts.set("not_started", Math.max(0, safeTotal - covered));

  // Draw best → worst from the left.
  const order = [...MASTERY_LEVELS].reverse();
  const summary = order
    .filter((l) => (counts.get(l) ?? 0) > 0)
    .map((l) => `${LEVEL_LABEL[l]}: ${counts.get(l)} of ${safeTotal}`)
    .join(", ");

  return (
    <div className={cn("w-full", className)}>
      <div
        role="img"
        aria-label={`${label}. ${safeTotal === 0 ? "No items yet." : summary}`}
        className={cn("flex w-full gap-px overflow-hidden rounded-full bg-sunken", size === "sm" ? "h-1.5" : "h-2.5")}
      >
        {safeTotal > 0
          ? order.map((l) => {
              const c = counts.get(l) ?? 0;
              if (c === 0) return null;
              return (
                <div
                  key={l}
                  className={cn("h-full first:rounded-l-full last:rounded-r-full", l === "not_started" ? "bg-sunken" : MASTERY_FILL[l])}
                  style={{ width: `${(c / safeTotal) * 100}%` }}
                />
              );
            })
          : null}
      </div>
      {showLegend ? (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted" aria-hidden="true">
          {order.map((l) =>
            (counts.get(l) ?? 0) > 0 ? (
              <li key={l} className="inline-flex items-center gap-1">
                <MasteryGlyph level={l} className="size-3" />
                <span>
                  {LEVEL_LABEL[l]} <span className="tabular-nums text-ink-2">{counts.get(l)}</span>
                </span>
              </li>
            ) : null,
          )}
        </ul>
      ) : null}
    </div>
  );
}
