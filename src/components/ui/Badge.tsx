/**
 * Badge — short status text with a tone. Pill — neutral rounded tag/chip.
 *   <Badge tone="good">Published</Badge>
 *   <Badge tone="warn" icon={<Clock className="size-3" />}>Due soon</Badge>
 *   <Pill>Unit 2</Pill>
 * Tone is never the only signal — keep the text meaningful on its own.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "accent" | "good" | "warn" | "bad" | "info";

const TONE: Record<BadgeTone, string> = {
  neutral: "bg-sunken text-ink-2",
  accent: "bg-accent-soft text-accent-ink",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
};

export interface BadgeProps {
  tone?: BadgeTone;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = "neutral", icon, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium leading-5 whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      {icon ? <span aria-hidden="true" className="inline-flex shrink-0">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

export interface PillProps {
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Pill({ icon, className, children }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-medium leading-5 text-ink-2",
        className,
      )}
    >
      {icon ? <span aria-hidden="true" className="inline-flex shrink-0 text-muted">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}
