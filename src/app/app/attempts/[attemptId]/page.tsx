import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Info, ShieldCheck } from "lucide-react";
import { ActivityTracker } from "@/components/activity/ActivityTracker";
import { AttemptResults } from "@/components/activity/AttemptResults";
import { AttemptRunner } from "@/components/activity/AttemptRunner";
import { activityKindForMode, assistanceSentence, modeBadgeText } from "@/components/activity/attemptLabels";
import { attemptMasteryChanges } from "@/components/activity/attemptMastery";
import { tutorAvailability } from "@/components/lesson/loader";
import { Badge, EmptyState, ErrorState, PageHeader, ButtonLink, formatDate } from "@/components/ui";
import { DomainError } from "@/lib/errors";
import { getAttemptView, type AttemptView } from "@/modules/assessments/service";
import { requireStudent } from "@/modules/auth/session";
import { getCourseTree } from "@/modules/curriculum/queries";
import { evidenceSentence } from "@/components/activity/attemptLabels";

interface Props {
  params: Promise<{ attemptId: string }>;
}

export const metadata: Metadata = { title: "Attempt" };

export default async function AttemptPage({ params }: Props) {
  const user = await requireStudent();
  const { attemptId } = await params;

  let view: AttemptView;
  try {
    view = await getAttemptView(user.id, attemptId);
  } catch (e) {
    if (e instanceof DomainError && e.code === "not_found") notFound();
    if (e instanceof DomainError)
      return (
        <>
          <PageHeader title="This attempt isn't available" />
          <ErrorState title="We couldn't open this attempt" description={e.message} retry={{ href: "/app", label: "Back to home" }} />
        </>
      );
    throw e;
  }
  // Lesson checks live inside their lesson.
  if (view.mode === "lesson_check" && view.lessonId) redirect(`/app/learn/${view.lessonId}`);

  const tree = await getCourseTree(view.courseId);
  const courseName = tree?.course.name ?? null;
  const minutes = view.deadline ? Math.round((Date.parse(view.deadline) - Date.parse(view.startedAt)) / 60_000) : null;
  const badge = modeBadgeText({ mode: view.mode, assistance: view.assistance, feedback: view.feedback, timeLimitMinutes: minutes });
  const submitted = view.status === "submitted";
  const breadcrumbs = [
    { label: "My courses", href: "/app/courses" },
    ...(courseName ? [{ label: courseName, href: `/app/courses/${view.courseId}` }] : []),
    { label: submitted ? "Results" : view.title },
  ];

  if (view.status === "abandoned")
    return (
      <>
        <PageHeader breadcrumbs={breadcrumbs} title={view.title} />
        <EmptyState title="This attempt was closed" description="It can't be continued. Start a new one from the course." action={<ButtonLink href={`/app/courses/${view.courseId}`}>Back to course</ButtonLink>} />
      </>
    );

  if (submitted) {
    const changes = await attemptMasteryChanges({ id: user.id, role: user.role }, view);
    return (
      <>
        <PageHeader
          breadcrumbs={breadcrumbs}
          eyebrow={badge}
          title={view.title}
          description={view.submittedAt ? `Submitted ${formatDate(view.submittedAt, { withTime: true })}.` : undefined}
          actions={<Badge tone="good" icon={<CheckCircle2 className="size-3" />}>Submitted</Badge>}
        />
        <AttemptResults view={view} changes={changes} courseName={courseName} />
      </>
    );
  }

  const tutor = view.assistance === "allowed" ? { availability: await tutorAvailability(user.id, view.courseId, view.assistance) } : null;
  const formal = view.mode === "unit_test" || view.mode === "exam_practice" || Boolean(view.deadline);

  return (
    <>
      <PageHeader breadcrumbs={breadcrumbs} eyebrow={badge} title={view.title} description={view.description || undefined} />
      <ActivityTracker activityKind={activityKindForMode(view.mode)} courseId={view.courseId} activityId={view.id} />
      <div className="mb-6 space-y-2">
        <p className="flex items-start gap-2 text-sm text-ink-2">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
          <span>
            {assistanceSentence(view.assistance)} {evidenceSentence(view.mode)}
          </span>
        </p>
        {formal ? (
          <p className="flex items-start gap-2 text-sm text-ink-2">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
            <span>
              Work on your own, the way you would in the real exam — results are most useful when they reflect what you can do unaided.
              {view.deadline ? " When time runs out, whatever you've saved is submitted automatically." : ""}
            </span>
          </p>
        ) : null}
      </div>
      {view.questions.length === 0 ? (
        <EmptyState title="No questions in this attempt" description="There's nothing to answer here. Head back to the course to pick something else." action={<ButtonLink href={`/app/courses/${view.courseId}`}>Back to course</ButtonLink>} />
      ) : (
        <AttemptRunner view={view} serverNow={new Date().toISOString()} tutor={tutor} />
      )}
    </>
  );
}
