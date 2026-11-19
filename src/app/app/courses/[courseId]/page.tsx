import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronDown, Lock, Target } from "lucide-react";
import { CATEGORY_LABELS } from "@content/index";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  Section,
  pluralize,
} from "@/components/ui";
import { AddCourseButton } from "@/components/student/AddCourseButton";
import {
  ContentStatusBadge,
  ExternalLink,
} from "@/components/student/Bits";
import { CheckpointStep, CourseRoadmap } from "@/components/student/CourseRoadmap";
import { NextStepCard, practiceForLesson } from "@/components/student/NextStepCard";
import { nextStepFor } from "@/components/student/roadmap";
import { requireStudent } from "@/modules/auth/session";
import { CONTENT_STATUS_LABEL, getCatalog, getCourseTree, type CourseTree } from "@/modules/curriculum/queries";
import { getCourseOverview, getEnrolledCourses } from "@/modules/learning/overview";

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
  const canAdd = !enrolment && course.availability === "active" && ENROLLABLE.has(course.contentStatus);
  const hasLessons = tree.units.some((u) => u.status === "available");

  const header = (
    <PageHeader
      breadcrumbs={[{ label: "My courses", href: "/app/courses" }, { label: course.name }]}
      eyebrow={
        enrolment
          ? enrolment.className
            ? `Your class · ${enrolment.className}`
            : "In my courses · learning on your own"
          : (CATEGORY_LABELS[course.category] ?? course.category)
      }
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

  const about = <CourseSourceNote tree={tree} />;

  if (!hasLessons) {
    const catalog = await getCatalog();
    const pilots = catalog.filter((c) => c.lessonCount > 0 && c.id !== course.id);
    return (
      <>
        {header}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card padded={false} as="section" aria-labelledby="outline-title" className="lg:col-span-2">
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
                  See the <ExternalLink href={course.sourceUrl}>College Board course page</ExternalLink> for how
                  this course is organised.
                </p>
              )}
            </CardBody>
          </Card>
          <div className="space-y-5">
            <Card as="aside" aria-label="Courses with lessons" className="h-fit">
              <h2 className="font-display text-base font-semibold text-ink">Want to start learning now?</h2>
              <p className="mt-1 text-sm text-muted">These pilot courses have lessons, practice and quizzes today.</p>
              <ul className="mt-4 space-y-2">
                {pilots.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/app/courses/${p.id}`}
                      className="group flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2.5 text-sm transition-colors hover:border-line-strong hover:bg-surface-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">{p.name}</span>
                        <span className="block text-xs text-muted">{pluralize(p.lessonCount, "lesson")}</span>
                      </span>
                      <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-faint group-hover:text-ink-2" />
                    </Link>
                  </li>
                ))}
              </ul>
              <ButtonLink href="/app/courses/browse?lessons=1" variant="link" size="sm" className="mt-4">
                All courses with lessons
              </ButtonLink>
            </Card>
            {about}
          </div>
        </div>
      </>
    );
  }

  const o = await getCourseOverview(actor, user.id, course.id);
  const step = nextStepFor(tree, o);
  const nextLessonId = step && step.mode !== "done" ? step.lesson.id : null;
  const exercises = tree.assessments.filter((a) => a.kind === "exercise");
  const exercisesTried = exercises.filter((a) => o.assessmentResults.has(a.id)).length;
  const openAssignments = o.assignments.filter((a) => !a.done);
  const courseLevelAssessments = tree.assessments.filter((a) => !a.unitId);

  return (
    <>
      {header}

      {step ? <NextStepCard step={step} practice={step.mode === "done" ? null : practiceForLesson(tree, step.lesson.id)} className="mb-8" /> : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <section aria-labelledby="roadmap-title" className="min-w-0">
          <div className="mb-4">
            <h2 id="roadmap-title" className="font-display text-xl font-semibold tracking-[-0.01em] text-ink">
              Roadmap
            </h2>
            <p className="mt-1 text-sm text-muted">Read a lesson, then practise it. Open any unit to see its topics.</p>
          </div>
          <CourseRoadmap o={o} nextLessonId={nextLessonId} />

          {courseLevelAssessments.length ? (
            <Section title="Full-course practice" id="exam-practice">
              <Card padded={false} className="overflow-hidden">
                <ol className="divide-y divide-line">
                  {courseLevelAssessments.map((a) => (
                    <li key={a.id}>
                      <CheckpointStep assessment={a} o={o} />
                    </li>
                  ))}
                </ol>
              </Card>
            </Section>
          ) : null}

          <details className="group mt-10">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
              About this course
              <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-3 max-w-xl">{about}</div>
          </details>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start" aria-label="Your progress">
          <Card as="section" aria-labelledby="progress-title">
            <h2 id="progress-title" className="text-sm font-semibold text-ink">
              Your progress
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted">Lessons read</dt>
                <dd className="mt-0.5 font-display text-2xl font-semibold text-ink tabular-nums">
                  {o.lessonsCompleted}
                  <span className="text-sm font-normal text-muted">/{o.lessonsTotal}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Practice sets tried</dt>
                <dd className="mt-0.5 font-display text-2xl font-semibold text-ink tabular-nums">
                  {exercisesTried}
                  <span className="text-sm font-normal text-muted">/{exercises.length}</span>
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted">Skills at Proficient or better</dt>
                <dd className="mt-0.5 font-display text-2xl font-semibold text-ink tabular-nums">
                  {o.rollups.course.proficientOrBetter}
                  <span className="text-sm font-normal text-muted">/{o.rollups.course.totalSkills}</span>
                </dd>
              </div>
            </dl>
            <Link href="/app/progress" className="mt-4 inline-block text-xs text-accent underline underline-offset-4">
              Skill-by-skill progress
            </Link>
          </Card>

          {enrolment?.via === "class" ? (
            <Card as="section" aria-labelledby="class-title">
              <h2 id="class-title" className="text-sm font-semibold text-ink">
                {enrolment.className}
              </h2>
              <p className="mt-1 text-xs text-muted">
                {openAssignments.length
                  ? `${pluralize(openAssignments.length, "open assignment")} from your teacher.`
                  : "No open assignments right now."}
              </p>
              <ButtonLink href="/app/assignments" variant="link" size="sm" className="mt-2">
                See assignments
              </ButtonLink>
            </Card>
          ) : null}
        </aside>
      </div>
    </>
  );
}

function CourseSourceNote({ tree }: { tree: CourseTree }) {
  const { course, version } = tree;
  const status = CONTENT_STATUS_LABEL[course.contentStatus];
  return (
    <section aria-labelledby="about-title" className="rounded-card border border-line bg-surface-2 px-5 py-4 text-sm">
      <h2 id="about-title" className="text-sm font-semibold text-ink">
        About this course
      </h2>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ContentStatusBadge status={course.contentStatus} />
        {course.availability === "upcoming" ? <Badge tone="warn">Upcoming</Badge> : null}
      </div>
      <p className="mt-2 text-xs text-muted">{status.description}</p>
      {course.availability === "upcoming" && course.availabilityNote ? (
        <p className="mt-2 text-xs font-medium text-warn">{course.availabilityNote}</p>
      ) : null}
      <p className="mt-2 text-xs leading-relaxed text-muted">
        <span className="font-medium text-ink-2">{version.label}.</span> {version.alignmentNotes}{" "}
        <ExternalLink href={version.alignmentSourceUrl}>Alignment source</ExternalLink>
        {version.alignmentSourceUrl !== course.sourceUrl ? (
          <>
            {" · "}
            <ExternalLink href={course.sourceUrl}>College Board course page</ExternalLink>
          </>
        ) : null}
      </p>
    </section>
  );
}
