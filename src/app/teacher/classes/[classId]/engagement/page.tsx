import type { Metadata } from "next";
import Link from "next/link";
import { Info, Users } from "lucide-react";
import { DataTable, EmptyState, StatTile } from "@/components/ui";
import { ClassHeader } from "@/components/teacher/ClassHeader";
import { DailyBars } from "@/components/teacher/Sparkline";
import { summariseStudent } from "@/components/teacher/analysis";
import { ACTIVITY_KINDS, ACTIVITY_KIND_LABEL, dayLabel, studentHref } from "@/components/teacher/format";
import { loadClassContext, orNotFound } from "@/components/teacher/server/data";
import { requireStaff } from "@/modules/auth/session";
import { formatDuration } from "@/modules/analytics/activeTime";
import { getClassEngagement, getMasteryMatrix } from "@/modules/classrooms/analytics";

export const metadata: Metadata = { title: "Engagement" };

const DAYS = 14;

export default async function EngagementPage({ params }: { params: Promise<{ classId: string }> }) {
  const user = await requireStaff();
  const { classId } = await params;
  const ctx = await loadClassContext(user, classId);
  const [engagement, objectives, skills] = await Promise.all([
    orNotFound(getClassEngagement(user, classId, DAYS)),
    orNotFound(getMasteryMatrix(user, classId, { groupBy: "objective" })),
    orNotFound(getMasteryMatrix(user, classId, { groupBy: "skill" })),
  ]);
  const students = objectives.students;
  const list = students.map((s) => engagement.students[s.id]).filter(Boolean);
  const activeStudents = list.filter((e) => e.activeMs > 0).length;
  const lessonsCompleted = list.reduce((n, e) => n + e.lessonsCompleted, 0);
  const lessonsTotal = ctx.tree.lessonOrder.length;
  const range = `${dayLabel(engagement.dayLabels[0])} – ${dayLabel(engagement.dayLabels[engagement.dayLabels.length - 1])}`;
  const note = `Estimated active learning time — idle periods over ${engagement.idleThresholdSeconds} seconds and hidden tabs are excluded. Time spent is not evidence of learning.`;

  return (
    <>
      <ClassHeader ctx={ctx} current="engagement" title="Engagement" description={`Last ${DAYS} days (${range}, UTC days).`} />

      <p className="mb-6 flex items-start gap-2 rounded-lg border border-info/40 bg-info-soft px-4 py-3 text-sm text-ink-2">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
        <span>{note}</span>
      </p>

      {students.length === 0 ? (
        <EmptyState icon={<Users />} title="No students yet" description="Engagement appears once students join and start learning." />
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <StatTile label={`Class total, est. active (${DAYS} d)`} value={formatDuration(engagement.totalActiveMs)} hint="Estimate — not a measure of learning" />
            <StatTile label={`Students active (${DAYS} d)`} value={`${activeStudents} / ${students.length}`} hint="At least some estimated active time" />
            <StatTile label="Lessons completed" value={lessonsCompleted} hint={`All time, across the class · ${lessonsTotal} lessons in the course`} />
          </div>

          <DataTable
            caption={`Estimated engagement per student in ${ctx.name}, last ${DAYS} days, with mastery shown separately`}
            columns={[
              { key: "name", header: "Student", rowHeader: true },
              { key: "active", header: "Est. active", align: "right" },
              { key: "kinds", header: "By activity" },
              { key: "trend", header: "Daily (est.)" },
              { key: "lessons", header: "Lessons done (all time)", align: "right" },
              { key: "last", header: "Last active" },
              { key: "mastery", header: "Mastery (separate measure)", className: "border-l-2 border-l-line-strong" },
            ]}
            rows={students.map((s) => {
              const e = engagement.students[s.id];
              const sum = summariseStudent(objectives, skills, s.id);
              return {
                id: s.id,
                name: (
                  <Link href={studentHref(s.id, classId)} className="rounded underline-offset-4 hover:underline">
                    {s.name}
                  </Link>
                ),
                active: e?.activeMs ? (
                  <span>
                    <span className="font-medium text-ink">{formatDuration(e.activeMs)}</span>
                    <span className="block text-xs text-muted">of {formatDuration(e.openMs)} open</span>
                  </span>
                ) : (
                  <span className="text-muted">None</span>
                ),
                kinds: e?.activeMs ? (
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                    {ACTIVITY_KINDS.map((k) => (
                      <li key={k} className="flex justify-between gap-2">
                        <span className="text-muted">{ACTIVITY_KIND_LABEL[k]}</span>
                        <span className="tabular-nums text-ink-2">{e.byKind[k] ? formatDuration(e.byKind[k]) : "—"}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-xs text-muted">—</span>
                ),
                trend: e ? <DailyBars values={e.daily} labels={engagement.dayLabels} label={`${s.name}, estimated active time per day`} /> : null,
                lessons: e?.lessonsCompleted ?? 0,
                last: e?.lastActiveDay ? dayLabel(e.lastActiveDay) : <span className="text-muted">No activity</span>,
                mastery: (
                  <span className="text-xs">
                    <span className="font-medium tabular-nums text-ink">
                      {sum.proficient} / {sum.totalColumns}
                    </span>{" "}
                    <span className="text-muted">objectives Proficient+</span>
                    <span className="block text-muted">Evidence on {sum.withEvidence}</span>
                  </span>
                ),
              };
            })}
          />
          <p className="mt-4 text-xs text-muted">
            Open time counts only while the AceAP tab is visible. Active time additionally drops any stretch longer than {engagement.idleThresholdSeconds} s without a click, key
            press, scroll or answer. No keystrokes, page content or webcam data are collected.
          </p>
        </>
      )}
    </>
  );
}
