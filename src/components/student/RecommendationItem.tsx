/**
 * One recommendation: what to do, why (always shown), and the multi-step plan
 * when the engine provides one.
 */
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  Lightbulb,
  RotateCcw,
  Target,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";
import { ButtonLink, Pill } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Recommendation, RecKind } from "@/modules/recommendations/engine";

const KIND: Record<RecKind, { label: string; icon: ReactNode }> = {
  assignment: { label: "Assignment", icon: <ClipboardList /> },
  misconception: { label: "Fix a mistake", icon: <TriangleAlert /> },
  prerequisite_gap: { label: "Prerequisite first", icon: <Wrench /> },
  review: { label: "Review", icon: <RotateCcw /> },
  continue_lesson: { label: "Continue", icon: <BookOpen /> },
  struggling_skill: { label: "More practice", icon: <Target /> },
  next_lesson: { label: "Next lesson", icon: <BookOpen /> },
  practice_to_level_up: { label: "Level up", icon: <Lightbulb /> },
  take_assessment: { label: "Quiz", icon: <ClipboardList /> },
};

export function RecommendationItem({
  rec,
  courseName,
  emphasis = false,
  headingLevel = "h3",
  className,
}: {
  rec: Recommendation;
  courseName?: string;
  emphasis?: boolean;
  headingLevel?: "h2" | "h3" | "h4";
  className?: string;
}) {
  const kind = KIND[rec.kind];
  const Heading = headingLevel;
  return (
    <div className={cn("flex gap-4", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl [&>svg]:size-[1.05rem]",
          emphasis ? "bg-accent text-on-accent" : "bg-accent-soft text-accent-ink",
        )}
      >
        {kind.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span className="font-medium text-accent">{kind.label}</span>
          {courseName ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{courseName}</span>
            </>
          ) : null}
        </div>
        <Heading
          className={cn(
            "mt-0.5 font-display font-semibold leading-snug text-ink",
            emphasis ? "text-lg" : "text-[0.9375rem]",
          )}
        >
          {rec.title}
        </Heading>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          <span className="sr-only">Why: </span>
          {rec.reason}
        </p>
        {rec.steps && rec.steps.length > 1 ? (
          <ol aria-label="Suggested steps" className="mt-3 flex flex-wrap items-center gap-1.5">
            {rec.steps.map((step, i) => (
              <li key={`${step.href}-${i}`} className="inline-flex items-center gap-1.5">
                <Link
                  href={step.href}
                  className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Pill className="hover:border-line-strong hover:bg-surface-2">
                    <span className="mr-1 tabular-nums text-faint">{i + 1}.</span>
                    {step.label}
                  </Pill>
                </Link>
                {i < rec.steps!.length - 1 ? (
                  <ArrowRight aria-hidden="true" className="size-3 text-faint" />
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}
        <div className="mt-3">
          <ButtonLink
            href={rec.href}
            size="sm"
            variant={emphasis ? "primary" : "secondary"}
            iconRight={<ArrowRight className="size-3.5" aria-hidden="true" />}
          >
            {rec.cta}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
