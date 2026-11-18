import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Compass, LineChart } from "lucide-react";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  MasteryBadge,
  MasteryLegend,
  PageHeader,
  Section,
  TabLinks,
  formatDate,
  pluralize,
} from "@/components/ui";
import { CompletionMeter, MasteryOverview, MiniLabel } from "@/components/student/Bits";
import { MISCONCEPTION_STATUS } from "@/components/student/format";
import { HowMasteryWorks } from "@/components/student/HowMasteryWorks";
import type { MisconceptionStatus } from "@/db/schema";
import { requireStudent } from "@/modules/auth/session";
import {
  getCourseOverview,
  getEnrolledCourses,
  getSkillDetail,
  type DetectedMisconceptionView,
} from "@/modules/learning/overview";
import { LEVEL_RANK, type MasteryLevel } from "@/modules/mastery/types";

export const metadata: Metadata = { title: "Progress" };

const MAX_CHANGES = 12;

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireStudent();
  const actor = { id: user.id, role: user.role };
  const sp = await searchParams;
  const requested = Array.isArray(sp.course) ? sp.course[0] : sp.course;

  const enrolled = await getEnrolledCourses(actor, user.id);
  const header = (
    <PageHeader
      title="Progress"
      description="What your graded answers show, objective by objective — kept separate from how many lessons you've finished."
      actions={
        <ButtonLink href="#how-mastery-works" variant="ghost" size="sm">
          How mastery works
        </ButtonLink>
      }
    />
  );

  if (enrolled.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={<LineChart />}
          title="No courses yet"
          description="Join a class or add a course with lessons, and your progress will build here as you answer questions."
          action={
            <>
              <ButtonLink href="/app">Join a class</ButtonLink>
              <ButtonLink href="/app/courses" variant="secondary">
                Browse courses
              </ButtonLink>
            </>
          }
        />
        <div className="mt-10">
          <HowMasteryWorks />
        </div>
      </>
    );
  }

  const selected = enrolled.find((c) => c.courseId === requested) ?? enrolled[0];
  const o = await getCourseOverview(actor, user.id, selected.courseId);
  const { tree } = o;
  const skillName = (id: string) => tree.skills.get(id)?.name ?? id;

  // Level changes from the snapshot history of every skill with evidence (sequential: one DB connection).
  const changes: { skillId: string; from: MasteryLevel | null; to: MasteryLevel; at: Date }[] = [];
  for (const skillId of tree.skillIds.filter((id) => o.states.has(id))) {
    const d = await getSkillDetail(actor, user.id, skillId);
    d.history.forEach((h, i) => {
      const prev = i === 0 ? null : d.history[i - 1].level;
      if (prev !== h.level) changes.push({ skillId, from: prev, to: h.level, at: h.at });
    });
  }
  changes.sort((a, b) => b.at.getTime() - a.at.getTime());

  const buckets: { key: string; title: string; statuses: MisconceptionStatus[]; empty: string }[] =
    [
      {
        key: "open",
        title: "Open",
        statuses: ["hypothesis", "teacher_confirmed"],
        empty: "No open misconceptions.",
      },
      {
        key: "potential",
        title: "Potentially resolved",
        statuses: ["potentially_resolved"],
        empty: "None right now.",
      },
      { key: "resolved", title: "Resolved", statuses: ["resolved"], empty: "None yet." },
    ];

  return (
    <>
      {header}
      {enrolled.length > 1 ? (
        <TabLinks
          label="Courses"
          current={selected.courseId}
          className="mb-8"
          items={enrolled.map((c) => ({
            id: c.courseId,
            label: c.name,
            href: `/app/progress?course=${encodeURIComponent(c.courseId)}`,
          }))}
        />
      ) : null}

      {tree.skillIds.length === 0 ? (
        <EmptyState
          icon={<Compass />}
          title={`Nothing to track in ${selected.name} yet`}
          description="AceAP doesn't have lessons or practice for this course yet, so there's no evidence to show."
          action={<ButtonLink href="/app/courses?lessons=1">Courses with lessons</ButtonLink>}
        />
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2">
            <Card as="section" aria-labelledby="completion-title">
              <MiniLabel>Completion</MiniLabel>
              <h2 id="completion-title" className="sr-only">
                Lessons finished in {selected.name}
              </h2>
              <CompletionMeter completed={o.lessonsCompleted} total={o.lessonsTotal} />
              <p className="mt-3 text-xs text-muted">
                Counts lessons you&apos;ve read to the end. It doesn&apos;t affect mastery.
              </p>
            </Card>
            <Card as="section" aria-labelledby="mastery-title">
              <MiniLabel>Mastery</MiniLabel>
              <h2 id="mastery-title" className="sr-only">
                Skill mastery in {selected.name}
              </h2>
              <MasteryOverview
                rollup={o.rollups.course}
                label={`${selected.name} skill mastery`}
                untestedNote
              />
            </Card>
          </div>

          <Section
            title="Objective by objective"
            id="objectives"
            description="Coverage is the share of an objective's skills with at least one graded answer."
            action={<MasteryLegend className="hidden lg:flex" />}
          >
            <div className="space-y-5">
              {tree.units
                .filter((u) => u.status === "available")
                .map((u) => (
                  <Card key={u.id} padded={false}>
                    <CardHeader
                      title={
                        <Link
                          href={`/app/courses/${tree.course.id}/units/${u.slug}`}
                          className="hover:underline underline-offset-4"
                        >
                          Unit {u.number}: {u.title}
                        </Link>
                      }
                      action={
                        o.rollups.units.get(u.id) ? (
                          <MasteryBadge level={o.rollups.units.get(u.id)!.level} size="sm" />
                        ) : undefined
                      }
                    />
                    <CardBody>
                      <ul className="divide-y divide-line">
                        {u.topics
                          .flatMap((t) => t.objectives)
                          .map((ob) => {
                            const r = o.rollups.objectives.get(ob.id);
                            return (
                              <li
                                key={ob.id}
                                className="grid gap-3 py-3.5 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_17rem]"
                              >
                                <div className="min-w-0">
                                  <p className="font-mono text-xs text-muted">{ob.code}</p>
                                  <p className="mt-0.5 text-sm text-ink">{ob.description}</p>
                                  <p className="mt-1 text-xs text-muted">
                                    {ob.skillIds.map((id, i) => (
                                      <span key={id}>
                                        {i > 0 ? ", " : ""}
                                        <Link
                                          href={`/app/skills/${id}`}
                                          className="hover:text-ink hover:underline underline-offset-4"
                                        >
                                          {skillName(id)}
                                        </Link>
                                      </span>
                                    ))}
                                  </p>
                                </div>
                                {r ? (
                                  <MasteryOverview
                                    rollup={r}
                                    label={`${ob.code} skill mastery`}
                                    size="sm"
                                  />
                                ) : null}
                              </li>
                            );
                          })}
                      </ul>
                    </CardBody>
                  </Card>
                ))}
            </div>
          </Section>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <Section
              title="Recent level changes"
              id="changes"
              className="mt-0!"
              description="Each change follows new graded answers."
            >
              <Card className="py-2 sm:py-2">
                {changes.length ? (
                  <ol className="divide-y divide-line">
                    {changes.slice(0, MAX_CHANGES).map((c, i) => {
                      const up = c.from === null || LEVEL_RANK[c.to] > LEVEL_RANK[c.from];
                      return (
                        <li
                          key={`${c.skillId}-${c.at.toISOString()}-${i}`}
                          className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            {up ? (
                              <ArrowUpRight
                                aria-hidden="true"
                                className="size-4 shrink-0 text-good"
                              />
                            ) : (
                              <ArrowDownRight
                                aria-hidden="true"
                                className="size-4 shrink-0 text-warn"
                              />
                            )}
                            <Link
                              href={`/app/skills/${c.skillId}`}
                              className="truncate text-sm font-medium text-ink hover:underline underline-offset-4"
                            >
                              {skillName(c.skillId)}
                            </Link>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 pl-6 sm:pl-0">
                            {c.from ? (
                              <>
                                <MasteryBadge level={c.from} size="sm" />
                                <ArrowRight aria-hidden="true" className="size-3 text-faint" />
                                <span className="sr-only">to</span>
                              </>
                            ) : (
                              <span className="text-xs text-muted">First evidence:</span>
                            )}
                            <MasteryBadge level={c.to} size="sm" />
                            <time dateTime={c.at.toISOString()} className="text-xs text-muted">
                              {formatDate(c.at, { short: true })}
                            </time>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="py-3 text-sm text-muted">
                    No level changes yet. They appear as soon as you answer graded questions.
                  </p>
                )}
              </Card>
            </Section>

            <Section
              title="Misconceptions over time"
              id="misconceptions"
              className="mt-0!"
              description="Detected from answer patterns. Correct answers without help resolve them."
            >
              <Card className="space-y-5">
                {buckets.map((b) => {
                  const items = o.misconceptions.filter((m) => b.statuses.includes(m.status));
                  return (
                    <div key={b.key}>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                        {b.title}
                        <span className="rounded-full bg-sunken px-2 py-0.5 text-xs font-medium tabular-nums text-muted">
                          {items.length}
                        </span>
                      </h3>
                      {items.length ? (
                        <ul className="mt-2 space-y-2">
                          {items.map((m) => (
                            <MisconceptionRow key={m.id} m={m} skill={skillName(m.skillId)} />
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-sm text-muted">{b.empty}</p>
                      )}
                    </div>
                  );
                })}
              </Card>
            </Section>
          </div>
        </>
      )}

      <div className="mt-10">
        <HowMasteryWorks />
      </div>
    </>
  );
}

function MisconceptionRow({ m, skill }: { m: DetectedMisconceptionView; skill: string }) {
  const st = MISCONCEPTION_STATUS[m.status];
  const span =
    formatDate(m.firstObservedAt, { short: true }) === formatDate(m.lastObservedAt, { short: true })
      ? `Seen ${formatDate(m.lastObservedAt, { short: true })}`
      : `First seen ${formatDate(m.firstObservedAt, { short: true })}, last ${formatDate(m.lastObservedAt, { short: true })}`;
  return (
    <li className="rounded-lg border border-line px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink">{m.title}</p>
        {m.status === "teacher_confirmed" ? <Badge tone={st.tone}>{st.label}</Badge> : null}
      </div>
      <p className="mt-0.5 text-xs text-muted">
        <Link
          href={`/app/skills/${m.skillId}`}
          className="hover:text-ink hover:underline underline-offset-4"
        >
          {skill}
        </Link>{" "}
        · {pluralize(m.occurrences, "time")} · {span}
        {m.correctSinceLast > 0
          ? ` · ${pluralize(m.correctSinceLast, "correct answer")} since`
          : ""}
      </p>
    </li>
  );
}
