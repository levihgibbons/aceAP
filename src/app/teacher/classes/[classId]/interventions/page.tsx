import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDown, ArrowRight, ArrowUp, ClipboardPlus, RefreshCw, Users } from "lucide-react";
import { Badge, Button, ButtonLink, Card, CardBody, CardHeader, DataTable, EmptyState, Field, Input, MasteryBadge, Section, Select, formatDate, pluralize } from "@/components/ui";
import { ClassHeader } from "@/components/teacher/ClassHeader";
import { WEAK_ESTIMATE, readCell } from "@/components/teacher/analysis";
import { classHref, firstParam, newAssignmentHref, skillEvidenceHref, studentHref } from "@/components/teacher/format";
import { classAssignments, firstAssignmentAttempts, latestBySkill, loadClassContext, loadSnapshots, orNotFound, requestTime } from "@/components/teacher/server/data";
import { requireStaff } from "@/modules/auth/session";
import { getInterventionPlan, getMasteryMatrix, objectivesNeedingAttention, type MatrixCell, type RosterStudent } from "@/modules/classrooms/analytics";
import { rollup } from "@/modules/mastery/aggregation";
import { LEVEL_LABEL, LEVEL_RANK, type MasteryLevel } from "@/modules/mastery/types";

export const metadata: Metadata = { title: "Interventions" };

type SP = Record<string, string | string[] | undefined>;
const DAY = 86_400_000;

function GroupCard({
  id,
  title,
  description,
  count,
  tone,
  action,
  children,
}: {
  id: string;
  title: string;
  description: string;
  count: number;
  tone: "warn" | "info" | "neutral" | "good";
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card as="section" padded={false} aria-labelledby={`${id}-title`}>
      <CardHeader
        titleId={`${id}-title`}
        titleAs="h3"
        title={
          <span className="flex items-center gap-2">
            {title} <Badge tone={tone}>{pluralize(count, "student")}</Badge>
          </span>
        }
        description={description}
      />
      <CardBody>
        {children}
        {action ? <div className="mt-4 flex flex-wrap gap-2">{action}</div> : null}
      </CardBody>
    </Card>
  );
}

export default async function InterventionsPage({ params, searchParams }: { params: Promise<{ classId: string }>; searchParams: Promise<SP> }) {
  const user = await requireStaff();
  const { classId } = await params;
  const sp = await searchParams;
  const ctx = await loadClassContext(user, classId);
  const tree = ctx.tree;

  const [objectives, skills, assignments] = await Promise.all([
    orNotFound(getMasteryMatrix(user, classId, { groupBy: "objective" })),
    orNotFound(getMasteryMatrix(user, classId, { groupBy: "skill" })),
    classAssignments(user, classId),
  ]);

  const requested = firstParam(sp.column);
  const valid = (id: string | undefined): id is string => Boolean(id && (objectives.columns.some((c) => c.id === id) || skills.columns.some((c) => c.id === id)));
  const columnId = valid(requested) ? requested : (objectivesNeedingAttention(objectives, 1)[0]?.columnId ?? objectives.columns[0]?.id ?? skills.columns[0]?.id);

  if (!columnId || objectives.students.length === 0) {
    return (
      <>
        <ClassHeader ctx={ctx} current="interventions" title="Interventions" />
        <EmptyState
          icon={<Users />}
          title={objectives.students.length === 0 ? "No students yet" : "Nothing to plan yet"}
          description={objectives.students.length === 0 ? "Interventions are built from students’ mastery evidence. Share the join code to get started." : "This course has no objectives with lessons yet."}
        />
      </>
    );
  }

  const plan = await orNotFound(getInterventionPlan(user, classId, columnId));
  const column = plan.column;
  const isObjective = column.kind === "objective";
  const studentIds = objectives.students.map((s) => s.id);

  // Separate "evidence shows difficulty" from "too little evidence to call" and "partly tested".
  const difficulty: { student: RosterStudent; cell: MatrixCell; weakSkills: string[] }[] = [];
  const emerging: { student: RosterStudent; cell: MatrixCell; thinSkills: string[] }[] = [];
  const partial: { student: RosterStudent; cell: MatrixCell; untested: string[] }[] = [];
  for (const { student, cell } of plan.needsSupport) {
    const skillRow = skills.cells[student.id] ?? {};
    const reading = readCell(cell, column.skillIds, skillRow);
    const below = column.skillIds.filter((id) => skillRow[id] && skillRow[id].skillsWithEvidence > 0 && LEVEL_RANK[skillRow[id].level] < LEVEL_RANK.proficient);
    if (reading === "partial") partial.push({ student, cell, untested: column.skillIds.filter((id) => !skillRow[id] || skillRow[id].skillsWithEvidence === 0) });
    else if (reading === "emerging") emerging.push({ student, cell, thinSkills: below });
    else difficulty.push({ student, cell, weakSkills: below.filter((id) => (skillRow[id].estimate ?? 0) < WEAK_ESTIMATE) });
  }
  const skillName = (id: string) => tree.skills.get(id)?.name ?? id;
  const weakSkillUnion = [...new Set(difficulty.flatMap((d) => d.weakSkills))];
  const gatherIds = [...plan.insufficientEvidence.map((s) => s.id), ...emerging.map((p) => p.student.id), ...partial.map((p) => p.student.id)];
  const reassessment = plan.suggestedAssessments[0];

  // ── Before / after ────────────────────────────────────────────────────────
  const relevantAssignments = assignments.filter((a) => !a.archivedAt && a.skillIds.some((s) => column.skillIds.includes(s)));
  const sinceParam = firstParam(sp.since);
  const since = relevantAssignments.find((a) => a.id === sinceParam) ?? null;
  const dateParam = firstParam(sp.date);
  const now = requestTime();
  const defaultDate = new Date(now - 14 * DAY).toISOString().slice(0, 10);
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && !Number.isNaN(Date.parse(`${dateParam}T00:00:00Z`)) ? dateParam : defaultDate;
  const cutoffDate = new Date(`${date}T00:00:00Z`);
  const [snapshots, starts] = await Promise.all([
    loadSnapshots(user, ctx.courseId, studentIds, { skillIds: column.skillIds }),
    since ? firstAssignmentAttempts(user, since.id, studentIds) : Promise.resolve(new Map<string, Date>()),
  ]);
  const nowMatrix = isObjective ? objectives : skills;
  const comparison = objectives.students.map((s) => {
    const cutoff = since ? (starts.get(s.id) ?? null) : cutoffDate;
    const nowLevel: MasteryLevel = nowMatrix.cells[s.id]?.[column.id]?.level ?? "not_started";
    if (!cutoff) return { student: s, cutoff: null, then: null, now: nowLevel, delta: null };
    const before = snapshots.filter((r) => r.userId === s.id && r.createdAt < cutoff);
    const then = rollup(column.skillIds, latestBySkill(before)).level;
    return { student: s, cutoff, then, now: nowLevel, delta: LEVEL_RANK[nowLevel] - LEVEL_RANK[then] };
  });
  const compared = comparison.filter((c) => c.delta !== null);
  const up = compared.filter((c) => (c.delta ?? 0) > 0).length;
  const down = compared.filter((c) => (c.delta ?? 0) < 0).length;

  const objectiveOptions = tree.units
    .filter((u) => u.status === "available")
    .map((u) => ({ unit: u, cols: objectives.columns.filter((c) => c.unitId === u.id) }))
    .filter((g) => g.cols.length);

  const nameList = (list: RosterStudent[]) =>
    list.length ? (
      <ul className="flex flex-wrap gap-2">
        {list.map((s) => (
          <li key={s.id}>
            <Link href={studentHref(s.id, classId)} className="inline-flex rounded-full border border-line bg-surface px-2.5 py-0.5 text-sm text-ink-2 hover:border-line-strong hover:text-ink">
              {s.name}
            </Link>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-muted">Nobody right now.</p>
    );

  return (
    <>
      <ClassHeader
        ctx={ctx}
        current="interventions"
        title="Interventions"
        description="A temporary, evidence-based grouping for one objective or skill — recomputed from current mastery every time you open it. These are not ability groups and are never stored."
      />

      <form method="get" action={classHref(classId, "interventions")} className="mb-8 flex flex-wrap items-end gap-3">
        <Field label="Objective or skill" htmlFor="column" className="min-w-72 flex-1">
          <Select id="column" name="column" defaultValue={column.id}>
            {objectiveOptions.map((g) => (
              <optgroup key={g.unit.id} label={`Unit ${g.unit.number} objectives`}>
                {g.cols.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} — {c.description}
                  </option>
                ))}
              </optgroup>
            ))}
            <optgroup label="Individual skills">
              {skills.columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          </Select>
        </Field>
        <Button type="submit" variant="secondary">
          Show plan
        </Button>
      </form>

      <Card className="mb-8">
        <p className="text-xs font-medium text-muted">{isObjective ? "Objective" : "Skill"}</p>
        <h2 className="mt-1 font-display text-xl font-semibold text-ink">
          {column.label}
          {isObjective ? <span className="font-normal text-muted"> — {column.description}</span> : null}
        </h2>
        {isObjective ? (
          <p className="mt-2 text-sm text-muted">
            Skills: {plan.skills.map((s) => s.name).join(" · ")}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">{column.description}</p>
        )}
        {!valid(requested) ? <p className="mt-3 text-xs text-muted">Showing the {isObjective ? "objective" : "skill"} where the most students with evidence are below Proficient.</p> : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <GroupCard
          id="support"
          title="Needs support"
          tone="warn"
          count={difficulty.length}
          description="Below Proficient, and answers on at least one skill here are mostly incorrect."
          action={
            difficulty.length ? (
              <>
                <ButtonLink
                  size="sm"
                  href={newAssignmentHref({ classId, skills: weakSkillUnion.length ? weakSkillUnion : column.skillIds, students: difficulty.map((d) => d.student.id) })}
                  icon={<ClipboardPlus aria-hidden="true" className="size-4" />}
                >
                  Assign targeted practice ({difficulty.length})
                </ButtonLink>
                {reassessment ? (
                  <ButtonLink
                    size="sm"
                    variant="secondary"
                    href={newAssignmentHref({ classId, kind: "assessment", assessment: reassessment.id, skills: column.skillIds, students: difficulty.map((d) => d.student.id) })}
                    icon={<RefreshCw aria-hidden="true" className="size-4" />}
                  >
                    Assign a reassessment
                  </ButtonLink>
                ) : null}
              </>
            ) : null
          }
        >
          {difficulty.length ? (
            <ul className="divide-y divide-line">
              {difficulty.map(({ student, cell, weakSkills }) => (
                <li key={student.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5 first:pt-0">
                  <div className="min-w-0">
                    <Link href={studentHref(student.id, classId)} className="text-sm font-medium text-ink underline-offset-4 hover:underline">
                      {student.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {weakSkills.length ? (
                        <>
                          Mostly incorrect on:{" "}
                          {weakSkills.map((id, i) => (
                            <span key={id}>
                              {i > 0 ? ", " : ""}
                              <Link href={skillEvidenceHref(student.id, id, classId)} className="underline-offset-2 hover:underline">
                                {skillName(id)}
                              </Link>
                            </span>
                          ))}
                        </>
                      ) : null}
                      {cell.totalSkills > 1 ? ` · ${cell.skillsWithEvidence} of ${cell.totalSkills} skills tested` : ""}
                    </p>
                  </div>
                  <MasteryBadge level={cell.level} needsReview={cell.needsReview} size="sm" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No student’s graded work shows difficulty here.</p>
          )}
        </GroupCard>

        <GroupCard
          id="gather"
          title="Not enough evidence yet"
          tone="info"
          count={gatherIds.length}
          description="No graded work, too few answers to call, or only some skills tested. Unknown is not weak — assign a few questions to find out."
          action={
            gatherIds.length ? (
              <ButtonLink size="sm" variant="secondary" href={newAssignmentHref({ classId, skills: column.skillIds, students: gatherIds })} icon={<ClipboardPlus aria-hidden="true" className="size-4" />}>
                Assign practice to find out ({gatherIds.length})
              </ButtonLink>
            ) : null
          }
        >
          {nameList(plan.insufficientEvidence)}
          {emerging.length ? (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted">Mostly correct so far — not enough evidence for Proficient yet</p>
              <ul className="mt-1 space-y-1 text-sm">
                {emerging.map((p) => (
                  <li key={p.student.id}>
                    <Link href={studentHref(p.student.id, classId)} className="font-medium text-ink underline-offset-4 hover:underline">
                      {p.student.name}
                    </Link>{" "}
                    <span className="text-muted">— {p.thinSkills.map(skillName).join(", ")}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {partial.length ? (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted">Partly tested — tested skills look secure</p>
              <ul className="mt-1 space-y-1 text-sm">
                {partial.map((p) => (
                  <li key={p.student.id}>
                    <Link href={studentHref(p.student.id, classId)} className="font-medium text-ink underline-offset-4 hover:underline">
                      {p.student.name}
                    </Link>{" "}
                    <span className="text-muted">— untested: {p.untested.map(skillName).join(", ")}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </GroupCard>

        <GroupCard
          id="review"
          title="Needs review"
          tone="neutral"
          count={plan.needsReview.length}
          description="Proficient or better, but flagged for fresh evidence (a spaced review is due or recent answers were missed). The level isn’t lowered."
          action={
            plan.needsReview.length ? (
              <ButtonLink size="sm" variant="secondary" href={newAssignmentHref({ classId, skills: column.skillIds, students: plan.needsReview.map((s) => s.id) })}>
                Assign a short review ({plan.needsReview.length})
              </ButtonLink>
            ) : null
          }
        >
          {nameList(plan.needsReview)}
        </GroupCard>

        <GroupCard id="ontrack" title="On track" tone="good" count={plan.onTrack.length} description="Proficient or better with no review flag.">
          {nameList(plan.onTrack)}
        </GroupCard>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Section title="Suggested lessons to reteach">
          {plan.suggestedLessons.length ? (
            <ul className="space-y-2 text-sm">
              {plan.suggestedLessons.map((l) => (
                <li key={l.id} className="rounded-lg border border-line bg-surface px-3 py-2 text-ink-2">
                  {l.title}
                  {tree.lessons.get(l.id)?.estMinutes ? <span className="text-muted"> · about {tree.lessons.get(l.id)!.estMinutes} min</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No lessons are linked to these skills yet.</p>
          )}
        </Section>
        <Section title="Suggested quizzes and tests">
          {plan.suggestedAssessments.length ? (
            <ul className="space-y-2 text-sm">
              {plan.suggestedAssessments.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2">
                  <span className="text-ink-2">{a.title}</span>
                  <Link
                    href={newAssignmentHref({ classId, kind: "assessment", assessment: a.id, skills: column.skillIds, students: difficulty.map((d) => d.student.id) })}
                    className="text-xs font-medium text-accent underline-offset-4 hover:underline"
                  >
                    Assign<span className="sr-only"> {a.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No quizzes or tests cover these skills yet. Targeted skill practice still works.</p>
          )}
        </Section>
      </div>

      <Section
        id="before-after"
        title="Before / after"
        description={
          since
            ? `Each student’s level just before they started “${since.title}”, compared with now. Read from the mastery history (snapshots are never edited).`
            : `Each student’s level at the start of ${formatDate(cutoffDate, { timeZone: "UTC" })} (UTC), compared with now. Read from the mastery history (snapshots are never edited).`
        }
        className="mt-10"
      >
        <form method="get" action={classHref(classId, "interventions")} className="mb-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="column" value={column.id} />
          <Field label="Compare with" htmlFor="since" className="min-w-64">
            <Select id="since" name="since" defaultValue={since?.id ?? ""}>
              <option value="">A date (below)</option>
              {relevantAssignments.map((a) => (
                <option key={a.id} value={a.id}>
                  Before starting: {a.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date" htmlFor="date" hint="Used when no assignment is chosen.">
            <Input id="date" name="date" type="date" defaultValue={date} max={new Date(now).toISOString().slice(0, 10)} />
          </Field>
          <Button type="submit" variant="secondary">
            Compare
          </Button>
        </form>
        <p className="mb-3 text-sm text-ink-2" aria-live="polite">
          {compared.length
            ? `${up} of ${compared.length} students moved up at least one level; ${down} moved down.`
            : "None of the students had started this assignment yet."}
        </p>
        <DataTable
          caption={`Before and after for ${column.label}`}
          columns={[
            { key: "name", header: "Student", rowHeader: true },
            { key: "then", header: since ? "Before starting" : "Then" },
            { key: "now", header: "Now" },
            { key: "change", header: "Change" },
          ]}
          rows={comparison.map((c) => ({
            id: c.student.id,
            name: c.student.name,
            then: c.then ? (
              <span className="flex flex-col items-start gap-0.5">
                <MasteryBadge level={c.then} size="sm" />
                {since && c.cutoff ? <span className="text-xs text-muted">{formatDate(c.cutoff, { short: true })}</span> : null}
              </span>
            ) : (
              <span className="text-xs text-muted">Not started (or not assigned)</span>
            ),
            now: <MasteryBadge level={c.now} size="sm" />,
            change:
              c.delta === null ? (
                <span className="text-muted">—</span>
              ) : c.delta > 0 ? (
                <span className="inline-flex items-center gap-1 text-good">
                  <ArrowUp aria-hidden="true" className="size-4" /> Up {pluralize(c.delta, "level")}
                </span>
              ) : c.delta < 0 ? (
                <span className="inline-flex items-center gap-1 text-bad">
                  <ArrowDown aria-hidden="true" className="size-4" /> Down {pluralize(-c.delta, "level")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-muted">
                  <ArrowRight aria-hidden="true" className="size-4" /> No change ({LEVEL_LABEL[c.now]})
                </span>
              ),
          }))}
        />
      </Section>
    </>
  );
}
