import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CircleDashed,
  ClipboardCheck,
  Clock,
  Lock,
  RotateCcw,
  Shuffle,
  TriangleAlert,
} from "lucide-react";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  MasteryBadge,
  PageHeader,
  ProgressBar,
  Section,
  StatTile,
  formatDate,
  pluralize,
} from "@/components/ui";
import { ExternalLink, MiniLabel } from "@/components/student/Bits";
import { pct } from "@/components/student/format";
import { ReadinessDisclaimer } from "@/components/student/ReadinessDisclaimer";
import { requireStudent } from "@/modules/auth/session";
import { getCatalog, getCourseTree } from "@/modules/curriculum/queries";
import {
  READINESS_DISCLAIMER,
  getExamReadiness,
  listExamPracticeOptions,
  type ReviewStep,
} from "@/modules/examprep/service";

type Params = { params: Promise<{ courseId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { courseId } = await params;
  const tree = await getCourseTree(courseId);
  return { title: tree ? `Exam prep · ${tree.course.name}` : "Exam prep" };
}

const STEP_KIND: Record<ReviewStep["kind"], { label: string; tone: "warn" | "info" | "neutral" }> =
  {
    prerequisite: { label: "Prerequisite", tone: "info" },
    review_due: { label: "Review", tone: "neutral" },
    weak_skill: { label: "Strengthen", tone: "warn" },
  };

export default async function ExamPrepCoursePage({ params }: Params) {
  const user = await requireStudent();
  const { courseId } = await params;
  const tree = await getCourseTree(courseId);
  if (!tree) notFound();
  const course = tree.course;
  const breadcrumbs = [{ label: "Exam prep", href: "/app/exam-prep" }, { label: course.name }];

  if (tree.skillIds.length === 0) {
    const pilots = (await getCatalog()).filter((c) => c.lessonCount > 0);
    return (
      <>
        <PageHeader breadcrumbs={breadcrumbs} title={`${course.name} exam prep`} />
        <ReadinessDisclaimer text={READINESS_DISCLAIMER} className="mb-8" />
        <EmptyState
          icon={<Lock />}
          title="No practice evidence possible yet"
          description={
            <>
              AceAP doesn&apos;t have lessons or questions for {course.name}, so there&apos;s
              nothing to summarise. The{" "}
              <ExternalLink href={course.sourceUrl}>College Board course page</ExternalLink>{" "}
              describes the exam.
            </>
          }
          action={
            <>
              {pilots.slice(0, 3).map((p) => (
                <ButtonLink key={p.id} href={`/app/exam-prep/${p.id}`} variant="secondary">
                  {p.name}
                </ButtonLink>
              ))}
            </>
          }
        />
      </>
    );
  }

  const r = await getExamReadiness({ id: user.id, role: user.role }, user.id, course.id);
  const options = await listExamPracticeOptions(course.id);
  const proficient = Math.round(r.masteryShare * r.totalSkills);
  const unitTitle = new Map(tree.units.map((u) => [u.id, `Unit ${u.number}`]));
  const examSets = options.assessments.filter((a) => a.kind === "exam_practice");
  const unitTests = options.assessments.filter((a) => a.kind === "unit_test");
  const { attempts, consistency } = r.practiceResults;

  return (
    <>
      <PageHeader
        breadcrumbs={breadcrumbs}
        eyebrow="AP exam preparation"
        title={course.name}
        description={`What your practice in AceAP shows, as of ${formatDate(r.generatedAt, { withTime: true, short: true })}.`}
        actions={
          <ButtonLink href={`/app/courses/${course.id}`} variant="secondary">
            Course page
          </ButtonLink>
        }
      />
      <ReadinessDisclaimer text={r.disclaimer} />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Skills with evidence"
          value={`${r.skillsWithEvidence} / ${r.totalSkills}`}
          hint={`${pct(r.coverage)} coverage of AceAP's skills`}
        />
        <StatTile
          label="Proficient or better"
          value={`${proficient} / ${r.totalSkills}`}
          hint="Untested skills count against this"
        />
        <StatTile
          label="Practice sets taken"
          value={attempts.length}
          hint={
            consistency
              ? `Last ${consistency.recentCount}: ${consistency.min}–${consistency.max}%`
              : "Exam practice and unit tests"
          }
        />
      </div>

      <Section
        title="Mastery evidence by unit"
        id="units"
        description="AceAP covers only part of this course. Outline units have no lessons or questions yet."
      >
        <Card padded={false}>
          <ul className="divide-y divide-line">
            {r.perUnit.map((u) => (
              <li
                key={u.unitId}
                className="grid gap-2 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
              >
                <div className="min-w-0">
                  <p
                    className={
                      u.status === "available"
                        ? "text-sm font-medium text-ink"
                        : "text-sm text-muted"
                    }
                  >
                    Unit {u.number}: {u.title}
                  </p>
                  {u.status === "available" ? (
                    <div className="mt-1.5 max-w-sm">
                      <ProgressBar
                        value={u.totalSkills ? u.skillsWithEvidence / u.totalSkills : 0}
                        label={`Unit ${u.number} evidence coverage`}
                        tone="info"
                        size="sm"
                      />
                      <p className="mt-1 text-xs text-muted">
                        Evidence on {u.skillsWithEvidence} of {u.totalSkills} skills ·{" "}
                        {u.proficientOrBetter} Proficient or better
                      </p>
                    </div>
                  ) : null}
                </div>
                {u.status === "available" ? (
                  <MasteryBadge level={u.level} size="sm" />
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <Lock aria-hidden="true" className="size-3" />
                    Outline only — not covered yet
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <Section
          title="Objectives to strengthen"
          id="weak"
          className="mt-0!"
          description="Based on answers you've given — weakest first."
        >
          <Card className="py-2 sm:py-2">
            {r.weakestObjectives.length ? (
              <ul className="divide-y divide-line">
                {r.weakestObjectives.map((w) => (
                  <li key={w.objectiveId} className="py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-muted">
                          {w.code} · {unitTitle.get(w.unitId) ?? ""}
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-ink">{w.description}</p>
                      </div>
                      <MasteryBadge level={w.level} size="sm" className="shrink-0" />
                    </div>
                    <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-muted">
                      <TriangleAlert
                        aria-hidden="true"
                        className="mt-0.5 size-3.5 shrink-0 text-warn"
                      />
                      <span>
                        <span className="sr-only">Why: </span>
                        {w.reason}
                      </span>
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {w.weakSkills.map((s) => (
                        <li key={s.skillId}>
                          <Link
                            href={`/app/skills/${s.skillId}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-line py-0.5 pl-0.5 pr-2.5 text-xs text-ink-2 hover:border-line-strong hover:text-ink"
                          >
                            <MasteryBadge level={s.level} size="sm" showLabel={false} />
                            {s.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-3 text-sm text-muted">
                {r.skillsWithEvidence
                  ? "Every skill you've been tested on is Proficient or better."
                  : "Nothing to show yet — you haven't answered graded questions in this course."}
              </p>
            )}
          </Card>
        </Section>

        <Section
          title="No evidence yet"
          id="untested"
          className="mt-0!"
          description="Untested isn't the same as weak — AceAP simply hasn't seen your work here."
        >
          <Card className="space-y-5">
            <div>
              <MiniLabel>Not tested at all</MiniLabel>
              {r.untested.length ? (
                <ul className="space-y-2">
                  {r.untested.map((u) => (
                    <li key={u.objectiveId} className="flex items-start gap-2 text-sm">
                      <CircleDashed
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-m-none"
                      />
                      <span className="min-w-0">
                        <span className="mr-1.5 font-mono text-xs text-muted">{u.code}</span>
                        <span className="text-ink-2">{u.description}</span>
                        <span className="block text-xs text-muted">
                          {unitTitle.get(u.unitId)} · {pluralize(u.totalSkills, "skill")} untested
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Every objective has at least some evidence.</p>
              )}
            </div>
            {r.partiallyTested.length ? (
              <div>
                <MiniLabel>Partly tested</MiniLabel>
                <p className="mb-2 text-xs text-muted">
                  What you&apos;ve been tested on looks strong, but some skills have no evidence
                  yet.
                </p>
                <ul className="space-y-2">
                  {r.partiallyTested.map((u) => (
                    <li key={u.objectiveId} className="text-sm">
                      <span className="mr-1.5 font-mono text-xs text-muted">{u.code}</span>
                      <span className="text-ink-2">{u.description}</span>
                      <span className="block text-xs text-muted">
                        Evidence on {u.skillsWithEvidence} of {u.totalSkills} skills
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>
        </Section>
      </div>

      <Section
        title="Recommended review sequence"
        id="sequence"
        description="Prerequisites come before the skills that build on them."
      >
        {r.reviewSequence.length ? (
          <Card padded={false}>
            <ol className="divide-y divide-line">
              {r.reviewSequence.map((s, i) => (
                <li
                  key={s.skillId}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6"
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-xs font-semibold text-muted"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/app/skills/${s.skillId}`}
                        className="text-sm font-medium text-ink hover:underline underline-offset-4"
                      >
                        <span className="sr-only">Step {i + 1}: </span>
                        {s.name}
                      </Link>
                      <Badge tone={STEP_KIND[s.kind].tone}>{STEP_KIND[s.kind].label}</Badge>
                      <MasteryBadge level={s.level} size="sm" />
                    </div>
                    <p className="mt-1 text-xs text-muted">{s.why}</p>
                  </div>
                  <ButtonLink
                    href={s.href}
                    size="sm"
                    variant="secondary"
                    aria-label={`Practise ${s.name}`}
                  >
                    Practise
                  </ButtonLink>
                </li>
              ))}
            </ol>
          </Card>
        ) : (
          <EmptyState
            bare
            className="rounded-card border border-line bg-surface"
            icon={<ClipboardCheck />}
            title="No review needed right now"
            description={
              r.skillsWithEvidence
                ? "Nothing you've practised is below Proficient or due for review. Practice untested objectives to widen your evidence."
                : "Answer some questions first — the sequence is built from your results."
            }
          />
        )}
      </Section>

      <div className="mt-10 grid gap-8 lg:grid-cols-5">
        <Section
          title="Practice results"
          id="results"
          className="mt-0! lg:col-span-3"
          description="Exam practice sets and unit tests you've submitted."
        >
          <Card padded={false}>
            {attempts.length ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max text-left text-sm">
                    <caption className="sr-only">Submitted practice sets</caption>
                    <thead className="bg-surface-2 text-xs text-muted">
                      <tr>
                        <th scope="col" className="px-5 py-2.5 font-semibold sm:px-6">
                          Set
                        </th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">
                          Date
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-right font-semibold sm:pr-6">
                          Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {attempts.slice(0, 10).map((a) => (
                        <tr key={a.attemptId}>
                          <th scope="row" className="px-5 py-2.5 font-medium text-ink sm:px-6">
                            {a.title}
                            <span className="ml-2 text-xs font-normal text-muted">
                              {a.mode === "exam_practice" ? "Exam practice" : "Unit test"}
                              {a.timed ? " · timed" : ""}
                            </span>
                          </th>
                          <td className="px-3 py-2.5 tabular-nums text-muted">
                            {a.submittedAt ? formatDate(a.submittedAt, { short: true }) : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-ink sm:pr-6">
                            {a.percent !== null ? `${a.percent}%` : "Awaiting grading"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-line px-5 py-3 text-xs text-muted sm:px-6">
                  {consistency ? (
                    <>
                      <span className="font-medium text-ink-2">
                        Consistency: {consistency.min}–{consistency.max}% (spread{" "}
                        {consistency.spread} points, average {consistency.mean}%).
                      </span>{" "}
                      {consistency.note}
                    </>
                  ) : (
                    "Take at least two scored sets to see how consistent your results are."
                  )}
                </div>
              </>
            ) : (
              <p className="px-5 py-4 text-sm text-muted sm:px-6">
                No exam practice or unit tests submitted yet.
              </p>
            )}
          </Card>
        </Section>

        <Section title="Practice sets" id="sets" className="mt-0! lg:col-span-2">
          <Card padded={false}>
            <CardHeader
              title="Choose a set"
              description="Sets taken without hints give the clearest picture."
            />
            <CardBody className="space-y-4">
              {[...examSets, ...unitTests].map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{a.title}</p>
                    <p className="text-xs text-muted">
                      {a.kind === "exam_practice"
                        ? "Exam practice"
                        : `Unit test${a.unitId && unitTitle.get(a.unitId) ? ` · ${unitTitle.get(a.unitId)}` : ""}`}{" "}
                      · {pluralize(a.questionCount, "question")}
                      {a.timeLimitSeconds ? (
                        <>
                          {" "}
                          · <Clock aria-hidden="true" className="inline size-3" />{" "}
                          {Math.round(a.timeLimitSeconds / 60)} min
                        </>
                      ) : null}
                    </p>
                  </div>
                  <ButtonLink
                    href={a.href}
                    size="sm"
                    variant="secondary"
                    aria-label={`Start ${a.title}`}
                  >
                    Start
                  </ButtonLink>
                </div>
              ))}
              <div className="flex items-start justify-between gap-3 border-t border-line pt-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                    <Shuffle aria-hidden="true" className="size-3.5 text-faint" />
                    Adaptive mixed set
                  </p>
                  <p className="text-xs text-muted">{options.mixedAdaptive.reason}</p>
                </div>
                {options.mixedAdaptive.available ? (
                  <ButtonLink
                    href={`/app/assessments/mixed-${course.id}`}
                    size="sm"
                    aria-label="Start an adaptive mixed set"
                  >
                    Start
                  </ButtonLink>
                ) : (
                  <span className="text-xs text-muted">Not available</span>
                )}
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                    <RotateCcw aria-hidden="true" className="size-3.5 text-faint" />
                    Mixed review
                  </p>
                  <p className="text-xs text-muted">Prioritises skills that are due for review.</p>
                </div>
                <ButtonLink
                  href={`/app/review/${course.id}`}
                  size="sm"
                  variant="secondary"
                  iconRight={<ArrowRight aria-hidden="true" className="size-3.5" />}
                >
                  Review
                </ButtonLink>
              </div>
            </CardBody>
          </Card>
        </Section>
      </div>
    </>
  );
}
