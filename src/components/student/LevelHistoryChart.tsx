/**
 * Level-over-time step chart for one skill (inline SVG, server-rendered),
 * with a full data table behind a disclosure as the accessible alternative.
 * Plots the plain-language level only — never the raw estimate.
 */
import { formatDate } from "@/components/ui";
import {
  LEVEL_LABEL,
  LEVEL_RANK,
  MASTERY_LEVELS,
  type MasteryLevel,
} from "@/modules/mastery/types";

const TRIGGER_LABEL: Record<string, string> = {
  evidence: "New answer",
  policy_change: "Policy change",
  rebuild: "Recalculated",
  retention: "Review schedule",
};

const DOT_CLASS: Record<MasteryLevel, string> = {
  not_started: "fill-m-none",
  developing: "fill-m-developing",
  approaching: "fill-m-approaching",
  proficient: "fill-m-proficient",
  mastered: "fill-m-mastered",
};

export interface HistoryPoint {
  at: Date;
  level: MasteryLevel;
  trigger: string;
}

export function LevelHistoryChart({
  history,
  skillName,
}: {
  history: HistoryPoint[];
  skillName: string;
}) {
  if (history.length === 0) return null;
  const W = 640;
  const H = 200;
  const pad = { l: 128, r: 16, t: 14, b: 30 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const n = history.length;
  const x = (i: number) => pad.l + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (level: MasteryLevel) => pad.t + innerH - (LEVEL_RANK[level] / 4) * innerH;

  let d = `M ${x(0)} ${y(history[0].level)}`;
  for (let i = 1; i < n; i++) d += ` H ${x(i)} V ${y(history[i].level)}`;

  const changes = history.filter((h, i) => i === 0 || h.level !== history[i - 1].level);
  const summary = `${skillName}: ${n} recalculations from ${formatDate(history[0].at)} to ${formatDate(history[n - 1].at)}. ${changes
    .map((c) => `${LEVEL_LABEL[c.level]} on ${formatDate(c.at)}`)
    .join(", then ")}.`;

  // Draw a dot at every level change (and the latest point) to keep the chart calm.
  const dotIdx = history
    .map((h, i) => (i === 0 || i === n - 1 || h.level !== history[i - 1].level ? i : -1))
    .filter((i) => i >= 0);

  return (
    <figure>
      <div className="-mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={summary}
          className="h-auto w-full min-w-[520px] overflow-visible"
        >
          {MASTERY_LEVELS.map((level) => (
            <g key={level}>
              <line
                x1={pad.l}
                x2={W - pad.r}
                y1={y(level)}
                y2={y(level)}
                className="stroke-chart-grid"
                strokeWidth={1}
              />
              <text
                x={pad.l - 10}
                y={y(level)}
                dy="0.32em"
                textAnchor="end"
                className="fill-muted text-[11px]"
              >
                {LEVEL_LABEL[level]}
              </text>
            </g>
          ))}
          <path
            d={d}
            fill="none"
            className="stroke-accent"
            strokeWidth={2.25}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {dotIdx.map((i) => (
            <circle
              key={i}
              cx={x(i)}
              cy={y(history[i].level)}
              r={4.5}
              className={`${DOT_CLASS[history[i].level]} stroke-surface`}
              strokeWidth={2}
            />
          ))}
          <text x={pad.l} y={H - 8} className="fill-muted text-[11px]">
            {formatDate(history[0].at, { short: true })}
          </text>
          {n > 1 ? (
            <text x={W - pad.r} y={H - 8} textAnchor="end" className="fill-muted text-[11px]">
              {formatDate(history[n - 1].at, { short: true })}
            </text>
          ) : null}
        </svg>
      </div>
      <figcaption className="mt-1 text-xs text-muted">
        Each step is a recalculation after new evidence. Time between answers doesn&apos;t lower
        your level.
      </figcaption>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-accent underline-offset-4 hover:underline">
          Show history as a table
        </summary>
        <div className="mt-3 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-max text-left text-sm">
            <caption className="sr-only">Level history for {skillName}</caption>
            <thead className="bg-surface-2 text-xs text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">
                  When
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Level
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Why recalculated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...history].reverse().map((h, i) => (
                <tr key={`${h.at.toISOString()}-${i}`}>
                  <td className="px-3 py-2 tabular-nums text-ink-2">
                    {formatDate(h.at, { withTime: true })}
                  </td>
                  <td className="px-3 py-2 text-ink">{LEVEL_LABEL[h.level]}</td>
                  <td className="px-3 py-2 text-muted">{TRIGGER_LABEL[h.trigger] ?? h.trigger}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
