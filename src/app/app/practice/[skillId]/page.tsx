import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Dumbbell } from "lucide-react";
import { StartAttemptForm } from "@/components/activity/StartAttemptForm";
import { AttemptHistoryCard, IntroCard } from "@/components/activity/IntroCard";
import { assistanceSentence, evidenceSentence } from "@/components/activity/attemptLabels";
import { attemptHistory, formatScore, skillStates } from "@/components/activity/attemptQueries";
import { Badge, ButtonLink, Card, EmptyState, MasteryBadge, PageHeader } from "@/components/ui";
import { getDb } from "@/db/client";
import { classAiPolicy } from "@/modules/assessments/service";
import { requireStudent } from "@/modules/auth/session";
import { getCourseTree, getSkillCourseId } from "@/modules/curriculum/queries";

interface Props {
  params: Promise<{ skillId: string }>;
}

const SET_SIZE = 5;

async function load(skillId: string) {
  const courseId = /^[a-z0-9.-]{1,200}$/.test(skillId) ? await getSkillCourseId(skillId) : null;
  const tree = courseId ? await getCourseTree(courseId) : null;
  const skill = tree?.skills.get(skillId);
  return tree && skill ? { tree, skill } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { skillId } = await params;
  const data = await load(skillId);
  return { title: data ? `Practice: ${data.skill.name}` : "Practice" };
}

export default async function PracticeStartPage({ params }: Props) {
  const user = await requireStudent();
  const { skillId } = await params;
  const data = await load(skillId);
  if (!data) notFound();
  const { tree, skill } = data;
  const actor = { id: user.id, role: user.role };
  const db = await getDb();
  const [states, history, policy] = await Promise.all([skillStates(actor, [skill.id]), attemptHistory(actor, { kind: "practice", skillId }), classAiPolicy(db, user.id, tree.course.id)]);
  const state = states.get(skill.id);
  const assistance = policy === "allowed" ? "allowed" : "hints_only";
  const lessons = skill.lessonIds.map((id) => tree.lessons.get(id)).filter((l) => l?.publishedVersion);
  const count = Math.min(SET_SIZE, skill.questionCount);

  const header = (
    <PageHeader
      breadcrumbs={[
        { label: "Courses", href: "/app/courses" },
        { label: tree.course.name, href: `/app/courses/${tree.course.id}` },
        { label: "Practice" },
      ]}
      eyebrow="Guided practice"
      title={skill.name}
      description={skill.description}
    />
  );

  if (skill.questionCount === 0)
    return (
      <>
        {header}
        <EmptyState
          icon={<Dumbbell />}
          title="No practice questions for this skill yet"
          description="We haven't written practice for this skill. Its lessons and quizzes still count."
          action={<ButtonLink href={`/app/courses/${tree.course.id}`}>Back to course</ButtonLink>}
        />
      </>
    );

  return (
    <>
      {header}
      <IntroCard
        title="Practice set"
        facts={[
          { label: "Questions", value: `${count} per set` },
          { label: "Timing", value: "Untimed" },
          { label: "Feedback", value: "After each answer" },
          { label: "Help", value: assistance === "allowed" ? "Hints and AI tutor" : "Hints (AI tutor off)" },
          { label: "Retries", value: "Try again after a wrong answer" },
        ]}
        counts={
          <>
            <p>{evidenceSentence("guided_practice")}</p>
            <p className="mt-1.5">{assistanceSentence(assistance)}</p>
          </>
        }
        actions={
          history.open ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <ButtonLink href={`/app/attempts/${history.open.id}`} size="lg">
                Resume your set
              </ButtonLink>
              <StartAttemptForm spec={{ kind: "practice", skillId }} label="Start a new set" variant="secondary" />
            </div>
          ) : (
            <StartAttemptForm spec={{ kind: "practice", skillId }} label="Start practice" />
          )
        }
        aside={
          <>
            <Card>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Your current level</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <MasteryBadge level={state?.level ?? "not_started"} needsReview={state?.needsReview} />
                {history.open ? <Badge tone="accent">Set in progress</Badge> : null}
              </div>
              <Link href={`/app/skills/${skill.id}`} className="mt-3 inline-block text-sm font-medium text-accent underline-offset-4 hover:underline">
                What&apos;s behind this level
              </Link>
            </Card>
            <AttemptHistoryCard
              submitted={history.submitted}
              best={history.best ? formatScore(history.best) : null}
              last={history.last ? { href: `/app/attempts/${history.last.id}`, label: "See your last results" } : null}
            />
            {lessons.length ? (
              <Card>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Need a refresher?</h2>
                <ul className="mt-2 space-y-1.5">
                  {lessons.map((l) => (
                    <li key={l!.id}>
                      <Link href={`/app/learn/${l!.id}`} className="inline-flex items-start gap-1.5 text-sm font-medium text-ink underline-offset-4 hover:underline">
                        <BookOpen aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
                        {l!.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </>
        }
      >
        <p>
          Questions are chosen for you: ones you haven&apos;t seen first, then ones you missed, mixing problem types so the practice is varied.
        </p>
      </IntroCard>
    </>
  );
}
