import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StartAttemptForm } from "@/components/activity/StartAttemptForm";
import { AttemptHistoryCard, IntroCard } from "@/components/activity/IntroCard";
import { MODE_LABEL, assistanceSentence, evidenceSentence } from "@/components/activity/attemptLabels";
import { attemptHistory, formatScore, skillStates } from "@/components/activity/attemptQueries";
import { loadAssessment } from "@/components/lesson/loader";
import { ButtonLink, Card, MasteryBadge, PageHeader, formatDate } from "@/components/ui";
import type { AttemptMode } from "@/db/schema";
import { requireStudent } from "@/modules/auth/session";
import { getCourseTree, type CourseTree } from "@/modules/curriculum/queries";

interface Props {
  params: Promise<{ assessmentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Adaptive mixed exam sets use the id convention `mixed-<courseId>` (linked from exam prep). */
const MIXED_PREFIX = "mixed-";
const MIXED_COUNT = 10;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { assessmentId } = await params;
  if (assessmentId.startsWith(MIXED_PREFIX)) return { title: "AP exam practice" };
  const row = await loadAssessment(assessmentId);
  return { title: row?.title ?? "Assessment" };
}

function modeFor(kind: string): AttemptMode {
  return (["lesson_quiz", "skill_quiz", "unit_test", "course_review", "exam_practice"] as const).find((k) => k === kind) ?? "custom";
}

function SkillsCovered({ tree, skillIds, states }: { tree: CourseTree; skillIds: string[]; states: Awaited<ReturnType<typeof skillStates>> }) {
  if (skillIds.length === 0) return null;
  return (
    <Card>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Skills covered · your level</h2>
      <ul className="mt-3 space-y-2.5">
        {skillIds.map((id) => {
          const s = tree.skills.get(id);
          if (!s) return null;
          const st = states.get(id);
          return (
            <li key={id}>
              <Link href={`/app/skills/${id}`} className="block text-sm font-medium leading-snug text-ink underline-offset-4 hover:underline">
                {s.name}
              </Link>
              <div className="mt-1">
                <MasteryBadge level={st?.level ?? "not_started"} needsReview={st?.needsReview} size="sm" />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export default async function AssessmentStartPage({ params, searchParams }: Props) {
  const user = await requireStudent();
  const { assessmentId } = await params;
  const actor = { id: user.id, role: user.role };

  // Alternate form: /app/assessments/mixed?course=<courseId>
  if (assessmentId === "mixed") {
    const course = (await searchParams).course;
    if (typeof course === "string" && /^[a-z0-9.-]{1,100}$/.test(course)) redirect(`/app/assessments/${MIXED_PREFIX}${course}`);
    notFound();
  }

  if (assessmentId.startsWith(MIXED_PREFIX)) {
    const courseId = assessmentId.slice(MIXED_PREFIX.length);
    const tree = /^[a-z0-9.-]{1,100}$/.test(courseId) ? await getCourseTree(courseId) : null;
    if (!tree) notFound();
    const history = await attemptHistory(actor, { kind: "exam_mixed", courseId });
    const minutes = MIXED_COUNT * 2;
    return (
      <>
        <PageHeader
          breadcrumbs={[
            { label: "Exam prep", href: "/app/exam-prep" },
            { label: tree.course.name, href: `/app/courses/${courseId}` },
            { label: "Mixed exam set" },
          ]}
          eyebrow={MODE_LABEL.exam_practice}
          title={`${tree.course.name}: adaptive exam set`}
          description="Original AP-style questions drawn from across the course, weighted toward the skills you're weakest on."
        />
        <IntroCard
          title="Adaptive exam set"
          facts={[
            { label: "Questions", value: `${MIXED_COUNT} (fewer if the course has fewer)` },
            { label: "Timing", value: `${minutes} min when timed (2 min per question)` },
            { label: "Feedback", value: "After you submit" },
            { label: "Help", value: "No hints or AI tutor" },
          ]}
          counts={
            <>
              <p>{evidenceSentence("exam_practice")}</p>
              <p className="mt-1.5">{assistanceSentence("disabled")}</p>
            </>
          }
          actions={
            history.open ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <ButtonLink href={`/app/attempts/${history.open.id}`} size="lg">
                  Resume your set
                </ButtonLink>
                {history.open.deadline ? <p className="text-sm text-muted sm:pt-3">Time runs out {formatDate(history.open.deadline, { withTime: true })}.</p> : null}
              </div>
            ) : (
              <StartAttemptForm
                spec={{ kind: "exam_mixed", courseId, count: MIXED_COUNT }}
                label="Start exam set"
                timedChoice={{ defaultOn: true, description: `A ${minutes}-minute clock, like the real exam. Turn off to practise without time pressure.` }}
              />
            )
          }
          aside={
            <AttemptHistoryCard
              submitted={history.submitted}
              best={history.best ? formatScore(history.best) : null}
              last={history.last ? { href: `/app/attempts/${history.last.id}`, label: "See your last results" } : null}
            />
          }
        >
          <p>Each set is built for you when you start, so two sets won&apos;t be the same. Answers are saved as you go; you see results, correct answers and worked solutions after submitting.</p>
          <p className="text-sm text-muted">Work on your own — results are most useful when they reflect what you can do unaided.</p>
        </IntroCard>
      </>
    );
  }

  const row = await loadAssessment(assessmentId);
  if (!row) notFound();
  const tree = await getCourseTree(row.courseId);
  if (!tree) notFound();
  const node = tree.assessments.find((a) => a.id === row.id);
  const skillIds = node?.skillIds ?? [];
  const [history, states] = await Promise.all([attemptHistory(actor, { kind: "assessment", assessmentId: row.id }), skillStates(actor, skillIds)]);
  const mode = modeFor(row.kind);
  const unit = tree.units.find((u) => u.id === row.unitId);
  const minutes = row.config.timeLimitSeconds ? Math.round(row.config.timeLimitSeconds / 60) : null;
  const feedback = row.config.feedback ?? "after_submit";
  const assistance = row.config.assistance === "allowed" ? "allowed" : "disabled";
  const questionCount = node?.questionCount ?? null;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Courses", href: "/app/courses" },
          { label: tree.course.name, href: `/app/courses/${tree.course.id}` },
          { label: row.title },
        ]}
        eyebrow={`${MODE_LABEL[mode]}${unit ? ` · Unit ${unit.number}` : ""}`}
        title={row.title}
        description={row.description || undefined}
      />
      <IntroCard
        title={row.title}
        facts={[
          { label: "Questions", value: questionCount ?? "—" },
          { label: "Timing", value: minutes ? `${minutes} min` : "Untimed" },
          { label: "Feedback", value: feedback === "immediate" ? "After each answer" : "After you submit" },
          { label: "Help", value: assistance === "allowed" ? "Hints and AI tutor" : "No hints or AI tutor" },
        ]}
        counts={
          <>
            <p>{evidenceSentence(mode)}</p>
            <p className="mt-1.5">{assistanceSentence(assistance)}</p>
          </>
        }
        actions={
          history.open ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <ButtonLink href={`/app/attempts/${history.open.id}`} size="lg">
                Resume
              </ButtonLink>
              <p className="text-sm text-muted">
                Started {formatDate(history.open.startedAt, { withTime: true })}
                {history.open.deadline ? ` · time runs out ${formatDate(history.open.deadline, { withTime: true })}` : ""}.
              </p>
            </div>
          ) : (
            <StartAttemptForm spec={{ kind: "assessment", assessmentId: row.id }} label={history.submitted ? "Start a new attempt" : "Start"} />
          )
        }
        aside={
          <>
            <AttemptHistoryCard
              submitted={history.submitted}
              best={history.best ? formatScore(history.best) : null}
              last={history.last ? { href: `/app/attempts/${history.last.id}`, label: "See your last results" } : null}
            />
            <SkillsCovered tree={tree} skillIds={skillIds} states={states} />
          </>
        }
      >
        {minutes ? (
          <p>
            You&apos;ll have {minutes} minutes once you start. The clock keeps running if you leave the page, and whatever you&apos;ve saved is submitted automatically when time is up.
          </p>
        ) : (
          <p>Take your time — there&apos;s no clock. Answers save as you go, so you can leave and come back.</p>
        )}
        {mode === "unit_test" || mode === "exam_practice" || minutes ? (
          <p className="text-sm text-muted">Work on your own, the way you would in class — results are most useful when they reflect what you can do unaided.</p>
        ) : null}
      </IntroCard>
    </>
  );
}
