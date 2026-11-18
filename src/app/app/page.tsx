import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  Compass,
  NotebookPen,
  RotateCcw,
  Target,
  Users,
} from "lucide-react";
import { asUser } from "@/db/client";
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
  formatDate,
  formatRelativeTime,
  pluralize,
} from "@/components/ui";
import { AssignmentList } from "@/components/student/AssignmentList";
import {
  CompletionMeter,
  ContentStatusBadge,
  MasteryOverview,
  MiniLabel,
} from "@/components/student/Bits";
import { firstName, pct } from "@/components/student/format";
import { JoinClassForm } from "@/components/student/JoinClassForm";
import { RecommendationItem } from "@/components/student/RecommendationItem";
import { lessonStatusFor } from "@/components/student/status";
import { requireStudent } from "@/modules/auth/session";
import { getCatalog } from "@/modules/curriculum/queries";
import {
  getCourseOverview,
  getEnrolledCourses,
  listStudentAssignments,
  type CourseOverview,
  type EnrolledCourse,
} from "@/modules/learning/overview";
import { listNotes } from "@/modules/vault/service";

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
  const notes = await listNotes(actor, { limit: 4 });

  const resume = continueTarget(data);
  const recs = data
    .flatMap((d) =>
      d.o.recommendations
        .filter((r) => r.kind !== "assignment")
        .map((r) => ({ r, courseName: d.course.name })),
    )
    .sort((a, b) => b.r.priority - a.r.priority)
    .slice(0, 5);
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
  const strong = data
    .flatMap((d) =>
      [...d.o.states.values()]
        .filter((s) => s.level === "proficient" || s.level === "mastered")
        .map((s) => ({
          s,
          name: d.o.tree.skills.get(s.skillId)?.name ?? s.skillId,
          courseName: d.course.name,
        })),
    )
    .sort(
      (a, b) => (b.s.lastDemonstratedAt?.getTime() ?? 0) - (a.s.lastDemonstratedAt?.getTime() ?? 0),
    )
    .slice(0, 4);
  const examCourses = data.filter((d) => d.o.rollups.course.totalSkills > 0);

  const todoCount = recs.length + open.length;
  const description =
    todoCount === 0
      ? "You're all caught up. Explore a new unit or browse courses."
      : `${pluralize(open.length, "open assignment")} and ${pluralize(recs.length, "suggestion")} for today, each with the reason behind it.`;

  return (
    <>
      <PageHeader title={`Welcome back, ${name}`} description={description} />

      {resume ? <ContinueCard resume={resume} /> : null}

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Section
          title="Today's learning"
          description="Suggested from your answers. Each one says why."
          className="mt-0! lg:col-span-2"
          id="today"
        >
          {recs.length ? (
            <Card padded={false}>
              <ol className="divide-y divide-line">
                {recs.map(({ r, courseName }, i) => (
                  <li key={`${courseName}-${r.id}`} className="px-5 py-5 sm:px-6">
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
              description="You've covered what we'd suggest. Open a course to keep going at your own pace."
              action={
                <ButtonLink href="/app/courses" variant="secondary">
                  Browse courses
                </ButtonLink>
              }
            />
          )}
        </Section>

        <div className="flex flex-col gap-8">
          <Section
            title="Assignments"
            id="assignments"
            className="mt-0!"
            action={
              assignments.length ? (
                <ButtonLink href="/app/assignments" variant="link" size="sm">
                  View all
                </ButtonLink>
              ) : undefined
            }
          >
            <Card className="py-2 sm:py-2">
              {open.length ? (
                <AssignmentList
                  assignments={open.slice(0, 4)}
                  now={now}
                  compact
                  label="Open assignments"
                />
              ) : (
                <p className="flex items-start gap-2 py-3 text-sm text-muted">
                  <ClipboardList aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-faint" />
                  {assignments.length
                    ? "Everything assigned so far is submitted."
                    : "No assignments yet. Work your teacher assigns will show up here."}
                </p>
              )}
            </Card>
          </Section>

          <Section title="Reviews due" id="reviews" className="mt-0!">
            <Card className="py-2 sm:py-2">
              {reviews.length ? (
                <ul className="divide-y divide-line">
                  {reviews.map(({ d, ids }) => (
                    <li key={d.course.courseId} className="py-3">
                      <p className="text-xs text-muted">{d.course.name}</p>
                      <p className="mt-0.5 text-sm font-medium text-ink">
                        {pluralize(ids.length, "skill")} to refresh
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {ids
                          .slice(0, 3)
                          .map((id) => d.o.tree.skills.get(id)?.name)
                          .join(", ")}
                        {ids.length > 3 ? ` and ${ids.length - 3} more` : ""}
                      </p>
                      <ButtonLink
                        href={`/app/review/${d.course.courseId}`}
                        size="sm"
                        variant="secondary"
                        className="mt-2"
                        icon={<RotateCcw aria-hidden="true" className="size-3.5" />}
                      >
                        Start review
                      </ButtonLink>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-start gap-2 py-3 text-sm text-muted">
                  <RotateCcw aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-faint" />
                  No reviews due. Reviews are scheduled once a skill reaches Proficient.
                </p>
              )}
            </Card>
          </Section>
        </div>
      </div>

      <Section
        title="My courses"
        id="my-courses"
        description="Lessons finished and mastery are tracked separately: finishing a lesson isn't the same as showing you know it."
        action={
          <ButtonLink href="/app/courses" variant="link" size="sm">
            Browse courses
          </ButtonLink>
        }
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {data.map(({ course, o }) => (
            <li key={course.courseId}>
              <Card interactive className="h-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-[1.0625rem] font-semibold leading-snug text-ink">
                      <Link
                        href={`/app/courses/${course.courseId}`}
                        className="after:absolute after:inset-0 after:rounded-card hover:underline underline-offset-4"
                      >
                        {course.name}
                      </Link>
                    </h3>
                    <p className="mt-0.5 text-xs text-muted">
                      {course.className ?? "Learning independently"}
                      {course.lastActivityAt ? (
                        <> · active {formatRelativeTime(course.lastActivityAt, now)}</>
                      ) : null}
                    </p>
                  </div>
                  <ContentStatusBadge status={course.contentStatus} className="shrink-0" />
                </div>
                {o.rollups.course.totalSkills > 0 ? (
                  <div className="mt-5 grid gap-5 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                    <div>
                      <MiniLabel>Completion</MiniLabel>
                      <CompletionMeter
                        completed={o.lessonsCompleted}
                        total={o.lessonsTotal}
                        size="sm"
                      />
                    </div>
                    <div>
                      <MiniLabel>Mastery</MiniLabel>
                      <MasteryOverview
                        rollup={o.rollups.course}
                        label={`${course.name} skill mastery`}
                        size="sm"
                        showLevel={false}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted">
                    AceAP doesn&apos;t have lessons for this course yet, so there&apos;s nothing to
                    track.
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ul>
        <details className="group mt-4 rounded-card border border-line bg-surface-2 px-5 py-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-ink-2 [&::-webkit-details-marker]:hidden">
            <Users aria-hidden="true" className="size-4 text-faint" />
            Have a class join code?
          </summary>
          <div className="pb-2 pt-4">
            <JoinClassForm idPrefix="more-join" />
          </div>
        </details>
      </Section>

      <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
        <Section title="AP exam preparation" id="exam-prep" className="mt-0!">
          <Card padded={false} className="h-full">
            <CardBody className="space-y-4">
              <p className="text-sm text-muted">
                What your practice shows so far, unit by unit. AceAP never predicts an AP score.
              </p>
              {examCourses.length ? (
                <ul className="space-y-3">
                  {examCourses.map(({ course, o }) => (
                    <li key={course.courseId} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{course.name}</p>
                        <p className="text-xs text-muted">
                          Evidence on {o.rollups.course.skillsWithEvidence} of{" "}
                          {o.rollups.course.totalSkills} skills ({pct(o.rollups.course.coverage)}{" "}
                          coverage)
                        </p>
                      </div>
                      <ButtonLink
                        href={`/app/exam-prep/${course.courseId}`}
                        size="sm"
                        variant="secondary"
                        aria-label={`Open exam preparation for ${course.name}`}
                      >
                        Open
                      </ButtonLink>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">
                  Exam preparation appears once you&apos;re in a course with lessons.
                </p>
              )}
              <ButtonLink
                href="/app/exam-prep"
                variant="link"
                size="sm"
                icon={<Target aria-hidden="true" className="size-4" />}
              >
                Go to exam prep
              </ButtonLink>
            </CardBody>
          </Card>
        </Section>

        <Section
          title="Recent knowledge"
          id="recent-knowledge"
          className="mt-0!"
          action={
            <ButtonLink href="/app/vault" variant="link" size="sm">
              Open vault
            </ButtonLink>
          }
        >
          <Card padded={false} className="h-full">
            <CardBody className="space-y-5">
              <div>
                <MiniLabel>Your latest notes</MiniLabel>
                {notes.length ? (
                  <ul className="space-y-2.5">
                    {notes.map((n) => (
                      <li key={n.id}>
                        <Link href={`/app/vault/notes/${n.id}`} className="group block">
                          <span className="flex items-center gap-2 text-sm font-medium text-ink group-hover:underline underline-offset-4">
                            <NotebookPen
                              aria-hidden="true"
                              className="size-3.5 shrink-0 text-faint"
                            />
                            <span className="truncate">{n.title}</span>
                          </span>
                          <span className="mt-0.5 block truncate pl-5.5 text-xs text-muted">
                            Edited {formatRelativeTime(n.updatedAt, now)}
                            {n.excerpt ? <> · {n.excerpt}</> : null}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">
                    No notes yet.{" "}
                    <Link
                      href="/app/vault"
                      className="text-accent underline underline-offset-4"
                    >
                      Start a note
                    </Link>{" "}
                    to connect what you&apos;re learning.
                  </p>
                )}
              </div>
              <div>
                <MiniLabel>Skills at Proficient or better</MiniLabel>
                {strong.length ? (
                  <ul className="space-y-2">
                    {strong.map(({ s, name: skillName, courseName }) => (
                      <li key={s.skillId} className="flex items-center justify-between gap-3">
                        <Link
                          href={`/app/skills/${s.skillId}`}
                          className="min-w-0 text-sm text-ink hover:underline underline-offset-4"
                        >
                          <span className="block truncate font-medium">{skillName}</span>
                          <span className="block truncate text-xs text-muted">
                            {data.length > 1 ? `${courseName} · ` : ""}last shown{" "}
                            {s.lastDemonstratedAt
                              ? formatDate(s.lastDemonstratedAt, { short: true })
                              : "—"}
                          </span>
                        </Link>
                        <MasteryBadge level={s.level} needsReview={s.needsReview} size="sm" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">
                    None yet. A skill reaches Proficient after at least 3 correct answers without
                    help on different questions.
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        </Section>
      </div>
    </>
  );
}

function ContinueCard({ resume }: { resume: NonNullable<ReturnType<typeof continueTarget>> }) {
  const { d, lessonId, mode } = resume;
  const lesson = d.o.tree.lessons.get(lessonId);
  if (!lesson) return null;
  const unit = d.o.tree.units.find((u) => u.id === lesson.unitId);
  const status = lessonStatusFor(lesson, d.o);
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
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
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
            <div className="mt-2.5 flex items-center gap-2 text-xs text-muted">
              <span>Skills in this lesson:</span>
              <StatusBadge status={status} size="sm" />
            </div>
          </div>
        </div>
        <ButtonLink
          href={`/app/learn/${lesson.id}`}
          size="lg"
          className="w-full sm:w-auto"
          iconRight={<ArrowRight aria-hidden="true" className="size-4" />}
        >
          {cta}
        </ButtonLink>
      </div>
    </section>
  );
}
