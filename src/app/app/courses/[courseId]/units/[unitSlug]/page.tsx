import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Dumbbell, Lock, RotateCcw } from "lucide-react";
import {
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  MasteryBadge,
  PageHeader,
  Section,
  StatusBadge,
  pluralize,
} from "@/components/ui";
import { AssessmentList } from "@/components/student/AssessmentList";
import { CompletionMeter, MasteryOverview, MiniLabel } from "@/components/student/Bits";
import { lessonReadingLabel, lessonStatusFor } from "@/components/student/status";
import { requireStudent } from "@/modules/auth/session";
import { getCourseTree } from "@/modules/curriculum/queries";
import { getCourseOverview } from "@/modules/learning/overview";

type Params = { params: Promise<{ courseId: string; unitSlug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { courseId, unitSlug } = await params;
  const tree = await getCourseTree(courseId);
  const unit = tree?.units.find((u) => u.slug === unitSlug);
  return {
    title:
      unit && tree ? `Unit ${unit.number}: ${unit.title} · ${tree.course.name}` : "Unit not found",
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
    { label: "Courses", href: "/app/courses" },
    { label: course.name, href: courseHref },
    { label: `Unit ${unit.number}` },
  ];

  if (unit.status !== "available") {
    const available = tree.units.filter((u) => u.status === "available");
    return (
      <>
        <PageHeader
          breadcrumbs={breadcrumbs}
          eyebrow={`Unit ${unit.number}`}
          title={unit.title}
          description={`Part of ${course.name}.`}
        />
        <EmptyState
          icon={<Lock />}
          title="Outline only — lessons not yet available"
          description={
            <>
              This unit title comes from College Board&apos;s official course outline. AceAP
              hasn&apos;t written lessons, practice or quizzes for it yet, so there&apos;s nothing
              to study here and nothing counts toward your mastery.
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
  const path = tree.lessonOrder
    .map((id) => tree.lessons.get(id)!)
    .filter((l) => l && l.unitId === unit.id);
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

  return (
    <>
      <PageHeader
        breadcrumbs={breadcrumbs}
        eyebrow={`Unit ${unit.number}`}
        title={unit.title}
        description={unit.description || undefined}
        actions={
          nextLesson ? (
            <ButtonLink
              href={`/app/learn/${nextLesson.id}`}
              iconRight={<ArrowRight aria-hidden="true" className="size-4" />}
            >
              {o.lessonProgress.has(nextLesson.id)
                ? "Resume"
                : finished > 0
                  ? "Next lesson"
                  : "Start unit"}
            </ButtonLink>
          ) : (
            <ButtonLink
              href={`/app/review/${course.id}`}
              variant="secondary"
              icon={<RotateCcw aria-hidden="true" className="size-4" />}
            >
              Review
            </ButtonLink>
          )
        }
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <div className="grid gap-5 sm:grid-cols-5">
            <Card className="sm:col-span-3">
              <MiniLabel>Mastery</MiniLabel>
              {r ? (
                <MasteryOverview
                  rollup={r}
                  label={`Unit ${unit.number} skill mastery`}
                  showLegend
                  untestedNote
                />
              ) : null}
            </Card>
            <Card className="sm:col-span-2">
              <MiniLabel>Completion</MiniLabel>
              <CompletionMeter completed={finished} total={path.length} />
            </Card>
          </div>

          <Section
            title="Guided path"
            id="path"
            description="Lessons in the recommended order. You can open any of them at any time."
          >
            <Card padded={false}>
              <ol className="divide-y divide-line">
                {path.map((l, i) => {
                  const reading = lessonReadingLabel(l.id, o);
                  const isNext = nextLesson?.id === l.id;
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/app/learn/${l.id}`}
                        className="group flex items-center gap-4 px-5 py-4 hover:bg-surface-2 sm:px-6"
                      >
                        <span
                          aria-hidden="true"
                          className={
                            isNext
                              ? "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-on-accent"
                              : "inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-sm font-medium text-muted"
                          }
                        >
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-ink group-hover:underline underline-offset-4">
                            <span className="sr-only">Step {i + 1}: </span>
                            {l.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted">
                            ~{l.estMinutes} min{reading ? ` · ${reading}` : ""}
                            {isNext ? " · Up next" : ""}
                          </span>
                        </span>
                        <StatusBadge status={lessonStatusFor(l, o)} size="sm" />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </Card>
          </Section>

          <Section
            title="Topics and objectives"
            id="topics"
            description="Each objective rolls up its skills. Untested skills count as Not started."
          >
            <div className="space-y-5">
              {unit.topics.map((topic) => (
                <Card
                  key={topic.id}
                  as="section"
                  aria-labelledby={`topic-${topic.id}-title`}
                  padded={false}
                  id={`topic-${topic.id}`}
                  className="scroll-mt-24"
                >
                  <CardHeader
                    titleAs="h3"
                    titleId={`topic-${topic.id}-title`}
                    title={topic.title}
                    description={topic.description || undefined}
                  />
                  <CardBody className="space-y-5">
                    {topic.lessons.length ? (
                      <div>
                        <MiniLabel>Lessons</MiniLabel>
                        <ul className="flex flex-wrap gap-2">
                          {topic.lessons.map((l) => (
                            <li key={l.id}>
                              <Link
                                href={`/app/learn/${l.id}`}
                                className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:border-line-strong hover:bg-surface-2"
                              >
                                {l.title}
                                <StatusBadge status={lessonStatusFor(l, o)} size="sm" />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {topic.objectives.map((obj) => {
                      const or = o.rollups.objectives.get(obj.id);
                      return (
                        <div
                          key={obj.id}
                          className="rounded-xl border border-line bg-surface-2 p-4"
                        >
                          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_15rem]">
                            <div className="min-w-0">
                              <p className="font-mono text-xs text-muted">{obj.code}</p>
                              <h4 className="mt-0.5 text-sm font-medium leading-snug text-ink">
                                {obj.description}
                              </h4>
                            </div>
                            {or ? (
                              <MasteryOverview
                                rollup={or}
                                label={`${obj.code} skill mastery`}
                                size="sm"
                              />
                            ) : null}
                          </div>
                          <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
                            {obj.skillIds.map((id) => {
                              const s = o.states.get(id);
                              return (
                                <li
                                  key={id}
                                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                                >
                                  <Link
                                    href={`/app/skills/${id}`}
                                    className="min-w-0 text-sm font-medium text-ink hover:underline underline-offset-4"
                                  >
                                    {skillName(id)}
                                  </Link>
                                  <span className="flex items-center gap-2">
                                    <MasteryBadge
                                      level={s?.level ?? "not_started"}
                                      needsReview={s?.needsReview}
                                      size="sm"
                                    />
                                    <ButtonLink
                                      href={`/app/practice/${id}`}
                                      size="sm"
                                      variant="ghost"
                                      aria-label={`Practise ${skillName(id)}`}
                                    >
                                      Practise
                                    </ButtonLink>
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </CardBody>
                </Card>
              ))}
            </div>
          </Section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start" aria-label="Unit tools">
          <Card>
            <h2 className="text-sm font-semibold text-ink">Jump to a topic</h2>
            <nav aria-label="Topics in this unit" className="mt-3">
              <ul className="space-y-1">
                {unit.topics.map((t) => {
                  const tr = o.rollups.topics.get(t.id);
                  return (
                    <li key={t.id}>
                      <a
                        href={`#topic-${t.id}`}
                        className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
                      >
                        <span className="min-w-0 truncate">{t.title}</span>
                        {tr ? (
                          <MasteryBadge
                            level={tr.level}
                            needsReview={tr.needsReview > 0}
                            size="sm"
                            showLabel={false}
                          />
                        ) : null}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </Card>

          <Card>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Dumbbell aria-hidden="true" className="size-4 text-faint" />
              Unit practice
            </h2>
            <p className="mt-1 text-xs text-muted">
              Targeted questions on one skill. Answers without hints count the most.
            </p>
            <ul className="mt-3 space-y-1">
              {unit.skillIds.map((id) => {
                const s = o.states.get(id);
                return (
                  <li key={id}>
                    <Link
                      href={`/app/practice/${id}`}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
                    >
                      <span className="min-w-0 truncate">{skillName(id)}</span>
                      <MasteryBadge
                        level={s?.level ?? "not_started"}
                        needsReview={s?.needsReview}
                        size="sm"
                        showLabel={false}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-ink">Quizzes and tests</h2>
            {unit.assessments.length ? (
              <AssessmentList assessments={unit.assessments} o={o} />
            ) : (
              <p className="mt-2 text-sm text-muted">No quizzes for this unit yet.</p>
            )}
          </Card>

          <Card>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <RotateCcw aria-hidden="true" className="size-4 text-faint" />
              Review
            </h2>
            <p className="mt-1 text-sm text-muted">
              {dueHere.length
                ? `${pluralize(dueHere.length, "skill")} in this unit ${dueHere.length === 1 ? "is" : "are"} ready for review: ${dueHere.map(skillName).join(", ")}.`
                : "Nothing in this unit is due for review. Mixed review still helps keep skills fresh."}
            </p>
            <ButtonLink
              href={`/app/review/${course.id}`}
              variant="secondary"
              size="sm"
              className="mt-3"
            >
              Start course review
            </ButtonLink>
          </Card>
        </aside>
      </div>
    </>
  );
}
