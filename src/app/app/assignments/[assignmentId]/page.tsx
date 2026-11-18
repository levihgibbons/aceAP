import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, CalendarClock, Lock } from "lucide-react";
import { StartAttemptForm } from "@/components/activity/StartAttemptForm";
import { AttemptHistoryCard, IntroCard } from "@/components/activity/IntroCard";
import { assistanceSentence, evidenceSentence } from "@/components/activity/attemptLabels";
import { attemptHistory, formatScore, skillStates } from "@/components/activity/attemptQueries";
import { loadAssessment } from "@/components/lesson/loader";
import { Markdown } from "@/components/content/Markdown";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  MasteryBadge,
  PageHeader,
  formatDate,
} from "@/components/ui";
import { asUser, getDb } from "@/db/client";
import { DomainError } from "@/lib/errors";
import { loadAssignmentForStudent, type AssignmentContext } from "@/modules/assessments/service";
import { requireStudent } from "@/modules/auth/session";
import { getCourseTree } from "@/modules/curriculum/queries";
import { listStudentAssignments } from "@/modules/learning/overview";

interface Props {
  params: Promise<{ assignmentId: string }>;
}

export const metadata: Metadata = { title: "Assignment" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AssignmentStartPage({ params }: Props) {
  const user = await requireStudent();
  const { assignmentId } = await params;
  if (!UUID.test(assignmentId)) notFound();
  const actor = { id: user.id, role: user.role };
  const now = new Date();
  const header = (title: string, description?: string) => (
    <PageHeader
      breadcrumbs={[{ label: "Assignments", href: "/app/assignments" }, { label: title }]}
      eyebrow="Assignment"
      title={title}
      description={description}
    />
  );

  let ctx: AssignmentContext;
  try {
    ctx = await loadAssignmentForStudent(await getDb(), user.id, assignmentId, now);
  } catch (e) {
    if (e instanceof DomainError && e.code === "not_found") notFound();
    if (e instanceof DomainError && e.code === "closed")
      return (
        <>
          {header("Not open yet")}
          <EmptyState
            icon={<Lock />}
            title="This assignment isn't open yet"
            description="Your teacher has scheduled it for later. It will appear in your assignments when it opens."
            action={<ButtonLink href="/app/assignments">Back to assignments</ButtonLink>}
          />
        </>
      );
    if (e instanceof DomainError)
      return (
        <>
          {header("Assignment unavailable")}
          <ErrorState
            title="You can't open this assignment"
            description={e.message}
            retry={{ href: "/app/assignments", label: "Back to assignments" }}
          />
        </>
      );
    throw e;
  }

  const a = ctx.assignment;
  const [summary, history] = await Promise.all([
    asUser(actor, (tx) => listStudentAssignments(tx, user.id)).then(
      (list) => list.find((x) => x.id === a.id) ?? null,
    ),
    attemptHistory(actor, { kind: "assignment", assignmentId: a.id }),
  ]);
  const tree = summary ? await getCourseTree(summary.courseId) : null;
  const dueAt = summary?.dueAt ?? ctx.override?.dueAt ?? a.dueAt;
  const maxAttempts = ctx.override?.maxAttempts ?? a.maxAttempts;
  const used = summary?.submissions ?? ctx.priorSubmissions;
  const left = maxAttempts === null ? null : Math.max(0, maxAttempts - used);
  const pastDue = Boolean(dueAt && now.getTime() > dueAt.getTime());
  const assistance = a.aiPolicy;
  const multiplier = ctx.override?.timeMultiplier ?? 1;

  const assessment =
    a.kind === "assessment" && a.assessmentId ? await loadAssessment(a.assessmentId) : null;
  const assessmentNode =
    assessment && tree ? tree.assessments.find((x) => x.id === assessment.id) : null;
  const lesson = a.kind === "lesson" && a.lessonId && tree ? tree.lessons.get(a.lessonId) : null;
  const skillIds =
    a.kind === "skill_practice"
      ? a.skillIds
      : (assessmentNode?.skillIds ?? lesson?.skillIds ?? a.skillIds);
  const states = await skillStates(actor, skillIds);
  const minutes = assessment?.config.timeLimitSeconds
    ? Math.round((assessment.config.timeLimitSeconds * multiplier) / 60)
    : null;

  const what =
    a.kind === "lesson"
      ? lesson
        ? `Lesson: ${lesson.title}`
        : "A lesson"
      : a.kind === "skill_practice"
        ? `Skill practice · ${a.questionCount} questions`
        : assessment
          ? assessment.title
          : "An assessment";
  const questions =
    a.kind === "skill_practice" ? a.questionCount : (assessmentNode?.questionCount ?? null);
  const mode =
    a.kind === "skill_practice"
      ? "guided_practice"
      : a.kind === "lesson"
        ? "lesson_check"
        : assessment?.kind === "unit_test"
          ? "unit_test"
          : "skill_quiz";
  const status = summary?.done
    ? summary.late
      ? { tone: "warn" as const, text: "Submitted late" }
      : { tone: "good" as const, text: "Submitted" }
    : pastDue
      ? { tone: "bad" as const, text: "Past due" }
      : dueAt
        ? { tone: "neutral" as const, text: `Due ${formatDate(dueAt, { short: true })}` }
        : null;

  const startArea =
    a.kind === "lesson" ? (
      lesson?.publishedVersion ? (
        <div className="space-y-2">
          <ButtonLink
            href={`/app/learn/${lesson.id}`}
            size="lg"
            icon={<BookOpen aria-hidden="true" className="size-4" />}
          >
            {summary?.done ? "Open the lesson again" : "Start the lesson"}
          </ButtonLink>
          <p className="text-sm text-muted">
            This assignment is complete when you mark the lesson complete at its end.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">
          The lesson for this assignment isn&apos;t available yet. Let your teacher know.
        </p>
      )
    ) : history.open ? (
      <ButtonLink href={`/app/attempts/${history.open.id}`} size="lg">
        Resume
      </ButtonLink>
    ) : left === 0 ? (
      <p className="flex items-start gap-2 text-sm text-ink-2">
        <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
        You&apos;ve used all {maxAttempts} attempt{maxAttempts === 1 ? "" : "s"} for this
        assignment.
        {history.last ? (
          <Link
            href={`/app/attempts/${history.last.id}`}
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            See your results
          </Link>
        ) : null}
      </p>
    ) : (
      <div className="space-y-2">
        <StartAttemptForm
          spec={{ kind: "assignment", assignmentId: a.id }}
          label={used ? "Start another attempt" : "Start assignment"}
        />
        {pastDue ? (
          <p className="text-sm text-muted">
            It&apos;s past the due date. You can still submit; it will be marked late.
          </p>
        ) : null}
      </div>
    );

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Assignments", href: "/app/assignments" }, { label: a.title }]}
        eyebrow={summary ? `Assignment · ${summary.className}` : "Assignment"}
        title={a.title}
        actions={
          status ? (
            <Badge tone={status.tone} icon={<CalendarClock className="size-3" />}>
              {status.text}
            </Badge>
          ) : null
        }
      />
      <IntroCard
        title={a.title}
        facts={[
          { label: "What", value: what },
          { label: "Due", value: dueAt ? formatDate(dueAt, { withTime: true }) : "No due date" },
          ...(questions ? [{ label: "Questions", value: questions }] : []),
          ...(a.kind !== "lesson"
            ? [
                {
                  label: "Timing",
                  value: minutes
                    ? `${minutes} min${multiplier !== 1 ? " (includes your extra time)" : ""}`
                    : "Untimed",
                },
              ]
            : []),
          ...(a.kind !== "lesson"
            ? [
                {
                  label: "Attempts",
                  value:
                    maxAttempts === null
                      ? `${used} used · unlimited`
                      : `${used} of ${maxAttempts} used · ${left} left`,
                },
              ]
            : []),
          {
            label: "Feedback",
            value:
              a.kind === "lesson" || a.feedback === "immediate"
                ? "After each answer"
                : "After you submit",
          },
          {
            label: "Help",
            value:
              assistance === "allowed"
                ? "Hints and AI tutor"
                : assistance === "hints_only"
                  ? "Hints only"
                  : "No hints or AI tutor",
          },
        ]}
        counts={
          <>
            <p>{evidenceSentence(mode)}</p>
            {a.kind !== "lesson" ? (
              <p className="mt-1.5">{assistanceSentence(assistance)}</p>
            ) : null}
          </>
        }
        actions={startArea}
        aside={
          <>
            {a.kind !== "lesson" ? (
              <AttemptHistoryCard
                submitted={history.submitted}
                best={
                  summary?.bestScore !== null &&
                  summary?.bestScore !== undefined &&
                  summary.maxScore
                    ? formatScore({ score: summary.bestScore, maxScore: summary.maxScore })
                    : history.best
                      ? formatScore(history.best)
                      : null
                }
                last={
                  history.last
                    ? { href: `/app/attempts/${history.last.id}`, label: "See your last results" }
                    : null
                }
              />
            ) : null}
            {skillIds.length && tree ? (
              <Card>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Skills · your level
                </h2>
                <ul className="mt-3 space-y-2.5">
                  {skillIds.map((id) => (
                    <li key={id}>
                      <Link
                        href={`/app/skills/${id}`}
                        className="block text-sm font-medium leading-snug text-ink underline-offset-4 hover:underline"
                      >
                        {tree.skills.get(id)?.name ?? id}
                      </Link>
                      <div className="mt-1">
                        <MasteryBadge
                          level={states.get(id)?.level ?? "not_started"}
                          needsReview={states.get(id)?.needsReview}
                          size="sm"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </>
        }
      >
        {a.instructions.trim() ? (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              From your teacher
            </p>
            <Markdown compact>{a.instructions}</Markdown>
          </div>
        ) : (
          <p className="text-muted">Your teacher didn&apos;t add instructions.</p>
        )}
        {ctx.override?.note ? (
          <p className="text-sm text-muted">Note for you: {ctx.override.note}</p>
        ) : null}
      </IntroCard>
    </>
  );
}
