/**
 * Small server-safe building blocks for the student pages.
 *   <ContentStatusBadge status={course.contentStatus} />
 *   <ExternalLink href={course.sourceUrl}>College Board course page</ExternalLink>
 *   <MasteryOverview rollup={r} label="Calculus AB skills" />
 *   <CompletionMeter completed={3} total={5} />
 */
import type { ReactNode } from "react";
import { ExternalLink as ExternalIcon } from "lucide-react";
import type { CourseContentStatus } from "@/db/schema";
import { cn } from "@/lib/cn";
import {
  Badge,
  MasteryBadge,
  ProgressBar,
  SegmentedProgress,
  type BadgeTone,
} from "@/components/ui";
import { CONTENT_STATUS_LABEL } from "@/modules/curriculum/queries";
import type { Rollup } from "@/modules/mastery/aggregation";
import { MASTERY_LEVELS } from "@/modules/mastery/types";
import { pct } from "./format";

const STATUS_TONE: Record<CourseContentStatus, BadgeTone> = {
  catalog_only: "neutral",
  outline_available: "info",
  lessons_in_development: "warn",
  pilot_available: "accent",
  complete: "good",
};

export function ContentStatusBadge({
  status,
  className,
}: {
  status: CourseContentStatus;
  className?: string;
}) {
  return (
    <Badge tone={STATUS_TONE[status]} className={className}>
      {CONTENT_STATUS_LABEL[status].label}
    </Badge>
  );
}

export function ExternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-accent underline-offset-4 hover:underline",
        className,
      )}
    >
      {children}
      <ExternalIcon aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/**
 * Mastery across ALL skills in scope: level, distribution bar, and the
 * counts behind it. Never a "% known".
 */
export function MasteryOverview({
  rollup,
  label,
  size = "md",
  showLegend = false,
  showLevel = true,
  untestedNote = false,
  className,
}: {
  rollup: Rollup;
  label: string;
  size?: "sm" | "md";
  showLegend?: boolean;
  showLevel?: boolean;
  /** Add the explicit "Untested skills count as Not started" line. */
  untestedNote?: boolean;
  className?: string;
}) {
  const segments = MASTERY_LEVELS.map((level) => ({ level, count: rollup.counts[level] }));
  return (
    <div className={cn("space-y-2", className)}>
      {showLevel ? (
        <div className="flex flex-wrap items-center gap-2">
          <MasteryBadge level={rollup.level} needsReview={rollup.needsReview > 0} size={size} />
        </div>
      ) : null}
      <SegmentedProgress
        label={label}
        total={rollup.totalSkills}
        segments={segments}
        size={size}
        showLegend={showLegend}
      />
      <p className={cn("text-muted", size === "sm" ? "text-xs" : "text-sm")}>
        <span className="font-medium text-ink-2 tabular-nums">
          {rollup.proficientOrBetter} of {rollup.totalSkills}
        </span>{" "}
        {rollup.totalSkills === 1 ? "skill" : "skills"} Proficient or better
        <span aria-hidden="true"> · </span>
        <span className="sr-only">. </span>
        evidence on <span className="tabular-nums">{rollup.skillsWithEvidence}</span> (
        {pct(rollup.coverage)} coverage)
        {rollup.needsReview > 0 ? (
          <>
            <span aria-hidden="true"> · </span>
            <span className="sr-only">. </span>
            <span className="tabular-nums">{rollup.needsReview}</span> to review
          </>
        ) : null}
      </p>
      {untestedNote ? (
        <p className="text-xs text-muted">Untested skills count as Not started.</p>
      ) : null}
    </div>
  );
}

/** Lesson completion — engagement, not mastery. Labelled so the two are never confused. */
export function CompletionMeter({
  completed,
  total,
  size = "md",
  className,
}: {
  completed: number;
  total: number;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <ProgressBar
        value={total ? completed / total : 0}
        label="Lessons finished"
        tone="info"
        size={size}
      />
      <p className={cn("text-muted", size === "sm" ? "text-xs" : "text-sm")}>
        <span className="font-medium text-ink-2 tabular-nums">
          {completed} of {total}
        </span>{" "}
        {total === 1 ? "lesson" : "lessons"} finished
      </p>
    </div>
  );
}

/** Uppercase mini heading used to label the completion / mastery halves of a card. */
export function MiniLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-faint",
        className,
      )}
    >
      {children}
    </p>
  );
}
