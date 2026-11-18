import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, PartyPopper, Users } from "lucide-react";
import { Badge, ButtonLink, Card, CardBody, CardHeader, DataTable, EmptyState, MasteryBadge, Section, SegmentedProgress, formatDate, formatRelativeTime, pluralize } from "@/components/ui";
import { ClassHeader } from "@/components/teacher/ClassHeader";
import { CopyButton } from "@/components/teacher/CopyButton";
import { RemoveStudentButton } from "@/components/teacher/RemoveStudentButton";
import { summariseStudent } from "@/components/teacher/analysis";
import { classHref, dayLabel, firstParam, studentHref } from "@/components/teacher/format";
import { assignmentStatuses, gradebookOrNull, loadClassContext, orNotFound, requestTime } from "@/components/teacher/server/data";
import { requireStaff } from "@/modules/auth/session";
import { formatDuration } from "@/modules/analytics/activeTime";
import { getClassEngagement, getMasteryMatrix, getRecentActivity } from "@/modules/classrooms/analytics";
import { MASTERY_LEVELS, type MasteryLevel } from "@/modules/mastery/types";

export const metadata: Metadata = { title: "Class" };

export default async function ClassPage({ params, searchParams }: { params: Promise<{ classId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireStaff();
  const { classId } = await params;
  const sp = await searchParams;
  const ctx = await loadClassContext(user, classId);
  const created = firstParam(sp.created) === "1";

  const [objectives, skills, engagement, activity, gradebook] = await Promise.all([
    orNotFound(getMasteryMatrix(user, classId, { groupBy: "objective" })),
    orNotFound(getMasteryMatrix(user, classId, { groupBy: "skill" })),
    orNotFound(getClassEngagement(user, classId, 14)),
    orNotFound(getRecentActivity(user, classId, 30)),
    gradebookOrNull(user, classId),
  ]);
  const students = objectives.students;

  // Current unit: the first unit with lessons where most of the class isn't yet Proficient.
  const unitRows = ctx.tree.units
    .filter((u) => u.status === "available" && u.skillIds.length)
    .map((u) => {
      const counts = Object.fromEntries(MASTERY_LEVELS.map((l) => [l, 0])) as Record<MasteryLevel, number>;
      for (const col of skills.columns.filter((c) => c.unitId === u.id)) for (const l of MASTERY_LEVELS) counts[l] += col.distribution[l];
      const total = u.skillIds.length * students.length;
      return { unit: u, counts, total, share: total ? (counts.proficient + counts.mastered) / total : 0 };
    });
  const current = unitRows.find((r) => r.share < 0.8) ?? unitRows[unitRows.length - 1];

  const assessments = activity.filter((a) => a.type === "ASSESSMENT_SUBMITTED" || a.type === "REVIEW_COMPLETED").slice(0, 6);
  const statuses = gradebook ? assignmentStatuses(gradebook) : [];
  const now = requestTime();
  const upcoming = [...statuses].sort((a, b) => {
    const ad = a.dueAt?.getTime() ?? Infinity;
    const bd = b.dueAt?.getTime() ?? Infinity;
    const aPast = ad < now ? 1 : 0;
    const bPast = bd < now ? 1 : 0;
    return aPast - bPast || (aPast ? bd - ad : ad - bd);
  });

  const rosterRows = students.map((s) => {
    const sum = summariseStudent(objectives, skills, s.id);
    const reviewSkills = skills.columns.filter((c) => skills.cells[s.id]?.[c.id]?.needsReview).length;
    const e = engagement.students[s.id];
    return {
      id: s.id,
      name: (
        <span className="flex flex-wrap items-center gap-2">
          <Link href={studentHref(s.id, classId)} className="rounded underline-offset-4 hover:underline">
            {s.name}
          </Link>
          {s.isDemo ? <Badge tone="neutral">Demo</Badge> : null}
        </span>
      ),
      joined: formatDate(s.joinedAt, { short: true }),
      objectives: (
        <span>
          <span className="font-medium tabular-nums text-ink">
            {sum.proficient} / {sum.totalColumns}
          </span>{" "}
          <span className="text-xs text-muted">Proficient+</span>
          <span className="block text-xs text-muted">
            Evidence on {sum.withEvidence} of {sum.totalColumns}
            {sum.difficulty.length ? ` · ${sum.difficulty.length} showing difficulty` : ""}
          </span>
        </span>
      ),
      review: reviewSkills ? <Badge tone="info">{pluralize(reviewSkills, "skill")}</Badge> : <span className="text-muted">—</span>,
      active: e && e.activeMs > 0 ? formatDuration(e.activeMs) : <span className="text-muted">None</span>,
      last: e?.lastActiveDay ? dayLabel(e.lastActiveDay) : <span className="text-muted">—</span>,
      actions: (
        <span className="flex items-center justify-end gap-1">
          <ButtonLink href={studentHref(s.id, classId)} variant="ghost" size="sm">
            View<span className="sr-only"> {s.name}</span>
          </ButtonLink>
          <RemoveStudentButton classId={classId} className={ctx.name} studentId={s.id} studentName={s.name} />
        </span>
      ),
    };
  });

  return (
    <>
      <ClassHeader
        ctx={ctx}
        current="overview"
        description={`${ctx.organizationName} · ${pluralize(ctx.studentCount, "student")}`}
        actions={
          <ButtonLink href={classHref(classId, "mastery")} variant="primary">
            Open mastery heatmap
          </ButtonLink>
        }
      />

      {created || students.length === 0 ? (
        <Card className="mb-8 border-accent/40 bg-accent-soft" aria-labelledby="join-title">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="join-title" className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                {created ? <PartyPopper aria-hidden="true" className="size-5" /> : null}
                {created ? "Class created — invite your students" : "Invite your students"}
              </h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-2">
                <li>Students sign in to AceAP (or create a free student account).</li>
                <li>They enter this code where AceAP asks them to join a class.</li>
                <li>They appear in the roster below as soon as they join. Codes are not case-sensitive.</li>
              </ol>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <p className="text-xs font-medium text-muted">Join code</p>
              <p className="font-mono text-4xl font-semibold tracking-[0.2em] text-ink" aria-label={`Join code ${ctx.joinCode.split("").join(" ")}`}>
                {ctx.joinCode}
              </p>
              <CopyButton value={ctx.joinCode} label="Copy join code" variant="primary" />
            </div>
          </div>
        </Card>
      ) : null}

      <Section id="roster" title="Roster" description="Mastery and engagement are separate measures. Active time is an estimate and never evidence of learning.">
        <DataTable
          caption={`Students in ${ctx.name}`}
          columns={[
            { key: "name", header: "Student", rowHeader: true },
            { key: "joined", header: "Joined" },
            { key: "objectives", header: "Objectives" },
            { key: "review", header: "Needs review" },
            { key: "active", header: "Est. active (14 d)", align: "right" },
            { key: "last", header: "Last active" },
            { key: "actions", header: <span className="sr-only">Actions</span>, align: "right" },
          ]}
          rows={rosterRows}
          empty={<EmptyState icon={<Users />} title="No students yet" description="Share the join code above. Students appear here as soon as they join." />}
        />
      </Section>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card padded={false}>
          <CardHeader
            title="Units"
            description={!current ? "No units with lessons yet." : students.length === 0 ? "Unit progress appears once students join." : `Current unit: Unit ${current.unit.number} — the first where most of the class isn’t yet Proficient.`}
          />
          <CardBody>
            {unitRows.length === 0 ? (
              <p className="text-sm text-muted">This course has no units with lessons yet.</p>
            ) : (
              <ul className="space-y-4">
                {unitRows.map((r) => (
                  <li key={r.unit.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 font-medium text-ink">
                        Unit {r.unit.number}: {r.unit.title}
                        {students.length > 0 && current?.unit.id === r.unit.id ? (
                          <Badge tone="accent" className="ml-2">
                            Current
                          </Badge>
                        ) : null}
                      </span>
                      <Link href={`${classHref(classId, "mastery")}?unit=${encodeURIComponent(r.unit.id)}`} className="shrink-0 text-xs font-medium text-accent underline-offset-4 hover:underline">
                        Heatmap<span className="sr-only"> for unit {r.unit.number}</span>
                      </Link>
                    </div>
                    <SegmentedProgress
                      label={`Unit ${r.unit.number} skills across the class`}
                      total={r.total}
                      segments={MASTERY_LEVELS.map((level) => ({ level, count: r.counts[level] }))}
                      showLegend
                      size="sm"
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card padded={false}>
          <CardHeader title="Recent quizzes, tests and reviews" />
          <CardBody>
            {assessments.length === 0 ? (
              <p className="text-sm text-muted">No submitted quizzes, tests or reviews yet.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {assessments.map((a, i) => (
                  <li key={`${a.studentId}-${i}`} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="min-w-0 text-ink-2">
                      <Link href={studentHref(a.studentId, classId)} className="font-medium text-ink underline-offset-4 hover:underline">
                        {a.studentName}
                      </Link>{" "}
                      {a.summary}
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
      </div>

      <Section
        title="Assignments"
        className="mt-10"
        action={
          <ButtonLink href={`/teacher/assignments?class=${classId}`} variant="secondary" size="sm" icon={<ClipboardList aria-hidden="true" className="size-4" />}>
            All assignments
          </ButtonLink>
        }
      >
        {gradebook === null ? (
          <p className="text-sm text-muted">Assignment status isn’t available right now.</p>
        ) : upcoming.length === 0 ? (
          <EmptyState
            icon={<ClipboardList />}
            title="No assignments yet"
            description="Assign a lesson, targeted skill practice or a quiz."
            action={
              <ButtonLink href={`/teacher/assignments/new?class=${classId}`} size="sm">
                New assignment
              </ButtonLink>
            }
          />
        ) : (
          <DataTable
            caption={`Assignment status in ${ctx.name}`}
            columns={[
              { key: "title", header: "Assignment", rowHeader: true },
              { key: "due", header: "Due" },
              { key: "submitted", header: "Submitted", align: "right" },
              { key: "flags", header: "Late / missing" },
            ]}
            rows={upcoming.map((a) => ({
              id: a.id,
              title: a.title,
              due: a.dueAt ? `${formatDate(a.dueAt, { short: true })}${a.dueAt.getTime() < now ? " (past)" : ""}` : "No due date",
              submitted: `${a.submitted} of ${a.assigned}`,
              flags: (
                <span className="flex flex-wrap gap-1">
                  {a.late ? <Badge tone="warn">{a.late} late</Badge> : null}
                  {a.missing ? <Badge tone="bad">{a.missing} missing</Badge> : null}
                  {!a.late && !a.missing ? <span className="text-muted">—</span> : null}
                </span>
              ),
            }))}
          />
        )}
      </Section>

      <p className="mt-8 flex flex-wrap items-center gap-2 text-xs text-muted">
        Objective levels use the conservative rollup:
        <MasteryBadge level="approaching" size="sm" /> is the highest an objective can read until every skill has evidence.
      </p>
    </>
  );
}
