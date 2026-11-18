import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Users } from "lucide-react";
import { ButtonLink, Card, CardBody, CardHeader, PageHeader, Section, formatRelativeTime, pluralize } from "@/components/ui";
import { CompletionMeter, ContentStatusBadge, MasteryOverview } from "@/components/student/Bits";
import { JoinClassForm } from "@/components/student/JoinClassForm";
import { NEXT_STEP_ACTION, NEXT_STEP_EYEBROW, nextStepFor } from "@/components/student/roadmap";
import { requireStudent } from "@/modules/auth/session";
import { getCatalog } from "@/modules/curriculum/queries";
import { getCourseOverview, getEnrolledCourses, type CourseOverview, type EnrolledCourse } from "@/modules/learning/overview";

export const metadata: Metadata = { title: "My courses" };

export default async function MyCoursesPage() {
  const user = await requireStudent();
  const actor = { id: user.id, role: user.role };
  const now = new Date();
  const enrolled = await getEnrolledCourses(actor, user.id);
  const catalog = await getCatalog();
  const enrolledIds = new Set(enrolled.map((e) => e.courseId));
  const ready = catalog.filter((c) => c.lessonCount > 0 && c.availability === "active" && !enrolledIds.has(c.id));

  // Sequential on purpose: the embedded database is a single connection.
  const data: { course: EnrolledCourse; o: CourseOverview | null }[] = [];
  for (const course of enrolled) {
    const hasLessons = (catalog.find((c) => c.id === course.courseId)?.lessonCount ?? 0) > 0;
    data.push({ course, o: hasLessons ? await getCourseOverview(actor, user.id, course.courseId, now) : null });
  }

  return (
    <>
      <PageHeader
        title="My courses"
        description={
          enrolled.length
            ? `${pluralize(enrolled.length, "course")} you're taking, through a class or on your own. Open one to see its roadmap.`
            : "You haven't added a course yet. Join your class with a code, or pick a course to learn on your own."
        }
        actions={
          <ButtonLink href="/app/courses/browse" variant="secondary" icon={<Compass aria-hidden="true" className="size-4" />}>
            Browse all {catalog.length} AP courses
          </ButtonLink>
        }
      />

      {data.length ? (
        <ul className="grid gap-5 lg:grid-cols-2" aria-label="My courses">
          {data.map(({ course, o }) => (
            <li key={course.courseId}>
              <MyCourseCard course={course} o={o} now={now} />
            </li>
          ))}
        </ul>
      ) : null}

      {ready.length ? (
        <Section
          title={enrolled.length ? "More courses with lessons" : "Courses you can start today"}
          id="ready"
          description="These courses have lessons, practice and quizzes now. Open one and add it to your courses."
        >
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ready.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/app/courses/${c.id}`}
                  className="group flex h-full items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3.5 shadow-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-line-strong"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{c.name}</span>
                    <span className="block text-xs text-muted">
                      {pluralize(c.lessonCount, "lesson")} · {pluralize(c.unitCount, "unit")}
                    </span>
                  </span>
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink-2" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Join a class" id="join" description="Have a code from your teacher? Its course and assignments appear here once you join.">
        <Card padded={false} className="max-w-xl">
          <CardHeader
            titleAs="h3"
            title={
              <span className="inline-flex items-center gap-2">
                <Users aria-hidden="true" className="size-4 text-faint" />
                Enter a class code
              </span>
            }
          />
          <CardBody>
            <JoinClassForm idPrefix="courses-join" />
          </CardBody>
        </Card>
      </Section>
    </>
  );
}

function MyCourseCard({ course, o, now }: { course: EnrolledCourse; o: CourseOverview | null; now: Date }) {
  const href = `/app/courses/${course.courseId}`;
  const step = o ? nextStepFor(o.tree, o) : null;
  const titleId = `course-${course.courseId}-title`;
  return (
    <Card as="article" aria-labelledby={titleId} padded={false} className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
        <div className="min-w-0">
          <h2 id={titleId} className="font-display text-lg font-semibold leading-snug text-ink">
            <Link href={href} className="underline-offset-4 hover:underline">
              {course.name}
            </Link>
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {course.className ? `Class: ${course.className}` : "Learning on your own"}
            {course.lastActivityAt ? ` · active ${formatRelativeTime(course.lastActivityAt, now)}` : ""}
          </p>
        </div>
        <ContentStatusBadge status={course.contentStatus} className="shrink-0" />
      </div>

      {o ? (
        <div className="grid gap-5 px-5 pt-5 sm:grid-cols-2 sm:px-6">
          <CompletionMeter completed={o.lessonsCompleted} total={o.lessonsTotal} size="sm" />
          <MasteryOverview rollup={o.rollups.course} label={`${course.name} skill mastery`} size="sm" showLevel={false} />
        </div>
      ) : (
        <p className="px-5 pt-4 text-sm text-muted sm:px-6">This course has its official outline only; AceAP lessons are coming later.</p>
      )}

      <div className="mt-auto px-5 pb-5 pt-5 sm:px-6">
        {step ? (
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-accent">{NEXT_STEP_EYEBROW[step.mode]}</p>
              <p className="mt-0.5 truncate text-sm font-medium text-ink">
                <span className="mr-1.5 font-mono text-xs text-muted tabular-nums">{step.number}</span>
                {step.lesson.title}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <ButtonLink href={`/app/learn/${step.lesson.id}`} size="sm" aria-label={`${NEXT_STEP_ACTION[step.mode]}: ${step.lesson.title}`}>
                {NEXT_STEP_ACTION[step.mode]}
              </ButtonLink>
              <ButtonLink href={href} size="sm" variant="secondary" aria-label={`Open the ${course.name} roadmap`}>
                Roadmap
              </ButtonLink>
            </div>
          </div>
        ) : (
          <ButtonLink href={href} size="sm" variant="secondary">
            Open course
          </ButtonLink>
        )}
      </div>
    </Card>
  );
}
