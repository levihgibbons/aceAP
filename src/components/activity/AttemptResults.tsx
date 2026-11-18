/**
 * AttemptResults — the results view for a submitted attempt: score, mastery
 * changes per skill, detected misconceptions, per-question review (feedback,
 * correct answer and solution exactly as getAttemptView returns them after
 * submission) and next steps. Server Component.
 */
import Link from "next/link";
import { ArrowRight, Clock3, Dumbbell, Lightbulb } from "lucide-react";
import { Markdown } from "@/components/content/Markdown";
import { FeedbackPanel } from "@/components/questions/FeedbackPanel";
import { MasteryChangeList } from "@/components/questions/MasteryChangeList";
import { ResponseSummary } from "@/components/questions/ResponseSummary";
import type { MasteryChange } from "@/components/questions/types";
import { Badge, ButtonLink, Card, CardBody, CardHeader, EmptyState, Section, StatTile } from "@/components/ui";
import type { AttemptView } from "@/modules/assessments/service";
import { LEVEL_RANK } from "@/modules/mastery/types";

export function AttemptResults({ view, changes, courseName }: { view: AttemptView; changes: MasteryChange[]; courseName: string | null }) {
  const total = view.maxScore ?? view.questions.length;
  const score = view.score ?? 0;
  const pct = total ? Math.round((score / total) * 100) : 0;
  const immediate = view.feedback === "immediate";
  const answered = view.questions.filter((q) => view.state[q.id]?.answered).length;
  const pending = view.questions.filter((q) => view.state[q.id]?.pendingReview).length;

  const misconceptions = new Map<string, { title: string; remediation: string }>();
  for (const q of view.questions) {
    const m = view.state[q.id]?.feedback?.misconception;
    if (m) misconceptions.set(m.id, { title: m.title, remediation: m.remediation });
  }

  const weakest = [...changes].sort((a, b) => LEVEL_RANK[a.after] - LEVEL_RANK[b.after])[0];
  const practiceSkill = weakest ? { id: weakest.skillId, name: weakest.skillName } : view.skillId ? { id: view.skillId, name: "this skill" } : null;

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Score" value={`${Math.round(score * 10) / 10} / ${total}`} hint={immediate ? "First tries only" : `${pct}%`} />
        <StatTile label="Answered" value={`${answered} / ${view.questions.length}`} hint={pending ? `${pending} awaiting teacher review` : undefined} />
        <StatTile label="Skills with new evidence" value={changes.length} hint={changes.some((c) => LEVEL_RANK[c.after] > LEVEL_RANK[c.before]) ? "Some levels went up" : undefined} />
      </div>

      <Section title="Mastery changes" description="Each skill's level before this attempt and right after you submitted it.">
        {changes.length ? (
          <Card>
            <MasteryChangeList changes={changes} linkSkills variant="list" />
          </Card>
        ) : (
          <EmptyState
            headingLevel={3}
            title="No mastery evidence from this attempt"
            description={pending ? "Written answers count once your teacher scores them." : "Only answered questions create mastery evidence. Unanswered questions score zero but don't count against you."}
          />
        )}
      </Section>

      {misconceptions.size ? (
        <Section title="Patterns worth fixing" description="Some wrong answers matched a common misconception. Each one is a hypothesis, not a verdict — it clears as you answer similar questions correctly.">
          <ul className="grid gap-3 md:grid-cols-2">
            {[...misconceptions.entries()].map(([id, m]) => (
              <li key={id}>
                <Card className="h-full">
                  <p className="flex items-start gap-2 text-sm font-semibold text-ink">
                    <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warn" />
                    {m.title}
                  </p>
                  <Markdown compact className="mt-2 text-ink-2">
                    {m.remediation}
                  </Markdown>
                </Card>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Question by question">
        <ol className="space-y-4">
          {view.questions.map((q, i) => {
            const s = view.state[q.id];
            return (
              <li key={q.id}>
                <Card padded={false}>
                  <CardHeader
                    titleAs="h3"
                    title={`Question ${i + 1}`}
                    action={
                      s?.pendingReview ? (
                        <Badge tone="info" icon={<Clock3 className="size-3" />}>
                          Awaiting review
                        </Badge>
                      ) : !s?.answered ? (
                        <Badge tone="warn">Not answered</Badge>
                      ) : s.tries > 1 ? (
                        <Badge>{s.tries} tries</Badge>
                      ) : null
                    }
                  />
                  <CardBody className="space-y-4">
                    <Markdown compact className="text-ink">
                      {q.prompt}
                    </Markdown>
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Your answer</p>
                      <ResponseSummary question={q} response={s?.response ?? null} />
                    </div>
                    {s?.feedback ? (
                      <FeedbackPanel feedback={s.feedback} />
                    ) : s?.pendingReview ? (
                      <p className="text-sm text-muted">Your teacher will score this against the rubric.</p>
                    ) : null}
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section title="Next steps">
        <div className="grid gap-3 sm:grid-cols-2">
          {practiceSkill ? (
            <Card interactive>
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Dumbbell aria-hidden="true" className="size-4 text-accent" />
                Practice your weakest skill
              </p>
              <p className="mt-1 text-sm text-muted">{practiceSkill.name === "this skill" ? "Another set of guided practice." : practiceSkill.name}</p>
              <Link href={`/app/practice/${practiceSkill.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent underline-offset-4 after:absolute after:inset-0 hover:underline">
                Start practice <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Card>
          ) : null}
          <Card interactive>
            <p className="text-sm font-semibold text-ink">Back to {courseName ?? "the course"}</p>
            <p className="mt-1 text-sm text-muted">See your progress across units and what to do next.</p>
            <Link href={`/app/courses/${view.courseId}`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent underline-offset-4 after:absolute after:inset-0 hover:underline">
              Go to course <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Card>
        </div>
        {view.assessmentId && !view.assignmentId ? (
          <div className="mt-4">
            <ButtonLink href={`/app/assessments/${view.assessmentId}`} variant="secondary">
              Take it again
            </ButtonLink>
          </div>
        ) : null}
      </Section>
    </div>
  );
}
