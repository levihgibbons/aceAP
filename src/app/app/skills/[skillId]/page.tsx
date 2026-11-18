import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Check, Circle, Dumbbell, Library, RotateCcw, TriangleAlert } from "lucide-react";
import { InlineMarkdown } from "@/components/content/Markdown";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  MasteryBadge,
  PageHeader,
  Section,
  formatDate,
  formatRelativeTime,
  pluralize,
} from "@/components/ui";
import { MiniLabel } from "@/components/student/Bits";
import { MISCONCEPTION_STATUS, MODE_LABEL, REVIEW_REASON_TEXT } from "@/components/student/format";
import { LevelHistoryChart } from "@/components/student/LevelHistoryChart";
import { DomainError } from "@/lib/errors";
import { requireStudent } from "@/modules/auth/session";
import { getCourseTree, getSkillCourseId } from "@/modules/curriculum/queries";
import { getCourseOverview, getSkillDetail, type SkillDetail } from "@/modules/learning/overview";
import { LEVEL_LABEL, LEVEL_RANK, type SkillExplanation } from "@/modules/mastery/types";

type Params = { params: Promise<{ skillId: string }> };

const MAX_ATTEMPTS_SHOWN = 30;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { skillId } = await params;
  const courseId = skillId.length <= 200 ? await getSkillCourseId(skillId) : null;
  const tree = courseId ? await getCourseTree(courseId) : null;
  return { title: tree?.skills.get(skillId)?.name ?? "Skill" };
}

async function loadDetail(
  user: { id: string; role: Parameters<typeof getSkillDetail>[0]["role"] },
  skillId: string,
): Promise<SkillDetail | null> {
  if (typeof skillId !== "string" || skillId.length === 0 || skillId.length > 200) return null;
  try {
    return await getSkillDetail({ id: user.id, role: user.role }, user.id, skillId);
  } catch (e) {
    if (e instanceof DomainError && e.code === "not_found") return null;
    throw e;
  }
}

/** Which requirement categories the engine's `unmet` lines refer to, so the rest can be shown as done. */
const REQUIREMENTS: { re: RegExp; done: (x: SkillExplanation) => string | null }[] = [
  {
    re: /stronger record/,
    done: (x) => (x.attempts ? "A strong enough record of correct answers" : null),
  },
  {
    re: /graded evidence overall/,
    done: (x) => (x.attempts ? "Enough graded evidence overall" : null),
  },
  {
    re: /without help/,
    done: (x) =>
      x.independentCorrect
        ? `${pluralize(x.independentCorrect, "correct answer")} without help`
        : null,
  },
  {
    re: /different question/,
    done: (x) =>
      x.uniqueQuestionsCorrect
        ? `${pluralize(x.uniqueQuestionsCorrect, "different question")} answered correctly`
        : null,
  },
  {
    re: /type(s)? of problem/,
    done: (x) =>
      x.distinctPatternsCorrect
        ? `${pluralize(x.distinctPatternsCorrect, "type")} of problem answered correctly`
        : null,
  },
  {
    re: /quiz or test/,
    done: (x) =>
      x.summativeIndependentCorrect
        ? `${pluralize(x.summativeIndependentCorrect, "correct answer")} on a quiz or test`
        : null,
  },
  {
    re: /sitting/,
    done: (x) =>
      x.distinctSittings > 1
        ? `${x.distinctSittings} separate sittings with a correct answer`
        : null,
  },
];

export default async function SkillPage({ params }: Params) {
  const user = await requireStudent();
  const { skillId } = await params;
  const detail = await loadDetail(user, skillId);
  if (!detail) notFound();

  const { skill, state, level, explanation: x, evidence, history, misconceptions, review } = detail;
  const now = new Date();
  const tree = await getCourseTree(skill.courseId);
  const node = tree?.skills.get(skill.id);
  const overview = tree
    ? await getCourseOverview({ id: user.id, role: user.role }, user.id, skill.courseId)
    : null;
  const unit =
    tree && node
      ? tree.units.find((u) =>
          node.objectiveIds.some((oid) => tree.objectives.get(oid)?.unitId === u.id),
        )
      : undefined;
  const objectives =
    tree && node
      ? node.objectiveIds.map((id) => tree.objectives.get(id)).filter((ob) => ob !== undefined)
      : [];
  const lessons =
    tree && node
      ? node.lessonIds.map((id) => tree.lessons.get(id)).filter((l) => l !== undefined)
      : [];
  const prereqs =
    tree && node
      ? node.prerequisites.map((id) => ({
          id,
          name: tree.skills.get(id)?.name ?? id,
          state: overview?.states.get(id),
        }))
      : [];
  const dependents = tree
    ? [...tree.skills.values()]
        .filter((s) => s.prerequisites.includes(skill.id))
        .map((s) => ({ id: s.id, name: s.name, state: overview?.states.get(s.id) }))
    : [];
  const levelChanges = history.filter((h, i) => i === 0 || h.level !== history[i - 1].level).length;

  const unmet = x?.unmet ?? [];
  const done = x
    ? REQUIREMENTS.filter((r) => !unmet.some((u) => r.re.test(u)))
        .map((r) => r.done(x))
        .filter((s): s is string => Boolean(s))
    : [];
  const weakest = x?.weakestPattern
    ? (skill.patternLabels[x.weakestPattern] ?? x.weakestPattern)
    : null;
  const peakAbove = x && LEVEL_RANK[x.peakLevel] > LEVEL_RANK[level];

  const breadcrumbs = [
    { label: "My courses", href: "/app/courses" },
    ...(tree ? [{ label: tree.course.name, href: `/app/courses/${tree.course.id}` }] : []),
    ...(tree && unit
      ? [
          {
            label: `Unit ${unit.number}`,
            href: `/app/courses/${tree.course.id}/units/${unit.slug}`,
          },
        ]
      : []),
    { label: skill.name },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={breadcrumbs}
        eyebrow="Skill"
        title={skill.name}
        description={skill.description}
        actions={
          <>
            <ButtonLink
              href={`/app/practice/${skill.id}`}
              icon={<Dumbbell aria-hidden="true" className="size-4" />}
            >
              Practise this skill
            </ButtonLink>
            <ButtonLink
              href={`/app/vault/concepts/${encodeURIComponent(skill.id)}`}
              variant="secondary"
              icon={<Library aria-hidden="true" className="size-4" />}
            >
              Concept page
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card as="section" aria-labelledby="state-title">
            <h2 id="state-title" className="sr-only">
              Your current level
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <MasteryBadge level={level} needsReview={state?.needsReview} />
              {peakAbove && x ? (
                <span className="text-xs text-muted">
                  Highest level reached: {LEVEL_LABEL[x.peakLevel]}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2">
              {x
                ? x.summary
                : "You haven't answered a graded question on this skill yet, so it counts as Not started. Practice, a lesson check or a quiz will give it a level."}
            </p>
            {state?.needsReview && x?.reviewReason ? (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-m-review-soft px-3 py-2 text-sm text-ink-2">
                <RotateCcw aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-m-review" />
                <span>
                  <span className="font-medium text-ink">Needs review. </span>
                  {REVIEW_REASON_TEXT[x.reviewReason]} Your level stays the same until new answers
                  change it.
                </span>
              </p>
            ) : null}
          </Card>

          <Card as="section" aria-labelledby="next-title">
            <h2 id="next-title" className="font-display text-base font-semibold text-ink">
              {x?.nextLevel
                ? `What's needed for ${LEVEL_LABEL[x.nextLevel]}`
                : x
                  ? "Top level reached"
                  : "Getting started"}
            </h2>
            {!x ? (
              <p className="mt-2 text-sm text-muted">
                Answer one graded question to reach Developing. Proficient needs at least 3 correct
                answers without help on different questions.
              </p>
            ) : !x.nextLevel ? (
              <p className="mt-2 text-sm text-muted">
                You&apos;ve met every requirement for Mastered. Spaced reviews will check that it
                sticks.
              </p>
            ) : (
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <div>
                  <MiniLabel>Still needed</MiniLabel>
                  {unmet.length ? (
                    <ul className="space-y-2">
                      {unmet.map((u) => (
                        <li key={u} className="flex items-start gap-2 text-sm text-ink">
                          <Circle
                            aria-hidden="true"
                            className="mt-0.5 size-4 shrink-0 text-faint"
                          />
                          <span>
                            <span className="sr-only">Not yet: </span>
                            {u.charAt(0).toUpperCase() + u.slice(1)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">
                      Nothing — your level updates with your next answer.
                    </p>
                  )}
                </div>
                <div>
                  <MiniLabel>Done so far</MiniLabel>
                  {done.length ? (
                    <ul className="space-y-2">
                      {done.map((d) => (
                        <li key={d} className="flex items-start gap-2 text-sm text-ink-2">
                          <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-good" />
                          <span>
                            <span className="sr-only">Done: </span>
                            {d}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">
                      Nothing yet — every answer without help moves this forward.
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>

          {x ? (
            <Card as="section" aria-labelledby="evidence-title" padded={false}>
              <CardHeader
                titleAs="h2"
                titleId="evidence-title"
                title="The evidence behind this level"
                description="Answers with hints, retries, the tutor or a shown solution count for less."
              />
              <CardBody>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  <Stat label="Graded answers" value={x.attempts} />
                  <Stat
                    label="Correct without help"
                    value={`${x.independentCorrect} of ${x.independentAttempts}`}
                  />
                  <Stat label="With help or retries" value={x.assistedAttempts} />
                  <Stat
                    label="Different questions"
                    value={`${x.uniqueQuestions}`}
                    hint={`${x.uniqueQuestionsCorrect} answered correctly`}
                  />
                  <Stat
                    label="Correct on a quiz or test"
                    value={x.summativeIndependentCorrect}
                    hint="without help"
                  />
                  <Stat label="Sittings with a correct answer" value={x.distinctSittings} />
                </dl>
                <p className="mt-4 text-xs text-muted">
                  Last shown without help:{" "}
                  {x.lastDemonstratedAt
                    ? `${formatDate(x.lastDemonstratedAt)} (${formatRelativeTime(x.lastDemonstratedAt)})`
                    : "not yet"}
                </p>
                {x.patterns.length ? (
                  <div className="mt-5">
                    <MiniLabel>By type of problem</MiniLabel>
                    <div className="overflow-x-auto rounded-lg border border-line">
                      <table className="w-full min-w-max text-left text-sm">
                        <caption className="sr-only">
                          Results by problem type for {skill.name}
                        </caption>
                        <thead className="bg-surface-2 text-xs text-muted">
                          <tr>
                            <th scope="col" className="px-3 py-2 font-semibold">
                              Problem type
                            </th>
                            <th scope="col" className="px-3 py-2 font-semibold">
                              Correct without help
                            </th>
                            <th scope="col" className="px-3 py-2 font-semibold">
                              All answers
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {x.patterns.map((p) => (
                            <tr key={p.pattern}>
                              <th scope="row" className="px-3 py-2 font-medium text-ink">
                                {skill.patternLabels[p.pattern] ?? p.pattern}
                                {x.weakestPattern === p.pattern ? (
                                  <Badge tone="warn" className="ml-2">
                                    Weakest
                                  </Badge>
                                ) : null}
                              </th>
                              <td className="px-3 py-2 tabular-nums text-ink-2">
                                {p.independentCorrect} of {p.independentAttempts}
                              </td>
                              <td className="px-3 py-2 tabular-nums text-muted">{p.attempts}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {weakest ? (
                      <p className="mt-2 text-xs text-muted">
                        Weakest area: {weakest}. Practice tends to draw more of this type.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ) : null}

          {history.length ? (
            <Card as="section" aria-labelledby="history-title" padded={false}>
              <CardHeader
                titleAs="h2"
                titleId="history-title"
                title="Level over time"
                description={`${pluralize(history.length, "recalculation")}, ${pluralize(Math.max(0, levelChanges - 1), "level change")}.`}
              />
              <CardBody>
                <LevelHistoryChart history={history} skillName={skill.name} />
              </CardBody>
            </Card>
          ) : null}

          <Section
            title="Graded answers"
            id="attempts"
            description="Every answer that counts as evidence, newest first. Answers and solutions aren't shown here."
          >
            {evidence.length ? (
              <Card padded={false}>
                <ol className="divide-y divide-line">
                  {evidence.slice(0, MAX_ATTEMPTS_SHOWN).map((e) => (
                    <li key={e.id} className="px-5 py-4 sm:px-6">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                        <Badge tone={e.correct ? "good" : e.score > 0 ? "warn" : "bad"}>
                          {e.correct ? "Correct" : e.score > 0 ? "Partly correct" : "Incorrect"}
                        </Badge>
                        {e.independent ? <Badge tone="accent">Without help</Badge> : null}
                        {e.hintsUsed > 0 ? <Badge>{pluralize(e.hintsUsed, "hint")}</Badge> : null}
                        {e.tryNumber > 1 ? <Badge>Retry {e.tryNumber}</Badge> : null}
                        {e.solutionViewed ? <Badge>Solution shown</Badge> : null}
                        {e.tutorUsed ? <Badge>Tutor used</Badge> : null}
                        <span className="text-xs text-muted">
                          {MODE_LABEL[e.mode]} · {e.patternLabel} ·{" "}
                          <time dateTime={e.occurredAt.toISOString()}>
                            {formatDate(e.occurredAt, { withTime: true, short: true })}
                          </time>
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-ink-2">
                        <InlineMarkdown>{e.prompt}</InlineMarkdown>
                      </p>
                      {e.misconceptionTitle ? (
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-warn">
                          <TriangleAlert aria-hidden="true" className="size-3.5" />
                          Possible misconception: {e.misconceptionTitle}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
                {evidence.length > MAX_ATTEMPTS_SHOWN ? (
                  <p className="border-t border-line px-5 py-3 text-xs text-muted sm:px-6">
                    Showing the latest {MAX_ATTEMPTS_SHOWN} of {evidence.length} graded answers.
                  </p>
                ) : null}
              </Card>
            ) : (
              <EmptyState
                icon={<Dumbbell />}
                title="No graded answers yet"
                description="Practice questions, lesson checks and quizzes on this skill will appear here."
                action={<ButtonLink href={`/app/practice/${skill.id}`}>Start practice</ButtonLink>}
              />
            )}
          </Section>
        </div>

        <aside className="space-y-5" aria-label="Skill details">
          <Card>
            <h2 className="text-sm font-semibold text-ink">Study this skill</h2>
            <div className="mt-3 flex flex-col gap-2">
              <ButtonLink
                href={`/app/practice/${skill.id}`}
                fullWidth
                icon={<Dumbbell aria-hidden="true" className="size-4" />}
              >
                Practise this skill
              </ButtonLink>
              <ul className="mt-1 space-y-1">
                {lessons.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/app/learn/${l.id}`}
                      className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
                    >
                      <BookOpen aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-faint" />
                      <span className="min-w-0">Re-read: {l.title}</span>
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href={`/app/vault/concepts/${encodeURIComponent(skill.id)}`}
                    className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
                  >
                    <Library aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-faint" />
                    <span className="min-w-0">Open concept page in vault</span>
                  </Link>
                </li>
              </ul>
            </div>
          </Card>

          <Card>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <RotateCcw aria-hidden="true" className="size-4 text-faint" />
              Review schedule
            </h2>
            <p className="mt-2 text-sm text-muted">
              {review
                ? review.dueAt.getTime() <= now.getTime()
                  ? `A spaced review is due (since ${formatDate(review.dueAt, { short: true })}). Course review will include this skill.`
                  : `Next spaced review ${formatRelativeTime(review.dueAt)} (${formatDate(review.dueAt, { short: true })}). Each successful review spaces the next one further out.`
                : "Spaced reviews start once this skill reaches Proficient."}
            </p>
            {state?.needsReview && x?.reviewReason ? (
              <p className="mt-2 text-xs text-muted">
                Why it&apos;s flagged: {REVIEW_REASON_TEXT[x.reviewReason]}
              </p>
            ) : null}
            {tree ? (
              <ButtonLink
                href={`/app/review/${tree.course.id}`}
                variant="link"
                size="sm"
                className="mt-2"
              >
                Go to course review
              </ButtonLink>
            ) : null}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-ink">Prerequisites</h2>
            {prereqs.length ? (
              <ul className="mt-2 space-y-1">
                {prereqs.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/app/skills/${p.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
                    >
                      <span className="min-w-0">{p.name}</span>
                      <MasteryBadge
                        level={p.state?.level ?? "not_started"}
                        needsReview={p.state?.needsReview}
                        size="sm"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">None within this course.</p>
            )}
            {dependents.length ? (
              <>
                <h3 className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-faint">
                  Builds toward
                </h3>
                <ul className="mt-2 space-y-1">
                  {dependents.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/app/skills/${d.id}`}
                        className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
                      >
                        <span className="min-w-0">{d.name}</span>
                        <MasteryBadge
                          level={d.state?.level ?? "not_started"}
                          needsReview={d.state?.needsReview}
                          size="sm"
                          showLabel={false}
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </Card>

          {objectives.length ? (
            <Card>
              <h2 className="text-sm font-semibold text-ink">Learning objectives</h2>
              <ul className="mt-2 space-y-2">
                {objectives.map((ob) => (
                  <li key={ob.id} className="text-sm text-ink-2">
                    <span className="mr-1.5 font-mono text-xs text-muted">{ob.code}</span>
                    {ob.description}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card as="section" aria-labelledby="misc-title">
            <h2 id="misc-title" className="text-sm font-semibold text-ink">
              Possible misconceptions
            </h2>
            {misconceptions.length ? (
              <ul className="mt-3 space-y-4">
                {misconceptions.map((m) => {
                  const st = MISCONCEPTION_STATUS[m.status];
                  return (
                    <li key={m.id} className="rounded-lg border border-line p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={st.tone}>{st.label}</Badge>
                        <span className="text-xs text-muted">
                          Seen {pluralize(m.occurrences, "time")}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-medium text-ink">{m.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">{m.description}</p>
                      <p className="mt-2 text-xs leading-relaxed text-ink-2">
                        <span className="font-medium">How to fix it: </span>
                        {m.remediation}
                      </p>
                      <p className="mt-2 text-xs text-muted">
                        {st.hint}{" "}
                        {m.correctSinceLast > 0
                          ? `${pluralize(m.correctSinceLast, "correct answer")} without help since it last appeared. `
                          : ""}
                        Last seen {formatDate(m.lastObservedAt, { short: true })}.
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">
                None detected. When a wrong answer matches a known mistake, it shows up here with
                how to fix it.
              </p>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 font-display text-xl font-semibold tabular-nums text-ink">{value}</dd>
      {hint ? <dd className="text-xs text-muted">{hint}</dd> : null}
    </div>
  );
}
