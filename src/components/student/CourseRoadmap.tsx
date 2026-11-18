/**
 * The course roadmap: every unit in order as one vertical path. A unit with
 * lessons lists them as numbered steps (3.1, 3.2 …) with reading progress and
 * mastery, followed by its quizzes and tests as checkpoints. An outline-only
 * unit is a single muted row. Nothing is collapsed and nothing is locked.
 */
import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, CircleDot, ClipboardCheck, Lock } from "lucide-react";
import { Badge, StatusBadge, pluralize } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { AssessmentNode, LessonNode, UnitNode } from "@/modules/curriculum/queries";
import type { CourseOverview } from "@/modules/learning/overview";
import { ASSESSMENT_KIND_LABEL, scoreText } from "./format";
import { lessonStatusFor } from "./status";
import { unitLessons } from "./roadmap";

export function CourseRoadmap({ o, nextLessonId }: { o: CourseOverview; nextLessonId: string | null }) {
  const { tree } = o;
  return (
    <ol className="space-y-3" aria-label={`${tree.course.name} roadmap`}>
      {tree.units.map((unit) => (
        <li key={unit.id}>
          {unit.status === "available" ? (
            <UnitStage unit={unit} o={o} nextLessonId={nextLessonId} />
          ) : (
            <OutlineStage unit={unit} />
          )}
        </li>
      ))}
    </ol>
  );
}

function UnitStage({ unit, o, nextLessonId }: { unit: UnitNode; o: CourseOverview; nextLessonId: string | null }) {
  const lessons = unitLessons(o.tree, unit.id);
  const finished = lessons.filter((l) => o.lessonProgress.get(l.id)?.status === "completed").length;
  const r = o.rollups.units.get(unit.id);
  const href = `/app/courses/${o.tree.course.id}/units/${unit.slug}`;
  const titleId = `unit-${unit.id}-title`;
  return (
    <section aria-labelledby={titleId} className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <header className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-start gap-3.5">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft font-display text-base font-semibold text-accent-ink tabular-nums"
          >
            {unit.number}
          </span>
          <div className="min-w-0">
            <h3 id={titleId} className="font-display text-[1.0625rem] font-semibold leading-snug text-ink">
              <span className="sr-only">Unit {unit.number}: </span>
              {unit.title}
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              <span className="tabular-nums">
                {finished} of {pluralize(lessons.length, "lesson")}
              </span>{" "}
              finished
              {r ? (
                <>
                  {" · "}
                  <span className="tabular-nums">
                    {r.proficientOrBetter} of {pluralize(r.totalSkills, "skill")}
                  </span>{" "}
                  Proficient or better
                </>
              ) : null}
            </p>
          </div>
        </div>
        <Link
          href={href}
          className="group inline-flex min-h-10 shrink-0 items-center gap-1.5 self-start rounded-lg px-2 text-sm font-medium text-accent transition-colors hover:bg-accent-soft sm:self-auto"
        >
          Skills and practice
          <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </header>
      <ol className="divide-y divide-line">
        {lessons.map((l, i) => (
          <li key={l.id}>
            <LessonStep lesson={l} number={`${unit.number}.${i + 1}`} o={o} isNext={l.id === nextLessonId} />
          </li>
        ))}
        {unit.assessments.map((a) => (
          <li key={a.id}>
            <CheckpointStep assessment={a} o={o} />
          </li>
        ))}
      </ol>
    </section>
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
  o: Pick<CourseOverview, "states" | "lessonProgress">;
  isNext: boolean;
}) {
  const progress = o.lessonProgress.get(lesson.id)?.status;
  const Icon = progress === "completed" ? CheckCircle2 : progress === "in_progress" ? CircleDot : CircleDashed;
  const reading = progress === "completed" ? "Finished" : progress === "in_progress" ? "Started" : "Not opened";
  return (
    <Link
      href={`/app/learn/${lesson.id}`}
      className={cn(
        "group flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-surface-2 sm:px-6",
        isNext && "bg-accent-soft/40 hover:bg-accent-soft/60",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "size-5 shrink-0",
          progress === "completed" ? "text-good" : progress === "in_progress" ? "text-accent" : "text-faint",
        )}
      />
      <span aria-hidden="true" className="w-9 shrink-0 font-mono text-xs text-muted tabular-nums">
        {number}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-medium text-ink underline-offset-4 group-hover:underline">
          <span className="sr-only">Lesson {number}: </span>
          {lesson.title}
        </span>
        <span className="mt-0.5 block text-xs text-muted">
          ~{lesson.estMinutes} min · {reading}
        </span>
      </span>
      {isNext ? <Badge tone="info">Up next</Badge> : null}
      <StatusBadge status={lessonStatusFor(lesson, o)} size="sm" />
    </Link>
  );
}

export function CheckpointStep({ assessment: a, o }: { assessment: AssessmentNode; o: Pick<CourseOverview, "assessmentResults"> }) {
  const res = o.assessmentResults.get(a.id);
  return (
    <Link
      href={`/app/assessments/${a.id}`}
      className="group flex items-center gap-3.5 bg-surface-2/50 px-5 py-3.5 transition-colors hover:bg-surface-2 sm:px-6"
    >
      <ClipboardCheck aria-hidden="true" className={cn("size-5 shrink-0", res ? "text-good" : "text-faint")} />
      <span className="w-9 shrink-0 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">Check</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-medium text-ink underline-offset-4 group-hover:underline">{a.title}</span>
        <span className="mt-0.5 block text-xs text-muted">
          {ASSESSMENT_KIND_LABEL[a.kind] ?? a.kind} · {pluralize(a.questionCount, "question")}
          {a.timeLimitSeconds ? ` · ${Math.round(a.timeLimitSeconds / 60)} min` : ""}
          {res ? ` · Best ${scoreText(res.bestScore, res.maxScore)}` : " · Not taken yet"}
        </span>
      </span>
      <span className="hidden text-sm font-medium text-accent sm:inline">{res ? "Retake" : "Start"}</span>
    </Link>
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
