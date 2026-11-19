/**
 * The course roadmap. One unit is open at a time (the one you're working in);
 * the rest are one-line rows you can expand. Inside a unit, every topic is a
 * card split in two: Learn (its lessons) and Practise (its exercises and
 * quizzes, or skill practice when the topic has no exercises yet). Practice
 * gets the same weight as reading. Nothing is locked.
 */
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronDown, CircleDashed, CircleDot, ClipboardCheck, Dumbbell, Lock } from "lucide-react";
import { Badge, pluralize } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { AssessmentNode, LessonNode, UnitNode } from "@/modules/curriculum/queries";
import type { CourseOverview } from "@/modules/learning/overview";
import { scoreText } from "./format";
import { unitLessons, unitPath, type PathSection } from "./roadmap";

/** The unit to show open: the one holding the next lesson, else the first with lessons. */
export function focusUnitId(o: CourseOverview, nextLessonId: string | null): string | null {
  const next = nextLessonId ? o.tree.lessons.get(nextLessonId) : null;
  return next?.unitId ?? o.tree.units.find((u) => u.status === "available")?.id ?? null;
}

export function CourseRoadmap({ o, nextLessonId }: { o: CourseOverview; nextLessonId: string | null }) {
  const { tree } = o;
  const focus = focusUnitId(o, nextLessonId);
  return (
    <ol className="space-y-3" aria-label={`${tree.course.name} roadmap`}>
      {tree.units.map((unit) => (
        <li key={unit.id}>
          {unit.status !== "available" ? (
            <OutlineStage unit={unit} />
          ) : (
            <UnitStage unit={unit} o={o} nextLessonId={nextLessonId} open={unit.id === focus} />
          )}
        </li>
      ))}
    </ol>
  );
}

function unitCounts(unit: UnitNode, o: CourseOverview) {
  const lessons = unitLessons(o.tree, unit.id);
  const finished = lessons.filter((l) => o.lessonProgress.get(l.id)?.status === "completed").length;
  const exercises = unit.assessments.filter((a) => a.kind === "exercise");
  const practised = exercises.filter((a) => o.assessmentResults.has(a.id)).length;
  return { lessons: lessons.length, finished, exercises: exercises.length, practised };
}

function UnitStage({ unit, o, nextLessonId, open }: { unit: UnitNode; o: CourseOverview; nextLessonId: string | null; open: boolean }) {
  const c = unitCounts(unit, o);
  const titleId = `unit-${unit.id}-title`;
  return (
    <details open={open} className="group/unit rounded-card border border-line bg-surface shadow-card open:shadow-raised">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3.5 rounded-card px-5 py-3.5 hover:bg-surface-2 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft font-display text-base font-semibold text-accent-ink tabular-nums"
        >
          {unit.number}
        </span>
        <span className="min-w-0 flex-1">
          <span id={titleId} className="block font-display text-[1.0625rem] font-semibold leading-snug text-ink">
            <span className="sr-only">Unit {unit.number}: </span>
            {unit.title}
          </span>
          <span className="mt-0.5 block text-xs text-muted tabular-nums">
            {c.finished}/{c.lessons} lessons
            {c.exercises ? ` · ${c.practised}/${c.exercises} practice sets tried` : ""}
          </span>
        </span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-faint transition-transform group-open/unit:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-line p-3 sm:p-4">
        <UnitPathList unit={unit} o={o} nextLessonId={nextLessonId} />
        <Link
          href={`/app/courses/${o.tree.course.id}/units/${unit.slug}`}
          className="group inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-accent hover:bg-accent-soft"
        >
          Unit {unit.number} skills and progress
          <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </details>
  );
}

/** A unit as topic cards (Learn | Practise), then unit-level checks. */
export function UnitPathList({ unit, o, nextLessonId }: { unit: UnitNode; o: CourseOverview; nextLessonId: string | null }) {
  const sections = unitPath(o.tree, unit);
  return (
    <div className="space-y-3">
      {sections.map((section) =>
        section.topic ? (
          <TopicCard key={section.topic.id} section={section} o={o} nextLessonId={nextLessonId} />
        ) : (
          <section key="unit-checks" aria-label="Unit checks" className="overflow-hidden rounded-xl border border-line">
            <p className="bg-surface-2 px-4 py-2 text-xs font-semibold text-ink-2">Unit checks</p>
            <ol className="divide-y divide-line">
              {section.items.map((item) =>
                item.type === "assessment" ? (
                  <li key={item.assessment.id}>
                    <CheckpointStep assessment={item.assessment} o={o} />
                  </li>
                ) : null,
              )}
            </ol>
          </section>
        ),
      )}
    </div>
  );
}

function TopicCard({ section, o, nextLessonId }: { section: PathSection; o: CourseOverview; nextLessonId: string | null }) {
  const topic = section.topic!;
  const lessons = section.items.flatMap((i) => (i.type === "lesson" ? [i] : []));
  const exercises = section.items.flatMap((i) => (i.type === "assessment" && i.assessment.kind === "exercise" ? [i.assessment] : []));
  const checks = section.items.flatMap((i) => (i.type === "assessment" && i.assessment.kind !== "exercise" ? [i.assessment] : []));
  const skills = topic.skillIds.map((id) => o.tree.skills.get(id)).filter((s) => s !== undefined);
  const hasPractice = exercises.length + checks.length + skills.length > 0;
  return (
    <section aria-label={topic.title} className="overflow-hidden rounded-xl border border-line">
      <h3 className="bg-surface-2 px-4 py-2 text-xs font-semibold text-ink-2">{topic.title}</h3>
      <div className="grid md:grid-cols-2 md:divide-x md:divide-line">
        <div>
          <ColumnLabel>Learn</ColumnLabel>
          {lessons.length ? (
            <ol>
              {lessons.map((l) => (
                <li key={l.lesson.id}>
                  <LessonStep lesson={l.lesson} number={l.number} o={o} isNext={l.lesson.id === nextLessonId} />
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-4 pb-3 text-sm text-muted">No lesson for this topic yet.</p>
          )}
        </div>
        <div className="border-t border-line md:border-t-0">
          <ColumnLabel>Practise</ColumnLabel>
          {hasPractice ? (
            <ol>
              {exercises.map((a) => (
                <li key={a.id}>
                  <ExerciseStep assessment={a} o={o} />
                </li>
              ))}
              {/* No practice sets for this topic yet: adaptive practice on its skills instead. */}
              {exercises.length === 0
                ? skills.map((s) => (
                    <li key={s.id}>
                      <Row href={`/app/practice/${s.id}`} icon={<Dumbbell className="text-accent" />} title={s.name} meta="Adaptive practice" srPrefix="Practise: " />
                    </li>
                  ))
                : null}
              {checks.map((a) => (
                <li key={a.id}>
                  <CheckpointStep assessment={a} o={o} />
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-4 pb-3 text-sm text-muted">No practice for this topic yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function ColumnLabel({ children }: { children: ReactNode }) {
  return <p className="px-4 pt-3 pb-1 text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">{children}</p>;
}

function Row({
  href,
  icon,
  title,
  meta,
  srPrefix,
  aside,
  highlight,
}: {
  href: string;
  icon: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  srPrefix?: string;
  aside?: ReactNode;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2 [&_svg]:size-[1.125rem] [&_svg]:shrink-0",
        highlight && "bg-accent-soft/50 hover:bg-accent-soft/70",
      )}
    >
      <span aria-hidden="true" className="inline-flex">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-snug text-ink underline-offset-4 group-hover:underline">
          {srPrefix ? <span className="sr-only">{srPrefix}</span> : null}
          {title}
        </span>
        {meta ? <span className="mt-0.5 block text-xs text-muted">{meta}</span> : null}
      </span>
      {aside}
    </Link>
  );
}

export function LessonStep({
  lesson,
  number,
  o,
  isNext,
}: {
  lesson: LessonNode;
  number: string;
  o: Pick<CourseOverview, "lessonProgress">;
  isNext: boolean;
}) {
  const progress = o.lessonProgress.get(lesson.id)?.status;
  const Icon = progress === "completed" ? CheckCircle2 : progress === "in_progress" ? CircleDot : CircleDashed;
  const color = progress === "completed" ? "text-good" : progress === "in_progress" ? "text-accent" : "text-faint";
  const reading = progress === "completed" ? "Finished" : progress === "in_progress" ? "Started" : `~${lesson.estMinutes} min`;
  return (
    <Row
      href={`/app/learn/${lesson.id}`}
      highlight={isNext}
      icon={<Icon className={color} />}
      srPrefix={`Lesson ${number}: `}
      title={
        <>
          <span aria-hidden="true" className="mr-1.5 font-mono text-xs font-normal text-muted tabular-nums">
            {number}
          </span>
          {lesson.title}
        </>
      }
      meta={reading}
      aside={isNext ? <Badge tone="info">Up next</Badge> : null}
    />
  );
}

/** A practice exercise: a fresh set of questions each try; shows the best score. */
export function ExerciseStep({ assessment: a, o }: { assessment: AssessmentNode; o: Pick<CourseOverview, "assessmentResults"> }) {
  const res = o.assessmentResults.get(a.id);
  return (
    <Row
      href={`/app/assessments/${a.id}`}
      icon={<Dumbbell className="text-accent" />}
      srPrefix="Practice exercise: "
      title={a.title}
      meta={res ? `Best ${scoreText(res.bestScore, res.maxScore)} · ${pluralize(res.attempts, "try", "tries")}` : "New questions every try"}
    />
  );
}

export function CheckpointStep({ assessment: a, o }: { assessment: AssessmentNode; o: Pick<CourseOverview, "assessmentResults"> }) {
  const res = o.assessmentResults.get(a.id);
  return (
    <Row
      href={`/app/assessments/${a.id}`}
      icon={<ClipboardCheck className={res ? "text-good" : "text-faint"} />}
      title={a.title}
      meta={
        <>
          {pluralize(a.questionCount, "question")}
          {a.timeLimitSeconds ? ` · ${Math.round(a.timeLimitSeconds / 60)} min` : ""}
          {res ? ` · Best ${scoreText(res.bestScore, res.maxScore)}` : ""}
        </>
      }
      aside={<span className="hidden text-xs font-medium text-accent sm:inline">{res ? "Retake" : "Start"}</span>}
    />
  );
}

function OutlineStage({ unit }: { unit: UnitNode }) {
  return (
    <div className="flex items-center gap-3.5 rounded-card border border-dashed border-line px-5 py-3 sm:px-6">
      <span
        aria-hidden="true"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-sunken font-display text-base font-semibold text-faint tabular-nums"
      >
        {unit.number}
      </span>
      <p className="min-w-0 flex-1 text-sm text-ink-2">
        <span className="sr-only">Unit {unit.number}: </span>
        {unit.title}
      </p>
      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted">
        <Lock aria-hidden="true" className="size-3" />
        Lessons coming later
      </span>
    </div>
  );
}
