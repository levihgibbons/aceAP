/**
 * EvidencePanel — the teacher's EVIDENCE VIEW behind one mastery cell.
 *   <EvidencePanel evidence={cellEvidence} variant="drawer" />   (heatmap drawer, client)
 *   <EvidencePanel evidence={cellEvidence} variant="page" />     (full evidence page, server)
 * No hooks: renders in Server and Client Components. Every number comes from
 * the evidence model built by server/evidence.ts.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Check, ClipboardPlus, ExternalLink, Lightbulb, Minus, Route, X } from "lucide-react";
import { InlineMarkdown, Markdown } from "@/components/content/Markdown";
import { Badge, ButtonLink, KeyValue, MasteryBadge, formatDate, pluralize } from "@/components/ui";
import { cn } from "@/lib/cn";
import { LEVEL_LABEL } from "@/modules/mastery/types";
import { MISCONCEPTION_STATUS, interventionHref, newAssignmentHref, percent, skillEvidenceHref, studentHref } from "./format";
import type { CellEvidence, Recommendation, SkillEvidence } from "./types";

const TONE_STYLE: Record<Recommendation["tone"], string> = {
  support: "border-warn/40 bg-warn-soft",
  gather: "border-info/40 bg-info-soft",
  review: "border-m-review/40 bg-m-review-soft",
  on_track: "border-good/40 bg-good-soft",
};

type Level = 2 | 3 | 4;

/** Section heading. Levels follow the host: the drawer's title is an h2, the evidence page's an h1. */
function H({ children, level = 3 }: { children: ReactNode; level?: Level }) {
  const Tag = `h${level}` as const;
  return <Tag className="mb-2 text-sm font-semibold text-ink">{children}</Tag>;
}

export function RecommendationCallout({ rec, actions }: { rec: Recommendation; actions?: ReactNode }) {
  return (
    <div className={cn("rounded-xl border p-4", TONE_STYLE[rec.tone])}>
      <p className="flex items-start gap-2 text-sm font-semibold text-ink">
        <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          <span className="sr-only">Recommended action: </span>
          {rec.title}
        </span>
      </p>
      <p className="mt-1.5 pl-6 text-sm leading-relaxed text-ink-2">{rec.reason}</p>
      {actions ? <div className="mt-3 flex flex-wrap gap-2 pl-6">{actions}</div> : null}
    </div>
  );
}

function Result({ correct, score }: { correct: boolean; score: number }) {
  if (correct)
    return (
      <Badge tone="good" icon={<Check className="size-3" />}>
        Correct
      </Badge>
    );
  if (score > 0)
    return (
      <Badge tone="warn" icon={<Minus className="size-3" />}>
        Partly correct
      </Badge>
    );
  return (
    <Badge tone="bad" icon={<X className="size-3" />}>
      Incorrect
    </Badge>
  );
}

function SkillDetailBody({
  skill,
  responseLimit,
  showSummary = true,
  level,
}: {
  skill: SkillEvidence;
  responseLimit: number;
  showSummary?: boolean;
  level: Level;
}) {
  const c = skill.counts;
  const shown = skill.responses.slice(0, responseLimit);
  return (
    <div className="space-y-6">
      {showSummary && skill.summary ? <p className="text-sm leading-relaxed text-ink-2">{skill.summary}</p> : null}

      <section aria-label={`Evidence sufficiency for ${skill.name}`}>
        <H level={level}>Evidence present</H>
        {skill.hasEvidence ? (
          <KeyValue
            items={[
              { label: "Answers graded", value: `${c.correct} of ${c.attempts} correct (${percent(c.correct, c.attempts)})` },
              { label: "Independent (first try, no help)", value: `${c.independentCorrect} of ${c.independentAttempts} correct` },
              { label: "Assisted (hints, solution, tutor or retry)", value: `${c.assistedAttempts} — counted for less` },
              { label: "Different questions correct without help", value: `${c.uniqueQuestionsCorrect} of ${c.uniqueQuestions}` },
              { label: "Problem types correct without help", value: c.distinctPatternsCorrect },
              { label: "Quiz/test/review correct (independent)", value: c.summativeIndependentCorrect },
              { label: "Separate sittings with a correct answer", value: c.distinctSittings },
            ]}
          />
        ) : (
          <p className="text-sm text-muted">No graded answers yet. Opening a lesson, time on a page or chatting with the tutor never counts as evidence.</p>
        )}
        {skill.nextLevel && skill.unmet.length ? (
          <div className="mt-3">
            <p className="text-xs font-medium text-muted">Missing for {LEVEL_LABEL[skill.nextLevel]}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-2">
              {skill.unmet.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {skill.needsReview ? (
          <p className="mt-3 text-sm text-ink-2">
            <span className="font-medium text-m-review">Needs review:</span> {skill.reviewReason ?? "fresh evidence is due"}. The level is not lowered.
          </p>
        ) : null}
        {skill.lastDemonstratedAt ? <p className="mt-2 text-xs text-muted">Last shown independently {formatDate(skill.lastDemonstratedAt, { short: true })}.</p> : null}
      </section>

      {skill.patterns.length ? (
        <section aria-label={`Problem types for ${skill.name}`}>
          <H level={level}>By type of problem</H>
          <ul className="divide-y divide-line rounded-lg border border-line text-sm">
            {skill.patterns.map((p) => (
              <li key={p.label} className="flex items-baseline justify-between gap-3 px-3 py-2">
                <span className="min-w-0 text-ink-2">
                  {p.label}
                  {skill.weakestPattern === p.label ? (
                    <Badge tone="warn" className="ml-2">
                      Weakest
                    </Badge>
                  ) : null}
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {p.independentCorrect} of {p.independentAttempts} independent correct · {pluralize(p.attempts, "answer")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {skill.assessments.length ? (
        <section aria-label={`Recent assessment results for ${skill.name}`}>
          <H level={level}>Recent quiz, test and review results on this skill</H>
          <ul className="space-y-1 text-sm">
            {skill.assessments.map((a) => (
              <li key={a.attemptId} className="flex justify-between gap-3">
                <span className="text-ink-2">
                  {a.modeLabel} · {formatDate(a.at, { short: true })}
                </span>
                <span className="tabular-nums text-ink">
                  {a.correct} of {a.total} correct
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {skill.misconceptions.length ? (
        <section aria-label={`Misconceptions for ${skill.name}`}>
          <H level={level}>Misconceptions</H>
          <ul className="space-y-3">
            {skill.misconceptions.map((m) => (
              <li key={m.id} className="rounded-lg border border-line p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{m.title}</span>
                  <Badge tone={m.status === "teacher_confirmed" ? "bad" : m.status === "hypothesis" ? "warn" : "good"}>{MISCONCEPTION_STATUS[m.status].label}</Badge>
                </div>
                <p className="mt-1 text-muted">{MISCONCEPTION_STATUS[m.status].description}</p>
                <p className="mt-1.5 text-ink-2">{m.description}</p>
                <p className="mt-1.5 text-ink-2">
                  <span className="font-medium">Try:</span> {m.remediation}
                </p>
                <p className="mt-1.5 text-xs text-muted">
                  Seen {pluralize(m.occurrences, "time")} · {m.correctSinceLast} independent correct since · last {formatDate(m.lastObservedAt, { short: true })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {skill.history.length > 1 ? (
        <section aria-label={`Level history for ${skill.name}`}>
          <H level={level}>Level changes</H>
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs text-muted">
            {skill.history.map((h, i) => (
              <li key={`${h.at}-${i}`} className="inline-flex items-center gap-1.5">
                {i > 0 ? <ArrowRight aria-hidden="true" className="size-3 text-faint" /> : null}
                <MasteryBadge level={h.level} size="sm" />
                <span>{formatDate(h.at, { short: true })}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {skill.responses.length ? (
        <section aria-label={`Responses for ${skill.name}`}>
          <H level={level}>
            Responses{skill.responses.length > shown.length ? ` (latest ${shown.length} of ${skill.responses.length})` : ` (${skill.responses.length})`}
          </H>
          <ol className="space-y-3">
            {shown.map((r) => (
              <li key={r.id} className="rounded-lg border border-line bg-surface p-3 text-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Result correct={r.correct} score={r.score} />
                  <Badge tone="neutral">{r.modeLabel}</Badge>
                  {r.independent ? <Badge tone="info">Independent</Badge> : <Badge tone="neutral">Assisted: {r.assistance.join(", ")}</Badge>}
                  <span className="ml-auto text-xs text-muted">{formatDate(r.occurredAt, { short: true, withTime: true })}</span>
                </div>
                <div className="mt-2 text-ink">
                  <Markdown compact>{r.prompt}</Markdown>
                </div>
                <dl className="mt-2 grid gap-1 text-[0.8125rem]">
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 text-muted">Student answer</dt>
                    <dd className="min-w-0 break-words text-ink">{r.studentAnswer ? <InlineMarkdown>{r.studentAnswer}</InlineMarkdown> : "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 text-muted">Correct answer</dt>
                    <dd className="min-w-0 break-words text-ink">{r.correctAnswer ? <InlineMarkdown>{r.correctAnswer}</InlineMarkdown> : "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 text-muted">Problem type</dt>
                    <dd className="text-ink-2">{r.patternLabel}</dd>
                  </div>
                  {r.misconceptionTitle ? (
                    <div className="flex gap-2">
                      <dt className="w-28 shrink-0 text-muted">Matched error</dt>
                      <dd className="text-ink-2">{r.misconceptionTitle}</dd>
                    </div>
                  ) : null}
                </dl>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

export interface EvidencePanelProps {
  evidence: CellEvidence;
  variant?: "drawer" | "page";
}

export function EvidencePanel({ evidence, variant = "drawer" }: EvidencePanelProps) {
  const { student, column, classId } = evidence;
  const isObjective = column.kind === "objective";
  const practiceSkills = evidence.practiceSkillIds.length ? evidence.practiceSkillIds : evidence.skills.map((s) => s.skillId);
  const responseLimit = variant === "drawer" ? 6 : 200;
  const single = !isObjective ? evidence.skills[0] : null;
  // Drawer: under the dialog's h2. Page: right under the page's h1.
  const base: Level = variant === "drawer" ? 3 : 2;

  return (
    <div className="space-y-6">
      <section aria-label="Current level" className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <MasteryBadge level={evidence.level} needsReview={evidence.needsReview} />
          {isObjective ? (
            <span className="text-xs text-muted">
              Evidence on {evidence.skillsWithEvidence} of {pluralize(evidence.totalSkills, "skill")}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-muted">{column.description}</p>
        <p className="text-sm leading-relaxed text-ink-2">{evidence.explanation}</p>
      </section>

      <RecommendationCallout
        rec={evidence.recommendation}
        actions={
          <>
            <ButtonLink size="sm" href={newAssignmentHref({ classId, skills: practiceSkills, students: [student.id] })} icon={<ClipboardPlus aria-hidden="true" className="size-4" />}>
              Assign targeted practice
            </ButtonLink>
            <ButtonLink size="sm" variant="secondary" href={interventionHref(classId, column.id)} icon={<Route aria-hidden="true" className="size-4" />}>
              Plan an intervention for this {isObjective ? "objective" : "skill"}
            </ButtonLink>
          </>
        }
      />

      {variant === "drawer" ? (
        <p className="text-sm">
          <Link
            href={single ? skillEvidenceHref(student.id, single.skillId, classId) : `${studentHref(student.id, classId)}#objective-${encodeURIComponent(column.id)}`}
            className="inline-flex items-center gap-1 font-medium text-accent underline-offset-4 hover:underline"
          >
            {single ? "Open the full evidence page" : `Open ${student.name}'s profile`}
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </Link>
        </p>
      ) : null}

      {isObjective ? (
        <section aria-label="Skills in this objective">
          <H level={base}>Skills in this objective</H>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {evidence.skills.map((s) => (
              <li key={s.skillId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{s.name}</p>
                  <p className="text-xs text-muted">
                    {s.hasEvidence
                      ? `${s.counts.correct} of ${s.counts.attempts} correct · ${s.counts.independentCorrect} of ${s.counts.independentAttempts} independent`
                      : "No evidence yet"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <MasteryBadge level={s.level} needsReview={s.needsReview} size="sm" />
                  <Link href={skillEvidenceHref(student.id, s.skillId, classId)} className="rounded text-xs font-medium text-accent underline-offset-4 hover:underline">
                    Full evidence<span className="sr-only"> for {s.name}</span>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isObjective ? (
        <div className="space-y-3">
          {evidence.skills.map((s, i) => (
            <details key={s.skillId} className="group rounded-lg border border-line" open={variant === "page" || (i === 0 && s.hasEvidence) || undefined}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-2">
                <span>{s.name}</span>
                <span className="flex items-center gap-2">
                  <MasteryBadge level={s.level} needsReview={s.needsReview} size="sm" showLabel={false} />
                  <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-90">
                    ›
                  </span>
                </span>
              </summary>
              <div className="border-t border-line px-3 py-4">
                {s.hasEvidence ? null : <RecommendationCallout rec={s.recommendation} />}
                <SkillDetailBody skill={s} responseLimit={responseLimit} level={(base + 1) as Level} />
              </div>
            </details>
          ))}
        </div>
      ) : single ? (
        <SkillDetailBody skill={single} responseLimit={responseLimit} showSummary={false} level={base} />
      ) : null}
    </div>
  );
}
