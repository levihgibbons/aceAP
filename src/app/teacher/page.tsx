import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Plug, Plus, Users } from "lucide-react";
import { Badge, ButtonLink, Card, CardBody, CardHeader, EmptyState, PageHeader, Pill, Section, SegmentedProgress, formatDate, formatRelativeTime, pluralize } from "@/components/ui";
import { columnReadings, matrixDistribution, summariseStudent } from "@/components/teacher/analysis";
import { classHref, interventionHref, studentHref } from "@/components/teacher/format";
import { assignmentStatuses, gradebookOrNull, requestTime } from "@/components/teacher/server/data";
import { getDb } from "@/db/client";
import { requireStaff } from "@/modules/auth/session";
import { getMasteryMatrix, getRecentActivity, objectivesNeedingAttention } from "@/modules/classrooms/analytics";
import { listClassesForStaff, staffOrganizations } from "@/modules/classrooms/service";
import { getIntegrationOverview } from "@/modules/integrations/lms/service";

export const metadata: Metadata = { title: "Overview" };

const LMS_TONE = { not_configured: "neutral", configured_unverified: "warn", verified: "good", error: "bad" } as const;
const LMS_SHORT = { not_configured: "Not configured", configured_unverified: "Configured, not verified", verified: "Connected", error: "Error" } as const;

export default async function TeacherOverview() {
  const user = await requireStaff();
  const classes = await listClassesForStaff(user);
  const firstName = user.name.split(" ")[0];

  if (classes.length === 0) {
    return (
      <>
        <PageHeader title={`Welcome, ${firstName}`} description="Create a class to see which students understand which objectives — and why." />
        <EmptyState
          icon={<Users />}
          title="No classes yet"
          description="Create a class, share its join code, and mastery appears here as soon as students start answering questions."
          action={<ButtonLink href="/teacher/classes/new">Create a class</ButtonLink>}
        />
      </>
    );
  }

  const db = await getDb();
  const [perClass, orgs] = await Promise.all([
    Promise.all(
      classes.map(async (c) => {
        const [objectives, skills, activity, gradebook] = await Promise.all([
          getMasteryMatrix(user, c.id, { groupBy: "objective" }),
          getMasteryMatrix(user, c.id, { groupBy: "skill" }),
          getRecentActivity(user, c.id, 8),
          gradebookOrNull(user, c.id),
        ]);
        return { cls: c, objectives, skills, activity, gradebook };
      }),
    ),
    staffOrganizations(db, user.id),
  ]);
  const uniqueOrgs = [...new Map(orgs.map((o) => [o.id, o])).values()];
  const integrations = await Promise.all(
    uniqueOrgs.map(async (o) => {
      try {
        return { org: o, overview: await getIntegrationOverview(o.id) };
      } catch (e) {
        console.error("[teacher] integration status unavailable", e);
        return { org: o, overview: null };
      }
    }),
  );

  const attention = perClass.flatMap(({ cls, objectives, skills }) =>
    objectivesNeedingAttention(objectives, 3).map((item) => {
      const readings = columnReadings(objectives, skills, item.columnId);
      return { cls, item, difficulty: readings.difficulty.length, partial: readings.partial.length + readings.emerging.length, noEvidence: readings.no_evidence.length };
    }),
  ).filter((a) => a.difficulty > 0 || a.partial > 0);

  const support = perClass.flatMap(({ cls, objectives, skills }) =>
    objectives.students
      .map((s) => ({ cls, student: s, sum: summariseStudent(objectives, skills, s.id) }))
      .filter((x) => x.sum.difficulty.length >= 2)
      .sort((a, b) => b.sum.difficulty.length - a.sum.difficulty.length),
  );
  const littleEvidence = perClass.flatMap(({ cls, objectives, skills }) =>
    objectives.students
      .map((s) => ({ cls, student: s, sum: summariseStudent(objectives, skills, s.id) }))
      .filter((x) => x.sum.totalColumns > 0 && x.sum.noEvidence.length * 2 >= x.sum.totalColumns),
  );

  const activity = perClass
    .flatMap(({ cls, activity }) => activity.map((a) => ({ ...a, cls })))
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 10);

  const now = requestTime();
  const deadlines = perClass
    .flatMap(({ cls, gradebook }) => (gradebook ? assignmentStatuses(gradebook).map((a) => ({ ...a, cls })) : []))
    .filter((a) => a.dueAt && a.dueAt.getTime() >= now)
    .sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime())
    .slice(0, 6);
  const gradebookMissing = perClass.some((p) => p.gradebook === null);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Where each class stands, what needs attention, and what’s due."
        actions={
          <ButtonLink href="/teacher/classes/new" variant="secondary" icon={<Plus aria-hidden="true" className="size-4" />}>
            New class
          </ButtonLink>
        }
      />

      <Section title="Active classes">
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {perClass.map(({ cls, objectives }) => {
            const dist = matrixDistribution(objectives);
            const withEvidence = dist.total - (dist.segments.find((s) => s.level === "not_started")?.count ?? 0);
            return (
              <li key={cls.id}>
                <Card interactive className="flex h-full flex-col">
                  <p className="text-xs font-medium text-accent">{cls.courseName}</p>
                  <h3 className="mt-1 font-display text-base font-semibold text-ink">
                    <Link href={classHref(cls.id)} className="rounded after:absolute after:inset-0 focus-visible:outline-none">
                      {cls.name}
                    </Link>
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <Pill>{pluralize(cls.studentCount, "student")}</Pill>
                    <Pill>
                      Code <span className="font-mono font-semibold tracking-wider text-ink">{cls.joinCode}</span>
                    </Pill>
                  </div>
                  <div className="mt-4 flex-1">
                    {dist.total > 0 ? (
                      <>
                        <SegmentedProgress
                          label={`${cls.name}: objective levels across all students`}
                          total={dist.total}
                          segments={dist.segments.filter((s) => s.level !== "not_started")}
                          showLegend
                          size="sm"
                        />
                        <p className="mt-2 text-xs text-muted">
                          {withEvidence} of {dist.total} student–objective pairs have evidence ({objectives.columns.length} objectives × {objectives.students.length} students).
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted">{objectives.students.length === 0 ? "No students yet — share the join code." : "No objectives with lessons yet."}</p>
                    )}
                  </div>
                  <div className="relative z-10 mt-4 flex gap-2">
                    <ButtonLink href={classHref(cls.id, "mastery")} size="sm" variant="secondary">
                      Heatmap<span className="sr-only"> for {cls.name}</span>
                    </ButtonLink>
                    <ButtonLink href={classHref(cls.id, "interventions")} size="sm" variant="ghost">
                      Interventions<span className="sr-only"> for {cls.name}</span>
                    </ButtonLink>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </Section>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card padded={false} as="section" aria-labelledby="attention-title">
          <CardHeader titleId="attention-title" titleAs="h2" title="Objectives needing attention" description="Where the most students with graded work are below Proficient. Difficulty, thin evidence and no evidence are counted separately — unknown is not weak." />
          <CardBody>
            {attention.length === 0 ? (
              <p className="text-sm text-muted">No objective shows students below Proficient right now.</p>
            ) : (
              <ul className="divide-y divide-line">
                {attention.map(({ cls, item, difficulty, partial, noEvidence }) => (
                  <li key={`${cls.id}-${item.columnId}`} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Link href={interventionHref(cls.id, item.columnId)} className="text-sm font-semibold text-ink underline-offset-4 hover:underline">
                        {item.label}
                        <span className="sr-only"> in {cls.name}: plan an intervention</span>
                      </Link>
                      <span className="text-xs text-muted">{cls.name}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted">{item.description}</p>
                    <p className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                      <Badge tone="warn">{difficulty} showing difficulty</Badge>
                      {partial ? <Badge tone="neutral">{partial} need more evidence</Badge> : null}
                      <Badge tone="info">{noEvidence} no evidence yet</Badge>
                      <Badge tone="good">{item.proficient} Proficient+</Badge>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card padded={false} as="section" aria-labelledby="support-title">
          <CardHeader
            titleId="support-title"
            titleAs="h2"
            title="Students who may benefit from support"
            description="Graded answers show difficulty (below Proficient, mostly incorrect) on 2 or more objectives. A starting point for a conversation, not a label."
          />
          <CardBody>
            {support.length === 0 ? (
              <p className="text-sm text-muted">No student’s answers show difficulty on 2 or more objectives.</p>
            ) : (
              <ul className="divide-y divide-line">
                {support.slice(0, 8).map(({ cls, student, sum }) => (
                  <li key={`${cls.id}-${student.id}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                    <span className="text-sm">
                      <Link href={studentHref(student.id, cls.id)} className="font-medium text-ink underline-offset-4 hover:underline">
                        {student.name}
                      </Link>{" "}
                      <span className="text-muted">· {cls.name}</span>
                    </span>
                    <span className="text-xs text-muted">
                      Answers show difficulty on {sum.difficulty.length} of {sum.totalColumns} objectives
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {littleEvidence.length ? (
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-xs font-medium text-muted">Not enough evidence yet (no graded work on half or more of the objectives)</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {littleEvidence.slice(0, 12).map(({ cls, student }) => (
                    <li key={`${cls.id}-${student.id}`}>
                      <Link
                        href={studentHref(student.id, cls.id)}
                        className="inline-flex rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs text-ink-2 hover:border-line-strong hover:text-ink"
                      >
                        {student.name}
                        <span className="sr-only">, {cls.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card padded={false} as="section" aria-labelledby="activity-title">
          <CardHeader titleId="activity-title" titleAs="h2" title="Recent activity" />
          <CardBody>
            {activity.length === 0 ? (
              <p className="text-sm text-muted">No lessons completed or quizzes submitted yet.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {activity.map((a, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="min-w-0 text-ink-2">
                      <Link href={studentHref(a.studentId, a.cls.id)} className="font-medium text-ink underline-offset-4 hover:underline">
                        {a.studentName}
                      </Link>{" "}
                      {a.summary} <span className="text-xs text-muted">· {a.cls.name}</span>
                    </span>
                    <time dateTime={a.at.toISOString()} className="shrink-0 text-xs text-muted">
                      {formatRelativeTime(a.at)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card padded={false} as="section" aria-labelledby="deadlines-title">
            <CardHeader titleId="deadlines-title" titleAs="h2" title="Upcoming deadlines" action={<CalendarClock aria-hidden="true" className="size-4 text-faint" />} />
            <CardBody>
              {deadlines.length === 0 ? (
                <p className="text-sm text-muted">{gradebookMissing ? "Deadlines aren’t available right now." : "Nothing due soon."}</p>
              ) : (
                <ul className="divide-y divide-line text-sm">
                  {deadlines.map((d) => (
                    <li key={d.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <Link href={`/teacher/assignments?class=${d.cls.id}`} className="min-w-0 font-medium text-ink underline-offset-4 hover:underline">
                          {d.title}
                        </Link>
                        <span className="shrink-0 tabular-nums text-ink-2">
                          {d.submitted} / {d.assigned} <span className="sr-only">submitted</span>
                        </span>
                      </div>
                      <p className="text-xs text-muted">
                        {d.cls.name} · due {formatDate(d.dueAt, { short: true, withTime: true })} ({formatRelativeTime(d.dueAt)})
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card padded={false} as="section" aria-labelledby="lms-title">
            <CardHeader titleId="lms-title" titleAs="h2" title="Canvas integration" action={<Plug aria-hidden="true" className="size-4 text-faint" />} />
            <CardBody>
              {integrations.length === 0 ? (
                <p className="text-sm text-muted">You aren’t linked to a school, so there’s no LMS connection to show.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {integrations.map(({ org, overview }) => (
                    <li key={org.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-ink-2">{org.name}</span>
                        {overview ? <Badge tone={LMS_TONE[overview.status]}>{LMS_SHORT[overview.status]}</Badge> : <Badge tone="neutral">Unavailable</Badge>}
                      </div>
                      {overview ? <p className="mt-0.5 text-xs text-muted">{overview.statusLabel}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
              <ButtonLink href="/teacher/integrations" variant="link" size="sm" className="mt-3 px-0">
                Manage integrations
              </ButtonLink>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
