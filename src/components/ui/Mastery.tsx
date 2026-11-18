/**
 * Mastery indicators. Every level has a colour AND a distinct glyph AND a text
 * label, so none of them rely on colour alone.
 *   <MasteryBadge level="approaching" needsReview />
 *   <MasteryBadge level="mastered" size="sm" showLabel={false} />   (label kept for screen readers)
 *   <MasteryDot level={cell.level} needsReview={cell.needsReview} />  (heatmap cell)
 *   <StatusBadge status="needs_review" />
 *   <MasteryLegend />
 * Glyphs: Not started = dashed ring · Developing = ⅓ filled · Approaching = ⅔
 * filled · Proficient = filled with check · Mastered = star. "Needs review"
 * adds a separate circular-arrow marker.
 */
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { LEVEL_LABEL, MASTERY_LEVELS, type MasteryLevel } from "@/modules/mastery/types";
import type { StudentStatus } from "@/modules/mastery/aggregation";

const TEXT: Record<MasteryLevel, string> = {
  not_started: "text-m-none",
  developing: "text-m-developing",
  approaching: "text-m-approaching",
  proficient: "text-m-proficient",
  mastered: "text-m-mastered",
};

const SOFT: Record<MasteryLevel, string> = {
  not_started: "bg-m-none-soft",
  developing: "bg-m-developing-soft",
  approaching: "bg-m-approaching-soft",
  proficient: "bg-m-proficient-soft",
  mastered: "bg-m-mastered-soft",
};

/** Solid fill class per level, for bars and charts. */
export const MASTERY_FILL: Record<MasteryLevel, string> = {
  not_started: "bg-m-none",
  developing: "bg-m-developing",
  approaching: "bg-m-approaching",
  proficient: "bg-m-proficient",
  mastered: "bg-m-mastered",
};

export function MasteryGlyph({ level, className }: { level: MasteryLevel; className?: string }) {
  const common = { viewBox: "0 0 16 16", "aria-hidden": true as const, className: cn("shrink-0", TEXT[level], className) };
  switch (level) {
    case "not_started":
      return (
        <svg {...common} fill="none">
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.4 2.1" />
        </svg>
      );
    case "developing":
      return (
        <svg {...common} fill="none">
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 8V3.5A4.5 4.5 0 0 1 11.9 10.25Z" fill="currentColor" />
        </svg>
      );
    case "approaching":
      return (
        <svg {...common} fill="none">
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 8V3.5A4.5 4.5 0 1 1 4.1 10.25Z" fill="currentColor" />
        </svg>
      );
    case "proficient":
      return (
        <svg {...common} fill="none">
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path
            d="M5 8.2l2 2 4-4.2"
            className="stroke-surface"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "mastered":
      return (
        <svg {...common} fill="currentColor">
          <path
            d="M8 1.4l1.76 4.57 4.9.27-3.8 3.09 1.25 4.73L8 11.4l-4.11 2.66 1.25-4.73-3.8-3.09 4.9-.27Z"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

function ReviewMarker({ className }: { className?: string }) {
  return <RotateCcw aria-hidden="true" className={cn("shrink-0 text-m-review", className)} strokeWidth={2.4} />;
}

export interface MasteryBadgeProps {
  level: MasteryLevel;
  needsReview?: boolean;
  size?: "sm" | "md";
  /** Hide the visible text (it stays available to screen readers). */
  showLabel?: boolean;
  className?: string;
}

export function MasteryBadge({ level, needsReview = false, size = "md", showLabel = true, className }: MasteryBadgeProps) {
  const label = LEVEL_LABEL[level];
  const glyph = size === "sm" ? "size-3.5" : "size-4";
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full font-medium text-ink-2",
        showLabel ? (size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-[0.8125rem]") : "p-1",
        SOFT[level],
        className,
      )}
      title={showLabel ? undefined : `${label}${needsReview ? " · needs review" : ""}`}
    >
      <MasteryGlyph level={level} className={glyph} />
      <span className={showLabel ? undefined : "sr-only"}>{label}</span>
      {needsReview ? (
        <span className="inline-flex items-center gap-1 border-l border-line-strong/70 pl-1.5 text-m-review">
          <ReviewMarker className={size === "sm" ? "size-3" : "size-3.5"} />
          {showLabel ? (
            <span aria-hidden="true" className="font-medium">
              Review
            </span>
          ) : null}
          <span className="sr-only">, needs review</span>
        </span>
      ) : null}
    </span>
  );
}

export interface MasteryDotProps {
  level: MasteryLevel;
  needsReview?: boolean;
  size?: "sm" | "md";
  /** Extra context for the accessible label, e.g. the skill name. */
  context?: string;
  className?: string;
}

/** Compact heatmap cell glyph with an sr-only label. */
export function MasteryDot({ level, needsReview = false, size = "md", context, className }: MasteryDotProps) {
  const label = `${context ? `${context}: ` : ""}${LEVEL_LABEL[level]}${needsReview ? ", needs review" : ""}`;
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-md",
        size === "sm" ? "size-5" : "size-7",
        SOFT[level],
        className,
      )}
      title={label}
    >
      <MasteryGlyph level={level} className={size === "sm" ? "size-3" : "size-4"} />
      {needsReview ? (
        <span className="absolute -right-1 -top-1 inline-flex size-3.5 items-center justify-center rounded-full border border-surface bg-m-review-soft">
          <ReviewMarker className="size-2.5" />
        </span>
      ) : null}
      <span className="sr-only">{label}</span>
    </span>
  );
}

const STATUS: Record<StudentStatus, { label: string; level: MasteryLevel | null }> = {
  not_started: { label: "Not started", level: "not_started" },
  in_progress: { label: "In progress", level: "developing" },
  needs_review: { label: "Needs review", level: null },
  proficient: { label: "Proficient", level: "proficient" },
  mastered: { label: "Mastered", level: "mastered" },
};

export const STATUS_LABEL: Record<StudentStatus, string> = {
  not_started: STATUS.not_started.label,
  in_progress: STATUS.in_progress.label,
  needs_review: STATUS.needs_review.label,
  proficient: STATUS.proficient.label,
  mastered: STATUS.mastered.label,
};

export function StatusBadge({ status, size = "md", className }: { status: StudentStatus; size?: "sm" | "md"; className?: string }) {
  const { label, level } = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium text-ink-2",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-[0.8125rem]",
        level ? SOFT[level] : "bg-m-review-soft",
        className,
      )}
    >
      {level ? (
        <MasteryGlyph level={level} className={size === "sm" ? "size-3.5" : "size-4"} />
      ) : (
        <ReviewMarker className={size === "sm" ? "size-3.5" : "size-4"} />
      )}
      {label}
    </span>
  );
}

export function MasteryLegend({ includeReview = true, className }: { includeReview?: boolean; className?: string }) {
  return (
    <ul aria-label="Mastery levels" className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted", className)}>
      {MASTERY_LEVELS.map((level) => (
        <li key={level} className="inline-flex items-center gap-1.5">
          <MasteryGlyph level={level} className="size-3.5" />
          {LEVEL_LABEL[level]}
        </li>
      ))}
      {includeReview ? (
        <li className="inline-flex items-center gap-1.5">
          <ReviewMarker className="size-3.5" />
          Needs review
        </li>
      ) : null}
    </ul>
  );
}
