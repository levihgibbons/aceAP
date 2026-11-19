import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  Compass,
  Dumbbell,
  RotateCcw,
} from "lucide-react";
import { asUser } from "@/db/client";
import {
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  Section,
  pluralize,
} from "@/components/ui";
import { AssignmentList } from "@/components/student/AssignmentList";
import {
  CompletionMeter,
} from "@/components/student/Bits";
import { firstName } from "@/components/student/format";
import { JoinClassForm } from "@/components/student/JoinClassForm";
import { RecommendationItem } from "@/components/student/RecommendationItem";
import { practiceForLesson } from "@/components/student/NextStepCard";
import { requireStudent } from "@/modules/auth/session";
import { getCatalog } from "@/modules/curriculum/queries";
import {
  getCourseOverview,
  getEnrolledCourses,
  listStudentAssignments,
  type CourseOverview,
  type EnrolledCourse,
} from "@/modules/learning/overview";

export const metadata: Metadata = { title: "Home" };

interface CourseData {
  course: EnrolledCourse;
  o: CourseOverview;
}

/** Most recent lesson activity → what to resume (or what comes next). */
function continueTarget(data: CourseData[]) {
  let latest: {
    d: CourseData;
    lessonId: string;
    at: Date;
    status: "in_progress" | "completed";
  } | null = null;
  for (const d of data) {
    for (const [lessonId, p] of d.o.lessonProgress) {
      if (!latest || p.updatedAt > latest.at)
        latest = { d, lessonId, at: p.updatedAt, status: p.status };
    }
  }
  if (!latest) {
    // Nothing opened yet: start the most recently active course with lessons.
    const d = data.find((x) => x.o.tree.lessonOrder.length > 0);
    if (!d) return null;
    return { d, lessonId: d.o.tree.lessonOrder[0], mode: "start" as const, at: null };
  }
  if (latest.status === "in_progress")
    return { d: latest.d, lessonId: latest.lessonId, mode: "resume" as const, at: latest.at };
  const order = latest.d.o.tree.lessonOrder;
  const after = order.slice(order.indexOf(latest.lessonId) + 1);
  const next = [...after, ...order].find(
    (id) => latest.d.o.lessonProgress.get(id)?.status !== "completed",
  );
  if (next)
    return {
      d: latest.d,
      lessonId: next,
      mode: latest.d.o.lessonProgress.has(next) ? ("resume" as const) : ("next" as const),
      at: latest.at,
    };
  return { d: latest.d, lessonId: latest.lessonId, mode: "done" as const, at: latest.at };
}

export default async function StudentHomePage() {
  const user = await requireStudent();
  const actor = { id: user.id, role: user.role };
  const now = new Date();
  const name = firstName(user.name);

  const enrolled = await getEnrolledCourses(actor, user.id);

  if (enrolled.length === 0) {
    const catalog = await getCatalog();
    const pilots = catalog.filter(
      (c) => c.contentStatus === "pilot_available" || c.contentStatus === "complete",
    );
    return (
      <>
        <PageHeader
          title={`Welcome, ${name}`}
          description="AceAP helps you learn AP courses one skill at a time, and shows exactly what your answers say you know. Start in one of two ways."
        />
        <div className="grid gap-5 md:grid-cols-2">
          <Card padded={false} as="section" aria-labelledby="join-title">
            <CardHeader
              titleAs="h2"
              titleId="join-title"
              title="Join your class"
              description="Have a code from your teacher? Enter it to see your class's course and assignments."
            />
            <CardBody>
              <JoinClassForm idPrefix="home-join" />
            </CardBody>
          </Card>
          <Card padded={false} as="section" aria-labelledby="browse-title">
            <CardHeader
              titleAs="h2"
              titleId="browse-title"
              title="Learn on your own"
              description="Pick a course with lessons and start right away. You can add more later."
            />
            <CardBody>
              {pilots.length ? (
                <ul className="space-y-2">
                  {pilots.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/app/courses/${c.id}`}
                        className="group flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 transition-colors hover:border-line-strong hover:bg-surface-2"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">{c.name}</span>
                          <span className="block text-xs text-muted">
                            {pluralize(c.lessonCount, "lesson")} available
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
              ) : null}
              <ButtonLink
                href="/app/courses"
                variant="secondary"
                className="mt-4"
                icon={<Compass aria-hidden="true" className="size-4" />}
              >
                Browse all {catalog.length} AP courses
              </ButtonLink>
            </CardBody>
          </Card>
        </div>
      </>
    );
  }

  // Sequential on purpose: PGlite is a single connection.
  const data: CourseData[] = [];
  for (const course of enrolled)
    data.push({ course, o: await getCourseOverview(actor, user.id, course.courseId, now) });
  const assignments = await asUser(actor, (tx) => listStudentAssignments(tx, user.id));

  const resume = continueTarget(data);
  const recs = data
    .flatMap((d) =>
      d.o.recommendations
        .filter((r) => r.kind !== "assignment")
        .map((r) => ({ r, courseName: d.course.name })),
    )
    .filter(({ r }) => !(resume && resume.mode !== "done" && r.href === `/app/learn/${resume.lessonId}`))
    .sort((a, b) => b.r.priority - a.r.priority)
    .slice(0, 3);
  const open = assignments
    .filter((a) => !a.done)
    .sort((a, b) => (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity));
  const reviews = data
    .map((d) => {
      const ids = [
        ...new Set([
          ...d.o.reviewsDue.map((r) => r.skillId),
          ...[...d.o.states.values()].filter((s) => s.needsReview).map((s) => s.skillId),
        ]),
      ].filter((id) => d.o.tree.skills.has(id));
      return { d, ids };
    })
    .filter((x) => x.ids.length > 0);
  const description =
    open.length === 0
      ? "Here's where you left off."
      : `${pluralize(open.length, "assignment")} open. Here's where you left off.`;

  return (
    <>
      <PageHeader title={`Welcome back, ${name}`} description={description} />

      {resume ? <ContinueCard resume={resume} /> : null}

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Section
          title="Today's learning"
          description="Picked from your answers."
          className="mt-0! lg:col-span-2"
          id="today"
        >
          {recs.length ? (
            <Card padded={false}>
              <ol className="divide-y divide-line">
                {recs.map(({ r, courseName }, i) => (
                  <li key={`${courseName}-${r.id}`} className="px-5 py-4 sm:px-6">
                    <RecommendationItem
                      rec={r}
                      courseName={data.length > 1 ? courseName : undefined}
                      emphasis={i === 0}
                    />
                  </li>
                ))}
              </ol>
            </Card>
          ) : (
            <EmptyState
              icon={<Compass />}
              title="Nothing pressing right now"
              description="Open a course to keep going at your own pace."
              action={
                <ButtonLink href="/app/courses" variant="secondary">
                  My courses
                </ButtonLink>
              }
            />
          )}
        </Section>

        <Section
          title="Due"
          id="assignments"
          className="mt-0!"
          action={
            assignments.length ? (
              <ButtonLink href="/app/assignments" variant="link" size="sm">
                All assignments
              </ButtonLink>
            ) : undefined
          }
        >
          <Card className="py-2 sm:py-2">
            {open.length ? (
              <AssignmentList assignments={open.slice(0, 3)} now={now} compact label="Open assignments" />
            ) : (
              <p className="flex items-start gap-2 py-3 text-sm text-muted">
                <ClipboardList aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-faint" />
                {assignments.length ? "Everything assigned is submitted." : "Nothing assigned yet."}
              </p>
            )}
            {reviews.length ? (
              <div className="border-t border-line py-3">
                {reviews.map(({ d, ids }) => (
                  <Link
                    key={d.course.courseId}
                    href={`/app/review/${d.course.courseId}`}
                    className="group flex items-center gap-2 py-1 text-sm text-ink"
                  >
                    <RotateCcw aria-hidden="true" className="size-4 shrink-0 text-accent" />
                    <span className="min-w-0 flex-1 underline-offset-4 group-hover:underline">
                      Review {pluralize(ids.length, "skill")}
                      {data.length > 1 ? ` · ${d.course.name}` : ""}
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
          </Card>
        </Section>
      </div>

      <Section title="My courses" id="my-courses">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map(({ course, o }) => (
            <li key={course.courseId}>
              <div className="group relative flex h-full flex-col rounded-card border border-line bg-surface p-4 shadow-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-line-strong">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-display font-semibold text-ink">
                      <Link
                        href={`/app/courses/${course.courseId}`}
                        className="underline-offset-4 after:absolute after:inset-0 after:rounded-card group-hover:underline"
                      >
                        {course.name}
                      </Link>
                    </h3>
                    <p className="truncate text-xs text-muted">{course.className ?? "Learning on your own"}</p>
                  </div>
                  <ArrowRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink-2" />
                </div>
                {o.rollups.course.totalSkills > 0 ? (
                  <CompletionMeter completed={o.lessonsCompleted} total={o.lessonsTotal} size="sm" className="mt-4" />
                ) : (
                  <p className="mt-4 text-xs text-muted">Outline only for now</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

function ContinueCard({ resume }: { resume: NonNullable<ReturnType<typeof continueTarget>> }) {
  const { d, lessonId, mode } = resume;
  const lesson = d.o.tree.lessons.get(lessonId);
  if (!lesson) return null;
  const unit = d.o.tree.units.find((u) => u.id === lesson.unitId);
  const practice = mode === "done" ? null : practiceForLesson(d.o.tree, lesson.id);
  const heading =
    mode === "resume"
      ? "Continue learning"
      : mode === "next"
        ? "Up next"
        : mode === "start"
          ? "Start here"
          : "Course path complete";
  const cta =
    mode === "resume" ? "Resume lesson" : mode === "done" ? "Revisit lesson" : "Start lesson";
  return (
    <section
      aria-labelledby="continue-title"
      className="animate-rise rounded-card border border-line bg-surface p-5 shadow-raised sm:p-6"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 gap-4">
          <span
            aria-hidden="true"
            className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink sm:inline-flex"
          >
            <BookOpen className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id="continue-title" className="text-[0.8125rem] font-medium text-accent">
              {heading}
            </h2>
            <p className="mt-1 font-display text-xl font-semibold leading-snug text-ink">
              {lesson.title}
            </p>
            <p className="mt-1 text-sm text-muted">
              <Link
                href={`/app/courses/${d.course.courseId}`}
                className="hover:text-ink hover:underline underline-offset-4"
              >
                {d.course.name}
              </Link>
              {unit ? (
                <>
                  <span aria-hidden="true"> · </span>
                  <Link
                    href={`/app/courses/${d.course.courseId}/units/${unit.slug}`}
                    className="hover:text-ink hover:underline underline-offset-4"
                  >
                    Unit {unit.number}: {unit.title}
                  </Link>
                </>
              ) : null}
              <span aria-hidden="true"> · </span>~{lesson.estMinutes} min
            </p>
            {mode === "done" ? (
              <p className="mt-2 text-sm text-muted">
                You&apos;ve finished every lesson in this course. Practice and review keep your
                skills strong.
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <ButtonLink
            href={`/app/learn/${lesson.id}`}
            size="lg"
            iconRight={<ArrowRight aria-hidden="true" className="size-4" />}
          >
            {cta}
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
      </div>
    </section>
  );
}
