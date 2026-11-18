import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ClipboardPlus, Info } from "lucide-react";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  MasteryBadge,
  PageHeader,
  Section,
  StatTile,
  TabLinks,
  formatDate,
  formatRelativeTime,
  pluralize,
} from "@/components/ui";
import { DailyBars } from "@/components/teacher/Sparkline";
import { ACTIVITY_KINDS, ACTIVITY_KIND_LABEL, MISCONCEPTION_STATUS, MODE_LABEL, classHref, dayLabel, firstParam, newAssignmentHref, percent, skillEvidenceHref, studentHref } from "@/components/teacher/format";
import { WEAK_ESTIMATE } from "@/components/teacher/analysis";
import { isAccessError, loadClassContext, loadSnapshots, orNotFound, rollupHistory } from "@/components/teacher/server/data";
import type { Actor } from "@/db/client";
import { requireStaff } from "@/modules/auth/session";
import { formatDuration } from "@/modules/analytics/activeTime";
import { classesSharedWithStudent, getClassEngagement, getRecentActivity, getStudentAttempts } from "@/modules/classrooms/analytics";
import { getStudentGrades } from "@/modules/gradebook/service";
import { getCourseOverview } from "@/modules/learning/overview";
import { LEVEL_LABEL, LEVEL_RANK, type MasteryLevel } from "@/modules/mastery/types";

export const metadata: Metadata = { title: "Student" };

type SP = Record<string, string | string[] | undefined>;

interface Rec {
  key: string;
  title: string;
  reason: string;
  skills: string[];
}

export default async function StudentPage({ params, searchParams }: { params: Promise<{ studentId: string }>; searchParams: Promise<SP> }) {
  const user = await requireStaff();
  const { studentId } = await params;
  const sp = await searchParams;

  // Authorise: the student must be in at least one of this teacher's classes (RLS-scoped).
  const shared = await classesSharedWithStudent(user, studentId);
  if (shared.length === 0) notFound();
  const selected = shared.find((c) => c.classId === firstParam(sp.class)) ?? shared[0];
  const ctx = await loadClassContext(user, selected.classId);
  const tree = ctx.tree;
  const student = { id: studentId, name: selected.studentName, email: selected.studentEmail, isDemo: selected.isDemo };

  const [overview, attempts, engagement, activity, snapshots, grades] = await Promise.all([
    orNotFound(getCourseOverview(user as Actor, studentId, ctx.courseId)),
    getStudentAttempts(user, ctx.courseId, studentId, 30),
    orNotFound(getClassEngagement(user, ctx.id, 14)),
    orNotFound(getRecentActivity(user, ctx.id, 60)),
    loadSnapshots(user, ctx.courseId, [studentId]),
    getStudentGrades(user as Actor, studentId, ctx.id).catch((e) => {
      if (!isAccessError(e)) console.error("[teacher] student grades unavailable", e);
      return null;
    }),
  ]);

  const states = overview.states;
  const levelOf = (id: string): MasteryLevel => states.get(id)?.level ?? "not_started";
  const skillName = (id: string) => tree.skills.get(id)?.name ?? id;
  const availableUnits = tree.units.filter((u) => u.status === "available" && u.topics.some((tp) => tp.objectives.length));
  const allObjectives = availableUnits.flatMap((u) => u.topics.flatMap((tp) => tp.objectives));
  const objectiveRollups = allObjectives.map((o) => ({ o, r: overview.rollups.objectives.get(o.id) }));
  const objectivesProficient = objectiveRollups.filter(({ r }) => r && LEVEL_RANK[r.level] >= LEVEL_RANK.proficient).length;
  const courseSkills = availableUnits.flatMap((u) => u.skillIds);
  const tested = courseSkills.filter((id) => levelOf(id) !== "not_started");
  const strong = courseSkills.filter((id) => LEVEL_RANK[levelOf(id)] >= LEVEL_RANK.proficient).sort((a, b) => LEVEL_RANK[levelOf(b)] - LEVEL_RANK[levelOf(a)]);
  const belowProficient = tested.filter((id) => LEVEL_RANK[levelOf(id)] < LEVEL_RANK.proficient).sort((a, b) => (states.get(a)?.estimate ?? 0) - (states.get(b)?.estimate ?? 0));
  // Mostly-wrong answers = difficulty; mostly-right but too little evidence = emerging (not weak).
  const weak = belowProficient.filter((id) => (states.get(id)?.estimate ?? 0) < WEAK_ESTIMATE);
  const emerging = belowProficient.filter((id) => (states.get(id)?.estimate ?? 0) >= WEAK_ESTIMATE);
  const untested = courseSkills.filter((id) => levelOf(id) === "not_started");
  const review = courseSkills.filter((id) => states.get(id)?.needsReview);
  const eng = engagement.students[studentId];
  const myActivity = activity.filter((a) => a.studentId === studentId).slice(0, 8);
  const activeMisconceptions = overview.misconceptions.filter((m) => m.status === "hypothesis" || m.status === "teacher_confirmed");

  // ── Instructional recommendations (from mastery + prerequisites) ──────────
  const recs: Rec[] = [];
  for (const m of activeMisconceptions.slice(0, 3))
    recs.push({
      key: `mis-${m.id}`,
      title: `Address “${m.title}” (${skillName(m.skillId)})`,
      reason: `${MISCONCEPTION_STATUS[m.status].label}: seen ${pluralize(m.occurrences, "time")}. ${m.remediation}`,
      skills: [m.skillId],
    });
  const gaps = new Map<string, string[]>();
  const untestedPrereqs = new Map<string, string[]>();
  for (const s of weak)
    for (const p of tree.skills.get(s)?.prerequisites ?? []) {
      const lvl = levelOf(p);
      if (lvl === "not_started") untestedPrereqs.set(p, [...(untestedPrereqs.get(p) ?? []), s]);
      else if (LEVEL_RANK[lvl] < LEVEL_RANK.proficient && (states.get(p)?.estimate ?? 0) < WEAK_ESTIMATE) gaps.set(p, [...(gaps.get(p) ?? []), s]);
    }
  for (const [p, dependents] of gaps)
    recs.push({
      key: `gap-${p}`,
      title: `Possible prerequisite gap: ${skillName(p)}`,
      reason: `${skillName(p)} is ${LEVEL_LABEL[levelOf(p)]} and underlies ${dependents.map(skillName).join(", ")}. Shoring it up first may help more than repeating the later skill.`,
      skills: [p],
    });
  const weakNotGap = weak.filter((s) => !gaps.has(s));
  if (weakNotGap.length)
    recs.push({
      key: "weak",
      title: `Practise: ${weakNotGap.slice(0, 4).map(skillName).join(", ")}${weakNotGap.length > 4 ? ` and ${weakNotGap.length - 4} more` : ""}`,
      reason: "Below Proficient with mostly incorrect answers. Reteach, then independent answers on different problem types move them fastest.",
      skills: weakNotGap,
    });
  if (review.length)
    recs.push({
      key: "review",
      title: `Review: ${review.map(skillName).join(", ")}`,
      reason: "Proficient before, now flagged for fresh evidence. A short review set is enough; the level isn’t lowered.",
      skills: review,
    });
  if (emerging.length)
    recs.push({
      key: "emerging",
      title: `Confirm with independent practice: ${emerging.slice(0, 4).map(skillName).join(", ")}${emerging.length > 4 ? ` and ${emerging.length - 4} more` : ""}`,
      reason: "Answers so far are mostly correct, but there isn’t enough independent evidence yet for Proficient. A few more questions on different problem types will settle it.",
      skills: emerging,
    });
  for (const [p, dependents] of untestedPrereqs)
    recs.push({
      key: `untested-${p}`,
      title: `Check ${skillName(p)} — not yet assessed`,
      reason: `It’s a prerequisite for ${dependents.map(skillName).join(", ")}, where evidence shows difficulty. A few questions will show whether it’s part of the problem.`,
      skills: [p],
    });
  const allRecSkills = [...new Set(recs.flatMap((r) => r.skills))].slice(0, 12);

  const classTabs = shared.length > 1;
  const scoreText = (score: number | null, max: number | null) => (score !== null && max ? `${score} / ${max} (${percent(score, max)})` : "—");

  return (
    <>
      <PageHeader
        className={classTabs ? "mb-5" : undefined}
        breadcrumbs={[{ label: "Classes", href: "/teacher/classes" }, { label: ctx.name, href: classHref(ctx.id) }, { label: student.name }]}
        eyebrow={`Student · ${ctx.courseName}`}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {student.name}
            {student.isDemo ? <Badge tone="neutral">Demo account</Badge> : null}
          </span>
        }
        description={student.email}
        actions={
          allRecSkills.length ? (
            <ButtonLink href={newAssignmentHref({ classId: ctx.id, skills: allRecSkills, students: [studentId] })} icon={<ClipboardPlus aria-hidden="true" className="size-4" />}>
              Assign recommended practice
            </ButtonLink>
          ) : null
        }
      />
      {classTabs ? (
        <TabLinks
          className="mb-8"
          label={`${student.name}'s classes with you`}
          current={ctx.id}
          items={shared.map((c) => ({ id: c.classId, label: c.className, href: studentHref(studentId, c.classId) }))}
        />
      ) : null}

      <Section id="overview" title="Overview">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Objectives Proficient+" value={`${objectivesProficient} / ${allObjectives.length}`} hint="Objectives in units with lessons" />
          <StatTile label="Skills with evidence" value={`${tested.length} / ${courseSkills.length}`} hint={`${untested.length} not yet assessed — unknown, not weak`} />
          <StatTile label="Est. active (14 d)" value={eng?.activeMs ? formatDuration(eng.activeMs) : "None"} hint="Estimate · not evidence of learning" />
          <StatTile
            label="Gradebook average"
            value={grades?.average.percent != null ? `${Math.round(grades.average.percent)}%` : "—"}
            hint={grades ? `${pluralize(grades.average.counted, "graded item")} · missing work not counted` : "Not available"}
          />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card padded={false}>
            <CardHeader title="Recent activity" description={`In ${ctx.name}`} />
            <CardBody>
              {myActivity.length ? (
                <ul className="divide-y divide-line text-sm">
                  {myActivity.map((a, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
                      <span className="text-ink-2">{a.summary.replace(/^./, (c) => c.toUpperCase())}</span>
                      <time dateTime={a.at.toISOString()} className="shrink-0 text-xs text-muted">
                        {formatRelativeTime(a.at)}
                      </time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No lessons completed or quizzes submitted yet.</p>
              )}
            </CardBody>
          </Card>
          <Card padded={false}>
            <CardHeader title="Instructional recommendations" description="Derived from current mastery, misconceptions and skill prerequisites." />
            <CardBody>
              {recs.length ? (
                <ul className="space-y-4">
                  {recs.slice(0, 6).map((r) => (
                    <li key={r.key} className="text-sm">
                      <p className="font-medium text-ink">{r.title}</p>
                      <p className="mt-0.5 text-muted">{r.reason}</p>
                      <Link
                        href={newAssignmentHref({ classId: ctx.id, skills: r.skills.slice(0, 12), students: [studentId] })}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent underline-offset-4 hover:underline"
                      >
                        Assign practice<span className="sr-only"> for {r.title}</span> <ArrowRight aria-hidden="true" className="size-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : tested.length === 0 ? (
                <p className="text-sm text-muted">No graded work yet, so there’s nothing to recommend from. Assign a short practice set to gather evidence.</p>
              ) : (
                <p className="text-sm text-muted">Every tested skill is Proficient or better with no review flags. {untested.length ? `${pluralize(untested.length, "skill")} not yet assessed.` : ""}</p>
              )}
            </CardBody>
          </Card>
        </div>
      </Section>

      <Section id="mastery" title="Mastery by objective" description="Current level, how it changed over time, and the skills behind it. Open a skill for every response.">
        {objectiveRollups.length === 0 ? (
          <EmptyState title="No objectives yet" description="This course has no objectives with lessons yet." />
        ) : (
          <div className="space-y-4">
            {availableUnits.map((u) => (
              <Card key={u.id} padded={false}>
                <CardHeader title={`Unit ${u.number}: ${u.title}`} />
                <CardBody className="pt-3">
                  <ul className="divide-y divide-line">
                    {u.topics.flatMap((tp) => tp.objectives).map((o) => {
                      const r = overview.rollups.objectives.get(o.id);
                      const history = rollupHistory(snapshots, o.skillIds);
                      return (
                        <li key={o.id} id={`objective-${o.id}`} className="scroll-mt-24 py-4 first:pt-0 last:pb-0">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-ink">{o.code}</p>
                              <p className="text-sm text-muted">{o.description}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <MasteryBadge level={r?.level ?? "not_started"} needsReview={(r?.needsReview ?? 0) > 0} size="sm" />
                              <span className="text-xs text-muted">
                                Evidence on {r?.skillsWithEvidence ?? 0} of {pluralize(o.skillIds.length, "skill")}
                              </span>
                            </div>
                          </div>
                          {history.length > 1 ? (
                            <ol aria-label={`${o.code} level changes`} className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
                              {history.map((h, i) => (
                                <li key={i} className="inline-flex items-center gap-1.5">
                                  {i > 0 ? <ArrowRight aria-hidden="true" className="size-3 text-faint" /> : null}
                                  <span className="font-medium text-ink-2">{LEVEL_LABEL[h.level]}</span>
                                  <span>{formatDate(h.at, { short: true })}</span>
                                </li>
                              ))}
                            </ol>
                          ) : null}
                          <ul className="mt-3 flex flex-wrap gap-2">
                            {o.skillIds.map((id) => (
                              <li key={id}>
                                <Link
                                  href={skillEvidenceHref(studentId, id, ctx.id)}
                                  className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink-2 hover:border-line-strong hover:text-ink"
                                >
                                  <MasteryBadge level={levelOf(id)} needsReview={states.get(id)?.needsReview} size="sm" showLabel={false} />
                                  {skillName(id)}
                                  <span className="sr-only">: {levelOf(id) === "not_started" ? "no evidence yet" : LEVEL_LABEL[levelOf(id)]}. Open evidence.</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </li>
                      );
                    })}
                  </ul>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section id="concepts" title="Strong and weak concepts" description="Difficulty means below Proficient with mostly incorrect answers. Thin evidence and untested skills are listed separately — no evidence is not weakness.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Secure (Proficient+)", list: strong, empty: "None yet." },
            { title: "Evidence shows difficulty", list: weak, empty: "None of the tested skills." },
            { title: "Mostly correct, needs more evidence", list: emerging, empty: "None." },
            { title: "Not yet assessed", list: untested, empty: "Every skill has some evidence." },
          ].map((g) => (
            <Card key={g.title} padded={false}>
              <CardHeader title={g.title} description={pluralize(g.list.length, "skill")} />
              <CardBody>
                {g.list.length ? (
                  <ul className="space-y-2">
                    {g.list.map((id) => (
                      <li key={id} className="flex items-center justify-between gap-2 text-sm">
                        <Link href={skillEvidenceHref(studentId, id, ctx.id)} className="min-w-0 text-ink-2 underline-offset-4 hover:text-ink hover:underline">
                          {skillName(id)}
                        </Link>
                        <MasteryBadge level={levelOf(id)} needsReview={states.get(id)?.needsReview} size="sm" showLabel={false} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">{g.empty}</p>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="misconceptions" title="Misconceptions" description="Detected from authored wrong-answer patterns. A hypothesis is not a diagnosis until a teacher confirms it.">
        {overview.misconceptions.length ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {overview.misconceptions.map((m) => (
              <li key={m.id}>
                <Card className="h-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{m.title}</span>
                    <Badge tone={m.status === "teacher_confirmed" ? "bad" : m.status === "hypothesis" ? "warn" : "good"}>{MISCONCEPTION_STATUS[m.status].label}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {skillName(m.skillId)} · seen {pluralize(m.occurrences, "time")} · {m.correctSinceLast} independent correct since · last {formatDate(m.lastObservedAt, { short: true })}
                  </p>
                  <p className="mt-2 text-sm text-ink-2">{m.description}</p>
                  <p className="mt-2 text-sm text-ink-2">
                    <span className="font-medium">Try:</span> {m.remediation}
                  </p>
                  <Link href={skillEvidenceHref(studentId, m.skillId, ctx.id)} className="mt-3 inline-flex text-xs font-medium text-accent underline-offset-4 hover:underline">
                    See the answers<span className="sr-only"> for {m.title}</span>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No misconceptions detected in this course.</p>
        )}
      </Section>

      <Section id="assessments" title="Attempts" description="Practice, quizzes, tests and reviews in this course (lesson checks excluded).">
        <DataTable
          caption={`${student.name}'s attempts in ${ctx.courseName}`}
          columns={[
            { key: "title", header: "Activity", rowHeader: true },
            { key: "mode", header: "Type" },
            { key: "score", header: "Score", align: "right" },
            { key: "date", header: "Date" },
            { key: "status", header: "Status" },
          ]}
          rows={attempts.map((a) => ({
            id: a.id,
            title: (
              <span>
                {a.title}
                {a.assignmentId ? (
                  <Badge tone="accent" className="ml-2">
                    Assigned
                  </Badge>
                ) : null}
              </span>
            ),
            mode: MODE_LABEL[a.mode] ?? a.mode,
            score: a.status === "submitted" ? scoreText(a.score, a.maxScore) : "—",
            date: formatDate(a.submittedAt ?? a.startedAt, { short: true }),
            status: a.status === "submitted" ? "Submitted" : a.status === "in_progress" ? <Badge tone="info">In progress</Badge> : <Badge tone="neutral">Abandoned</Badge>,
          }))}
          empty={<EmptyState title="No attempts yet" description="Attempts appear when the student practises or takes a quiz in this course." />}
        />
      </Section>

      <Section id="engagement" title="Engagement (estimate)">
        <p className="mb-4 flex items-start gap-2 text-sm text-muted">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Estimated active learning time over the last 14 days — idle periods over {engagement.idleThresholdSeconds} seconds and hidden tabs are excluded. Time spent is not evidence of learning.
        </p>
        <Card>
          {eng ? (
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <p className="font-display text-2xl font-semibold text-ink">
                  {formatDuration(eng.activeMs)} <span className="text-sm font-normal text-muted">active of {formatDuration(eng.openMs)} open</span>
                </p>
                <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                  {ACTIVITY_KINDS.map((k) => (
                    <li key={k}>
                      <span className="block text-xs text-muted">{ACTIVITY_KIND_LABEL[k]}</span>
                      <span className="tabular-nums text-ink-2">{eng.byKind[k] ? formatDuration(eng.byKind[k]) : "—"}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-muted">
                  Lessons completed: {overview.lessonsCompleted} of {overview.lessonsTotal} · Last active: {eng.lastActiveDay ? dayLabel(eng.lastActiveDay) : "no activity in this period"}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted">
                  Daily, {dayLabel(engagement.dayLabels[0])} – {dayLabel(engagement.dayLabels[engagement.dayLabels.length - 1])}
                </p>
                <DailyBars values={eng.daily} labels={engagement.dayLabels} label={`${student.name}, estimated active time per day`} width={196} height={44} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">No engagement recorded.</p>
          )}
        </Card>
      </Section>
    </>
  );
}
