import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { StartAttemptForm } from "@/components/activity/StartAttemptForm";
import { AttemptHistoryCard, IntroCard } from "@/components/activity/IntroCard";
import { evidenceSentence } from "@/components/activity/attemptLabels";
import { attemptHistory, formatScore } from "@/components/activity/attemptQueries";
import { ButtonLink, Card, EmptyState, MasteryBadge, PageHeader } from "@/components/ui";
import { requireStudent } from "@/modules/auth/session";
import { getCourseTree } from "@/modules/curriculum/queries";
import { getCourseOverview } from "@/modules/learning/overview";

interface Props {
  params: Promise<{ courseId: string }>;
}

const REVIEW_COUNT = 8;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseId } = await params;
  const tree = /^[a-z0-9.-]{1,100}$/.test(courseId) ? await getCourseTree(courseId) : null;
  return { title: tree ? `Review: ${tree.course.name}` : "Review" };
}

export default async function ReviewStartPage({ params }: Props) {
  const user = await requireStudent();
  const { courseId } = await params;
  const tree = /^[a-z0-9.-]{1,100}$/.test(courseId) ? await getCourseTree(courseId) : null;
  if (!tree) notFound();
  const actor = { id: user.id, role: user.role };
  const [overview, history] = await Promise.all([getCourseOverview(actor, user.id, courseId), attemptHistory(actor, { kind: "review", courseId })]);

  const header = (
    <PageHeader
      breadcrumbs={[
        { label: "My courses", href: "/app/courses" },
        { label: tree.course.name, href: `/app/courses/${courseId}` },
        { label: "Review" },
      ]}
      eyebrow="Mixed review"
      title={`Review ${tree.course.name}`}
      description="Short, interleaved sets on skills you've already worked on — the most reliable way to keep what you've learned."
    />
  );

  if (overview.states.size === 0)
    return (
      <>
        {header}
        <EmptyState
          icon={<RotateCcw />}
          title="Nothing to review yet"
          description="Review mixes questions from skills you've already practised. Complete a lesson's checks or some practice first, then come back."
          action={<ButtonLink href={`/app/courses/${courseId}`}>Go to the course</ButtonLink>}
        />
      </>
    );

  const due = overview.reviewsDue.map((r) => r.skillId).filter((id) => tree.skills.has(id));
  const flagged = [...overview.states.values()].filter((s) => s.needsReview && !due.includes(s.skillId)).map((s) => s.skillId);
  const focus = [...due, ...flagged].slice(0, 8);

  return (
    <>
      {header}
      <IntroCard
        title="Review set"
        facts={[
          { label: "Questions", value: `Up to ${REVIEW_COUNT}` },
          { label: "Timing", value: "Untimed" },
          { label: "Feedback", value: "After each answer" },
          { label: "Help", value: "No hints or AI tutor" },
          { label: "Tries", value: "One per question" },
        ]}
        counts={<p>{evidenceSentence("course_review")}</p>}
        actions={
          history.open ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <ButtonLink href={`/app/attempts/${history.open.id}`} size="lg">
                Resume your review
              </ButtonLink>
              <StartAttemptForm spec={{ kind: "review", courseId, count: REVIEW_COUNT }} label="Start a new set" variant="secondary" />
            </div>
          ) : (
            <StartAttemptForm spec={{ kind: "review", courseId, count: REVIEW_COUNT }} label="Start review" />
          )
        }
        aside={
          <>
            <Card>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Up for review</h2>
              {focus.length ? (
                <ul className="mt-3 space-y-2.5">
                  {focus.map((id) => {
                    const st = overview.states.get(id);
                    return (
                      <li key={id}>
                        <Link href={`/app/skills/${id}`} className="block text-sm font-medium leading-snug text-ink underline-offset-4 hover:underline">
                          {tree.skills.get(id)?.name ?? id}
                        </Link>
                        <div className="mt-1">
                          <MasteryBadge level={st?.level ?? "not_started"} needsReview={st?.needsReview} size="sm" />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">No reviews are due right now. A set will still mix in the skills you practised longest ago.</p>
              )}
            </Card>
            <AttemptHistoryCard
              submitted={history.submitted}
              best={history.best ? formatScore(history.best) : null}
              last={history.last ? { href: `/app/attempts/${history.last.id}`, label: "See your last results" } : null}
            />
          </>
        }
      >
        <p>
          {due.length
            ? `${due.length} skill${due.length === 1 ? " is" : "s are"} due for a spaced review. They come first, then skills flagged for review, then the ones you practised longest ago.`
            : "Questions come from skills flagged for review first, then the ones you practised longest ago."}
        </p>
        <p className="text-sm text-muted">Answer from memory — that effort is what makes review work.</p>
      </IntroCard>
    </>
  );
}
