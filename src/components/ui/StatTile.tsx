/**
 * StatTile — one headline number. Use sparingly (2–4 per page at most), and
 * only for numbers that drive a decision.
 *   <StatTile label="Skills proficient" value="12 / 31" hint="+3 this week" icon={<Target />} />
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface StatTileProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function StatTile({ label, value, hint, icon, className }: StatTileProps) {
  return (
    <div className={cn("rounded-card border border-line bg-surface p-4 shadow-card sm:p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.8125rem] font-medium text-muted">{label}</p>
        {icon ? (
          <span aria-hidden="true" className="inline-flex text-faint [&>svg]:size-4">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-display text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
