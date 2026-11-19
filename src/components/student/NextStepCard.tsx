/** The single next step on a course's guided path: the lesson, and the practice that goes with it. */
import { ArrowRight, BookOpen, Dumbbell } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { CourseTree } from "@/modules/curriculum/queries";
import { NEXT_STEP_ACTION, NEXT_STEP_EYEBROW, type NextStep } from "./roadmap";

/** The first practice for a lesson's topic: an exercise, else a topic quiz. */
export function practiceForLesson(tree: CourseTree, lessonId: string): { href: string; title: string } | null {
  const lesson = tree.lessons.get(lessonId);
  if (!lesson) return null;
  const inTopic = tree.assessments.filter((a) => a.topicId === lesson.topicId);
  const a = inTopic.find((x) => x.kind === "exercise") ?? inTopic[0];
  if (a) return { href: `/app/assessments/${a.id}`, title: a.title };
  const skill = lesson.skillIds[0];
  return skill ? { href: `/app/practice/${skill}`, title: tree.skills.get(skill)?.name ?? "this skill" } : null;
}

export function NextStepCard({
  step,
  practice,
  courseName,
  className,
}: {
  step: NextStep;
  practice?: { href: string; title: string } | null;
  courseName?: string;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="next-step-title"
      className={cn(
        "flex flex-col gap-4 rounded-card border border-accent/25 bg-accent-soft/50 p-5 sm:p-6 md:flex-row md:items-center md:justify-between",
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
            {courseName ? `${courseName} · ` : ""}Unit {step.unit.number} · ~{step.lesson.estMinutes} min
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <ButtonLink href={`/app/learn/${step.lesson.id}`} size="lg" iconRight={<ArrowRight aria-hidden="true" className="size-4" />}>
          {NEXT_STEP_ACTION[step.mode]}
        </ButtonLink>
        {practice ? (
          <ButtonLink
            href={practice.href}
            size="lg"
            variant="secondary"
            icon={<Dumbbell aria-hidden="true" className="size-4" />}
            aria-label={`Practise: ${practice.title}`}
          >
            Practise
          </ButtonLink>
        ) : null}
      </div>
    </section>
  );
}
