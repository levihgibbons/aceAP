import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { ActivityTracker } from "@/components/activity/ActivityTracker";
import { LessonBlocks, type LessonChecks } from "@/components/lesson/LessonBlocks";
import { LessonCompletion, type LessonNextSteps, type PracticeLink } from "@/components/lesson/LessonCompletion";
import { scoreText } from "@/components/student/format";
import { LessonNav } from "@/components/lesson/LessonNav";
import { LessonProgressTracker } from "@/components/lesson/LessonProgressTracker";
import { LessonShell } from "@/components/lesson/LessonShell";
import { RelatedSkills, type SkillChip } from "@/components/lesson/RelatedSkills";
import { loadPublishedLesson, tutorAvailability } from "@/components/lesson/loader";
import { Badge, MasteryBadge, PageHeader, Pill } from "@/components/ui";
import { getAttemptView, startAttempt } from "@/modules/assessments/service";
import { requireStudent } from "@/modules/auth/session";
import { startLesson } from "@/modules/learning/progress";
import { getCourseOverview } from "@/modules/learning/overview";
import { lessonNumber } from "@/components/student/roadmap";

interface Props {
  params: Promise<{ lessonId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lessonId } = await params;
  const lesson = await loadPublishedLesson(lessonId);
  return { title: lesson?.lesson.title ?? "Lesson" };
}

export default async function LessonPage({ params }: Props) {
  const user = await requireStudent();
  const { lessonId } = await params;
  const published = await loadPublishedLesson(lessonId);
  if (!published) notFound();
  const { lesson, blocks } = published;
  const courseId = lesson.courseId;

  // Engagement record (LESSON_STARTED once) — never an input to mastery.
  await startLesson(user.id, lessonId);
  const hasChecks = blocks.some((b) => b.type === "check");
  const [overview, checkView, availability] = await Promise.all([
    getCourseOverview({ id: user.id, role: user.role }, user.id, courseId),
    hasChecks ? startAttempt(user.id, { kind: "lesson", lessonId }).then(({ attemptId }) => getAttemptView(user.id, attemptId)) : Promise.resolve(null),
    tutorAvailability(user.id, courseId),
  ]);
  const { tree } = overview;
  const node = tree.lessons.get(lessonId);
  const unit = tree.units.find((u) => u.id === lesson.unitId);
  const topic = unit?.topics.find((tp) => tp.id === lesson.topicId);
  const number = lessonNumber(tree, lessonId);

  const chip = (id: string): SkillChip | null => {
    const s = tree.skills.get(id);
    if (!s) return null;
    const st = overview.states.get(id);
    return { id, name: s.name, level: st?.level ?? "not_started", needsReview: st?.needsReview ?? false };
  };
  const taught = (node?.skillIds ?? []).map(chip).filter((x): x is SkillChip => x !== null);
  const taughtIds = new Set(taught.map((s) => s.id));
  const buildsOn = [...new Set(taught.flatMap((s) => tree.skills.get(s.id)?.prerequisites ?? []))]
    .filter((id) => !taughtIds.has(id))
    .map(chip)
    .filter((x): x is SkillChip => x !== null);

  // Resume position (engagement only).
  const progress = overview.lessonProgress.get(lessonId);
  const completed = progress?.status === "completed";
  const furthest = progress?.furthestBlock ?? 0;
  const resumeAt = !completed && furthest > 0 && furthest < blocks.length ? furthest : null;

  // What's next after completing.
  const order = tree.lessonOrder;
  const nextId = order.slice(order.indexOf(lessonId) + 1).find((id) => tree.lessons.get(id)?.publishedVersion);
  const nextLesson = nextId ? tree.lessons.get(nextId)! : null;
  // Practice for this topic: its exercises, else skill practice; then its quiz.
  const topicAssessments = tree.assessments.filter((a) => a.topicId === lesson.topicId);
  const best = (id: string) => {
    const r = overview.assessmentResults.get(id);
    return r ? `Best ${scoreText(r.bestScore, r.maxScore)}` : null;
  };
  const exercises: PracticeLink[] = topicAssessments
    .filter((a) => a.kind === "exercise")
    .map((a) => ({ href: `/app/assessments/${a.id}`, title: a.title, meta: best(a.id) ?? "New questions every try", kind: "exercise" }));
  const skillPractice: PracticeLink[] = taught.map((s) => ({ href: `/app/practice/${s.id}`, title: `Practise: ${s.name}`, meta: "Adaptive practice", kind: "skill" }));
  const quiz =
    topicAssessments.find((a) => a.kind !== "exercise") ??
    tree.assessments.find((a) => (a.kind === "lesson_quiz" || a.kind === "skill_quiz") && a.skillIds.some((s) => taughtIds.has(s)));
  const next: LessonNextSteps = {
    nextLesson: nextLesson ? { href: `/app/learn/${nextLesson.id}`, title: nextLesson.title } : null,
    practice: [
      ...(exercises.length ? exercises : skillPractice),
      ...(quiz ? [{ href: `/app/assessments/${quiz.id}`, title: quiz.title, meta: best(quiz.id) ?? `Quiz · ${quiz.questionCount} questions`, kind: "quiz" as const }] : []),
    ],
    courseHref: `/app/courses/${courseId}`,
  };

  const checks: LessonChecks | null = checkView
    ? {
        attempt: { attemptId: checkView.id, feedbackMode: checkView.feedback, assistance: checkView.assistance, allowSolution: checkView.assistance !== "disabled" },
        questions: new Map(checkView.questions.map((q) => [q.id, q])),
        state: checkView.state,
      }
    : null;
  const tutorPrompts = blocks.flatMap((b) => (b.type === "tutor_prompt" ? b.prompts : []));
  const containerId = "lesson-content";

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "My courses", href: "/app/courses" },
          { label: tree.course.name, href: `/app/courses/${courseId}` },
          ...(unit ? [{ label: `Unit ${unit.number}`, href: `/app/courses/${courseId}/units/${unit.slug}` }] : []),
          { label: lesson.title },
        ]}
        eyebrow={unit ? `${number ? `Lesson ${number} · ` : ""}Unit ${unit.number}${topic ? ` · ${topic.title}` : ""}` : undefined}
        title={lesson.title}
        description={lesson.summary}
        actions={
          <>
            <Pill icon={<Clock className="size-3.5" />}>{lesson.estMinutes} min</Pill>
            {completed ? <Badge tone="good">Completed</Badge> : progress ? <Badge tone="accent">In progress</Badge> : null}
          </>
        }
      />
      <ActivityTracker activityKind="lesson" courseId={courseId} activityId={lessonId} />
      <LessonShell
        nav={<LessonNav tree={tree} currentLessonId={lessonId} progress={overview.lessonProgress} />}
        aside={<RelatedSkills taught={taught} buildsOn={buildsOn} />}
        tutor={{ context: { courseId, lessonId }, availability, suggestions: tutorPrompts.length ? tutorPrompts : undefined }}
      >
        {taught.length ? (
          <section aria-label="Skills in this lesson" className="mb-8 rounded-xl border border-line bg-surface-2 px-4 py-3">
            <p className="text-xs font-medium text-muted">Skills in this lesson · your current level</p>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              {taught.map((s) => (
                <li key={s.id} className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                  <Link href={`/app/skills/${s.id}`} className="font-medium text-ink underline-offset-4 hover:underline">
                    {s.name}
                  </Link>
                  <MasteryBadge level={s.level} needsReview={s.needsReview} size="sm" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div id={containerId}>
          {blocks.length ? (
            <LessonBlocks blocks={blocks} lessonId={lessonId} checks={checks} noteTags={[courseId]} />
          ) : (
            <p className="rounded-xl border border-dashed border-line-strong bg-surface-2 px-4 py-6 text-center text-sm text-muted">This lesson has no content yet.</p>
          )}
        </div>

        <div className="mt-10">
          <LessonCompletion lessonId={lessonId} initiallyCompleted={completed} next={next} />
        </div>
      </LessonShell>
      <LessonProgressTracker lessonId={lessonId} containerId={containerId} initialFurthest={furthest} resumeAt={resumeAt} />
    </>
  );
}
