import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronDown, Lock, RotateCcw } from "lucide-react";
import {
  ButtonLink,
  Card,
  EmptyState,
  MasteryBadge,
  PageHeader,
  Section,
  pluralize,
} from "@/components/ui";
import { CompletionMeter, MasteryOverview, MiniLabel } from "@/components/student/Bits";
import { UnitPathList } from "@/components/student/CourseRoadmap";
import { NEXT_STEP_ACTION, unitLessons } from "@/components/student/roadmap";
import { requireStudent } from "@/modules/auth/session";
import { getCourseTree } from "@/modules/curriculum/queries";
import { getCourseOverview } from "@/modules/learning/overview";

type Params = { params: Promise<{ courseId: string; unitSlug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { courseId, unitSlug } = await params;
  const tree = await getCourseTree(courseId);
  const unit = tree?.units.find((u) => u.slug === unitSlug);
  return {
    title: unit && tree ? `Unit ${unit.number}: ${unit.title} · ${tree.course.name}` : "Unit not found",
  };
}

export default async function UnitPage({ params }: Params) {
  const user = await requireStudent();
  const { courseId, unitSlug } = await params;
  const tree = await getCourseTree(courseId);
  const unit = tree?.units.find((u) => u.slug === unitSlug);
  if (!tree || !unit) notFound();
  const course = tree.course;
  const courseHref = `/app/courses/${course.id}`;
  const breadcrumbs = [
    { label: "My courses", href: "/app/courses" },
    { label: course.name, href: courseHref },
    { label: `Unit ${unit.number}` },
  ];

  if (unit.status !== "available") {
    const available = tree.units.filter((u) => u.status === "available");
    return (
      <>
        <PageHeader breadcrumbs={breadcrumbs} eyebrow={`Unit ${unit.number}`} title={unit.title} description={`Part of ${course.name}.`} />
        <EmptyState
          icon={<Lock />}
          title="Outline only — lessons not yet available"
          description={
            <>
              This unit title comes from College Board&apos;s official course outline. AceAP hasn&apos;t written lessons,
              practice or quizzes for it yet, so there&apos;s nothing to study here and nothing counts toward your mastery.
            </>
          }
          action={
            <>
              {available[0] ? (
                <ButtonLink href={`${courseHref}/units/${available[0].slug}`}>
                  Go to Unit {available[0].number}: {available[0].title}
                </ButtonLink>
              ) : null}
              <ButtonLink href={courseHref} variant="secondary">
                Back to {course.name}
              </ButtonLink>
            </>
          }
        />
      </>
    );
  }

  const o = await getCourseOverview({ id: user.id, role: user.role }, user.id, course.id);
  const r = o.rollups.units.get(unit.id);
  const path = unitLessons(tree, unit.id);
  const finished = path.filter((l) => o.lessonProgress.get(l.id)?.status === "completed").length;
  const nextLesson =
    path.find((l) => o.lessonProgress.get(l.id)?.status === "in_progress") ??
    path.find((l) => o.lessonProgress.get(l.id)?.status !== "completed");
  const unitSkillSet = new Set(unit.skillIds);
  const dueHere = [
    ...new Set([
      ...o.reviewsDue.map((x) => x.skillId),
      ...[...o.states.values()].filter((s) => s.needsReview).map((s) => s.skillId),
    ]),
  ].filter((id) => unitSkillSet.has(id));
  const skillName = (id: string) => tree.skills.get(id)?.name ?? id;
  const objectiveCount = unit.topics.reduce((n, t) => n + t.objectives.length, 0);

  return (
    <>
      <PageHeader
        breadcrumbs={breadcrumbs}
        eyebrow={`${course.name} · Unit ${unit.number}`}
        title={unit.title}
        description={unit.description || undefined}
        actions={
          nextLesson ? (
            <ButtonLink href={`/app/learn/${nextLesson.id}`} iconRight={<ArrowRight aria-hidden="true" className="size-4" />}>
              {o.lessonProgress.has(nextLesson.id) ? NEXT_STEP_ACTION.resume : finished > 0 ? "Next lesson" : "Start unit"}
            </ButtonLink>
          ) : (
            <ButtonLink href={`/app/review/${course.id}`} variant="secondary" icon={<RotateCcw aria-hidden="true" className="size-4" />}>
              Review
            </ButtonLink>
          )
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <section aria-labelledby="lessons-title">
            <h2 id="lessons-title" className="font-display text-xl font-semibold tracking-[-0.01em] text-ink">
              Learn and practise
            </h2>
            <p className="mt-1 text-sm text-muted">Each topic&apos;s lessons, then exercises to apply them, then quizzes. Open anything at any time.</p>
            <Card padded={false} className="mt-4 overflow-hidden">
              <UnitPathList unit={unit} o={o} nextLessonId={nextLesson?.id ?? null} />
            </Card>
          </section>

          <Section
            title="Skills and practice"
            id="skills"
            description="Each skill's level comes from your graded answers. Practice without hints counts the most."
          >
            <div className="space-y-5">
              {unit.topics.map((topic) => (
                <Card key={topic.id} as="section" aria-labelledby={`topic-${topic.id}-title`} padded={false} id={`topic-${topic.id}`} className="scroll-mt-24 overflow-hidden">
                  <h3 id={`topic-${topic.id}-title`} className="border-b border-line px-5 py-3.5 text-sm font-semibold text-ink sm:px-6">
                    {topic.title}
                  </h3>
                  <ul className="divide-y divide-line">
                    {topic.skillIds.map((id) => {
                      const s = o.states.get(id);
                      return (
                        <li key={id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-6">
                          <Link href={`/app/skills/${id}`} className="min-w-0 text-sm font-medium text-ink underline-offset-4 hover:underline">
                            {skillName(id)}
                          </Link>
                          <span className="flex items-center gap-2">
                            <MasteryBadge level={s?.level ?? "not_started"} needsReview={s?.needsReview} size="sm" />
                            <ButtonLink href={`/app/practice/${id}`} size="sm" variant="secondary" aria-label={`Practise ${skillName(id)}`}>
                              Practise
                            </ButtonLink>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              ))}
            </div>
          </Section>

          {objectiveCount ? (
            <details className="group mt-8 rounded-card border border-line bg-surface">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-5 py-3 text-sm font-semibold text-ink hover:bg-surface-2 sm:px-6 [&::-webkit-details-marker]:hidden">
                <span>Learning objectives ({objectiveCount})</span>
                <ChevronDown aria-hidden="true" className="size-4 text-faint transition-transform group-open:rotate-180" />
              </summary>
              <ul className="divide-y divide-line border-t border-line">
                {unit.topics.flatMap((topic) =>
                  topic.objectives.map((obj) => {
                    const or = o.rollups.objectives.get(obj.id);
                    return (
                      <li key={obj.id} className="grid gap-3 px-5 py-4 sm:px-6 md:grid-cols-[minmax(0,1fr)_14rem]">
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-muted">{obj.code}</p>
                          <p className="mt-0.5 text-sm leading-snug text-ink">{obj.description}</p>
                          <p className="mt-1 text-xs text-muted">Skills: {obj.skillIds.map(skillName).join(", ")}</p>
                        </div>
                        {or ? <MasteryOverview rollup={or} label={`${obj.code} skill mastery`} size="sm" /> : null}
                      </li>
                    );
                  }),
                )}
              </ul>
            </details>
          ) : null}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start" aria-label="Unit progress">
          <Card as="section" aria-labelledby="unit-progress-title">
            <h2 id="unit-progress-title" className="text-sm font-semibold text-ink">
              Unit {unit.number} progress
            </h2>
            <div className="mt-4 space-y-5">
              <div>
                <MiniLabel>Lessons</MiniLabel>
                <CompletionMeter completed={finished} total={path.length} size="sm" />
              </div>
              {r ? (
                <div>
                  <MiniLabel>Mastery</MiniLabel>
                  <MasteryOverview rollup={r} label={`Unit ${unit.number} skill mastery`} size="sm" untestedNote />
                </div>
              ) : null}
            </div>
          </Card>

          <Card as="section" aria-labelledby="review-title">
            <h2 id="review-title" className="flex items-center gap-2 text-sm font-semibold text-ink">
              <RotateCcw aria-hidden="true" className="size-4 text-faint" />
              Review
            </h2>
            <p className="mt-1 text-sm text-muted">
              {dueHere.length
                ? `${pluralize(dueHere.length, "skill")} in this unit ${dueHere.length === 1 ? "is" : "are"} ready for review: ${dueHere.map(skillName).join(", ")}.`
                : "Nothing in this unit is due for review. Mixed review still helps keep skills fresh."}
            </p>
            <ButtonLink href={`/app/review/${course.id}`} variant="secondary" size="sm" className="mt-3">
              Start course review
            </ButtonLink>
          </Card>

          <ButtonLink href={courseHref} variant="link" size="sm">
            Back to the {course.name} roadmap
          </ButtonLink>
        </aside>
      </div>
    </>
  );
}
