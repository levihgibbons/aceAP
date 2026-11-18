/** The single next step on a course's guided path, with one clear action. */
import { ArrowRight, BookOpen } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { cn } from "@/lib/cn";
import { NEXT_STEP_ACTION, NEXT_STEP_EYEBROW, type NextStep } from "./roadmap";

export function NextStepCard({ step, courseName, className }: { step: NextStep; courseName?: string; className?: string }) {
  return (
    <section
      aria-labelledby="next-step-title"
      className={cn(
        "flex flex-col gap-4 rounded-card border border-accent/25 bg-accent-soft/50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-4">
        <span aria-hidden="true" className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-accent shadow-card sm:inline-flex">
          <BookOpen className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[0.8125rem] font-medium text-accent">{NEXT_STEP_EYEBROW[step.mode]}</p>
          <h2 id="next-step-title" className="mt-0.5 font-display text-xl font-semibold leading-snug text-ink text-balance">
            <span className="mr-2 font-mono text-base font-medium text-muted tabular-nums">{step.number}</span>
            {step.lesson.title}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {courseName ? `${courseName} · ` : ""}Unit {step.unit.number}: {step.unit.title} · ~{step.lesson.estMinutes} min
          </p>
        </div>
      </div>
      <ButtonLink
        href={`/app/learn/${step.lesson.id}`}
        size="lg"
        className="shrink-0 self-start sm:self-auto"
        iconRight={<ArrowRight aria-hidden="true" className="size-4" />}
      >
        {NEXT_STEP_ACTION[step.mode]}
      </ButtonLink>
    </section>
  );
}
