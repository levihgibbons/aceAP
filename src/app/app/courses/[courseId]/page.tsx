import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, ChevronDown, Lock, Target } from "lucide-react";
import { CATEGORY_LABELS } from "@content/index";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  MasteryBadge,
  MasteryLegend,
  PageHeader,
  Section,
  StatusBadge,
  pluralize,
} from "@/components/ui";
import { AddCourseButton } from "@/components/student/AddCourseButton";
import {
  CompletionMeter,
  ContentStatusBadge,
  ExternalLink,
  MasteryOverview,
  MiniLabel,
} from "@/components/student/Bits";
import { AssessmentList } from "@/components/student/AssessmentList";
import { RecommendationItem } from "@/components/student/RecommendationItem";
import { lessonReadingLabel, lessonStatusFor } from "@/components/student/status";
import { requireStudent } from "@/modules/auth/session";
import {
  CONTENT_STATUS_LABEL,
  getCatalog,
  getCourseTree,
  type CourseTree,
  type UnitNode,
} from "@/modules/curriculum/queries";
import {
  getCourseOverview,
  getEnrolledCourses,
  type CourseOverview,
} from "@/modules/learning/overview";

type Params = { params: Promise<{ courseId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { courseId } = await params;
  const tree = await getCourseTree(courseId);
  return { title: tree?.course.name ?? "Course not found" };
}

const ENROLLABLE = new Set(["pilot_available", "complete", "lessons_in_development"]);

export default async function CoursePage({ params }: Params) {
  const user = await requireStudent();
  const actor = { id: user.id, role: user.role };
  const { courseId } = await params;
  const tree = await getCourseTree(courseId);
  if (!tree) notFound();
  const { course } = tree;

  const enrolled = await getEnrolledCourses(actor, user.id);
  const enrolment = enrolled.find((e) => e.courseId === course.id) ?? null;
  const canAdd =
    !enrolment && course.availability === "active" && ENROLLABLE.has(course.contentStatus);
  const hasLessons = tree.units.some((u) => u.status === "available");

  const header = (
    <PageHeader
      breadcrumbs={[{ label: "Courses", href: "/app/courses" }, { label: course.name }]}
      eyebrow={CATEGORY_LABELS[course.category] ?? course.category}
      title={course.name}
      description={course.description}
      actions={
        <>
          {canAdd ? <AddCourseButton courseId={course.id} courseName={course.name} /> : null}
          {hasLessons ? (
            <ButtonLink
              href={`/app/exam-prep/${course.id}`}
              variant="secondary"
              icon={<Target aria-hidden="true" className="size-4" />}
            >
              Exam prep
            </ButtonLink>
          ) : null}
        </>
      }
    />
  );

  const about = (
    <CourseSourceNote
      tree={tree}
      enrolledVia={enrolment ? (enrolment.className ?? "Learning independently") : null}
    />
  );

  if (!hasLessons) {
    const catalog = await getCatalog();
    const pilots = catalog.filter((c) => c.lessonCount > 0 && c.id !== course.id);
    return (
      <>
        {header}
        {about}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card
            padded={false}
            as="section"
            aria-labelledby="outline-title"
            className="lg:col-span-2"
          >
            <CardHeader
              titleAs="h2"
              titleId="outline-title"
              title={tree.units.length ? "Official unit outline" : "What exists for this course"}
              description={
                tree.units.length
                  ? "Unit titles as College Board lists them. AceAP hasn't written lessons for these units yet, so there's nothing to open."
                  : "College Board doesn't list titled units for this course, and AceAP has no lessons for it yet."
              }
            />
            <CardBody>
              {tree.units.length ? (
                <ol className="divide-y divide-line rounded-xl border border-line">
                  {tree.units.map((u) => (
                    <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="min-w-0 text-sm text-ink">
                        <span className="mr-2 tabular-nums text-muted">Unit {u.number}</span>
                        {u.title}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted">
                        <Lock aria-hidden="true" className="size-3" />
                        Outline only
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted">
                  See the{" "}
                  <ExternalLink href={course.sourceUrl}>College Board course page</ExternalLink> for
                  how this course is organised.
                </p>
              )}
            </CardBody>
          </Card>
          <Card as="aside" aria-label="Courses with lessons" className="h-fit">
            <h2 className="font-display text-base font-semibold text-ink">
              Want to start learning now?
            </h2>
            <p className="mt-1 text-sm text-muted">
              These pilot courses have lessons, practice and quizzes today.
            </p>
            <ul className="mt-4 space-y-2">
              {pilots.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/app/courses/${p.id}`}
                    className="group flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2.5 text-sm hover:border-line-strong hover:bg-surface-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{p.name}</span>
                      <span className="block text-xs text-muted">
                        {pluralize(p.lessonCount, "lesson")}
                      </span>
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-faint group-hover:text-ink-2"
                    />
                  </Link>
                </li>
              ))}
            </ul>
            <ButtonLink href="/app/courses?lessons=1" variant="link" size="sm" className="mt-4">
              All courses with lessons
            </ButtonLink>
          </Card>
        </div>
      </>
    );
  }

  const o = await getCourseOverview(actor, user.id, course.id);
  const top = o.recommendations[0] ?? null;
  const focusLesson =
    tree.lessonOrder.find((id) => o.lessonProgress.get(id)?.status === "in_progress") ??
    tree.lessonOrder.find((id) => o.lessonProgress.get(id)?.status !== "completed");
  const focusUnitId =
    (focusLesson && tree.lessons.get(focusLesson)?.unitId) ??
    tree.units.find((u) => u.status === "available")?.id;
  const courseLevelAssessments = tree.assessments.filter((a) => !a.unitId);

  return (
    <>
      {header}
      {about}

      <div className="mt-8 grid gap-5 lg:grid-cols-5">
        <Card as="section" aria-labelledby="mastery-title" className="lg:col-span-3">
          <MiniLabel>Mastery</MiniLabel>
          <h2 id="mastery-title" className="sr-only">
            Course mastery
          </h2>
          <MasteryOverview
            rollup={o.rollups.course}
            label={`${course.name} skill mastery`}
            showLegend
            untestedNote
          />
          <p className="mt-3 text-xs text-muted">
            Based only on graded answers across all {o.rollups.course.totalSkills} skills AceAP
            covers in this course.{" "}
            <Link
              href="/app/progress#how-mastery-works"
              className="text-accent underline underline-offset-4"
            >
              How mastery works
            </Link>
          </p>
        </Card>
        <Card as="section" aria-labelledby="completion-title" className="lg:col-span-2">
          <MiniLabel>Completion</MiniLabel>
          <h2 id="completion-title" className="sr-only">
            Lesson completion
          </h2>
          <CompletionMeter completed={o.lessonsCompleted} total={o.lessonsTotal} />
          <p className="mt-3 text-xs text-muted">
            Finishing a lesson is progress, not proof of mastery. Mastery comes from your answers.
          </p>
        </Card>
      </div>

      {top ? (
        <Section title="Recommended next" id="next">
          <Card>
            <RecommendationItem rec={top} emphasis />
          </Card>
        </Section>
      ) : null}

      <Section
        title="Units"
        id="units"
        description="Work through the guided path in order, or jump to any topic. Nothing is locked."
        action={<MasteryLegend className="hidden md:flex" />}
      >
        <ol className="space-y-4">
          {tree.units.map((u) => (
            <li key={u.id}>
              {u.status === "available" ? (
                <AvailableUnit unit={u} o={o} open={u.id === focusUnitId} />
              ) : (
                <OutlineUnit unit={u} />
              )}
            </li>
          ))}
        </ol>
      </Section>

      {courseLevelAssessments.length ? (
        <Section
          title="Exam practice"
          id="exam-practice"
          action={
            <ButtonLink href={`/app/exam-prep/${course.id}`} variant="link" size="sm">
              Exam prep overview
            </ButtonLink>
          }
        >
          <Card className="py-2 sm:py-2">
            <AssessmentList assessments={courseLevelAssessments} o={o} />
          </Card>
        </Section>
      ) : null}
    </>
  );
}

function CourseSourceNote({ tree, enrolledVia }: { tree: CourseTree; enrolledVia: string | null }) {
  const { course, version } = tree;
  const status = CONTENT_STATUS_LABEL[course.contentStatus];
  return (
    <div className="-mt-3 flex flex-col gap-3 rounded-card border border-line bg-surface-2 px-4 py-3.5 text-sm sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <ContentStatusBadge status={course.contentStatus} />
        {course.availability === "upcoming" ? <Badge tone="warn">Upcoming</Badge> : null}
        {enrolledVia ? <Badge tone="good">In my courses · {enrolledVia}</Badge> : null}
        <span className="text-muted">{status.description}</span>
      </div>
      {course.availability === "upcoming" && course.availabilityNote ? (
        <p className="font-medium text-warn">{course.availabilityNote}</p>
      ) : null}
      <p className="text-xs leading-relaxed text-muted">
        <span className="font-medium text-ink-2">{version.label}.</span> {version.alignmentNotes}{" "}
        <ExternalLink href={version.alignmentSourceUrl}>Alignment source</ExternalLink>
        {version.alignmentSourceUrl !== course.sourceUrl ? (
          <>
            {" · "}
            <ExternalLink href={course.sourceUrl}>College Board course page</ExternalLink>
          </>
        ) : null}
      </p>
    </div>
  );
}

function OutlineUnit({ unit }: { unit: UnitNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-dashed border-line-strong bg-surface-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">Unit {unit.number}</p>
        <h3 className="font-display text-base font-semibold text-ink-2">{unit.title}</h3>
      </div>
      <p className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted">
        <Lock aria-hidden="true" className="size-3.5" />
        Outline only — lessons not yet available
      </p>
    </div>
  );
}

function AvailableUnit({ unit, o, open }: { unit: UnitNode; o: CourseOverview; open: boolean }) {
  const href = `/app/courses/${o.tree.course.id}/units/${unit.slug}`;
  const r = o.rollups.units.get(unit.id);
  const lessons = unit.topics.flatMap((t) => t.lessons);
  const finished = lessons.filter((l) => o.lessonProgress.get(l.id)?.status === "completed").length;
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="grid gap-4 px-5 pt-5 sm:px-6 md:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <p className="text-xs font-medium text-accent">Unit {unit.number}</p>
          <h3 className="font-display text-lg font-semibold leading-snug text-ink">
            <Link href={href} className="hover:underline underline-offset-4">
              {unit.title}
            </Link>
          </h3>
          {unit.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted">{unit.description}</p>
          ) : null}
          <p className="mt-2 text-xs text-muted">
            {pluralize(finished, "lesson")} of {lessons.length} finished ·{" "}
            {pluralize(unit.skillIds.length, "skill")}
          </p>
        </div>
        {r ? (
          <MasteryOverview rollup={r} label={`Unit ${unit.number} skill mastery`} size="sm" />
        ) : null}
      </div>
      <details open={open} className="group mt-4 border-t border-line">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-3 text-sm font-medium text-ink-2 hover:bg-surface-2 sm:px-6 [&::-webkit-details-marker]:hidden">
          <span>
            {pluralize(unit.topics.length, "topic")}, {pluralize(lessons.length, "lesson")} and{" "}
            {pluralize(unit.assessments.length, "quiz or test", "quizzes and tests")}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 text-faint transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="space-y-6 border-t border-line bg-surface-2/60 px-5 py-5 sm:px-6">
          {unit.topics.map((topic) => (
            <div key={topic.id}>
              <h4 className="text-sm font-semibold text-ink">
                <Link
                  href={`${href}#topic-${topic.id}`}
                  className="hover:underline underline-offset-4"
                >
                  {topic.title}
                </Link>
              </h4>
              {topic.lessons.length ? (
                <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-surface">
                  {topic.lessons.map((l) => {
                    const reading = lessonReadingLabel(l.id, o);
                    return (
                      <li key={l.id}>
                        <Link
                          href={`/app/learn/${l.id}`}
                          className="group/l flex items-center gap-3 px-3.5 py-3 hover:bg-surface-2"
                        >
                          <BookOpen aria-hidden="true" className="size-4 shrink-0 text-faint" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-ink group-hover/l:underline underline-offset-4">
                              {l.title}
                            </span>
                            <span className="block text-xs text-muted">
                              ~{l.estMinutes} min{reading ? ` · ${reading}` : ""}
                            </span>
                          </span>
                          <StatusBadge status={lessonStatusFor(l, o)} size="sm" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {topic.skillIds.length ? (
                <ul aria-label={`Skills in ${topic.title}`} className="mt-2.5 flex flex-wrap gap-2">
                  {topic.skillIds.map((id) => {
                    const s = o.states.get(id);
                    return (
                      <li key={id}>
                        <Link
                          href={`/app/skills/${id}`}
                          className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-xs text-ink-2 hover:border-line-strong hover:text-ink"
                        >
                          <MasteryBadge
                            level={s?.level ?? "not_started"}
                            needsReview={s?.needsReview}
                            size="sm"
                            showLabel={false}
                          />
                          <span>{o.tree.skills.get(id)?.name ?? id}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ))}
          {unit.assessments.length ? (
            <div>
              <h4 className="text-sm font-semibold text-ink">Quizzes and tests</h4>
              <div className="mt-2 rounded-xl border border-line bg-surface px-3.5">
                <AssessmentList assessments={unit.assessments} o={o} />
              </div>
            </div>
          ) : null}
          <ButtonLink
            href={href}
            variant="secondary"
            size="sm"
            iconRight={<ArrowRight aria-hidden="true" className="size-3.5" />}
          >
            Open unit {unit.number}
          </ButtonLink>
        </div>
      </details>
    </Card>
  );
}
