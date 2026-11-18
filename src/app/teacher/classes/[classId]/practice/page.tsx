import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChevronDown, ClipboardCheck, Dumbbell, Info, Users } from "lucide-react";
import { Badge, EmptyState, ProgressBar, StatTile, TabLinks, formatDate, pluralize } from "@/components/ui";
import { ClassHeader } from "@/components/teacher/ClassHeader";
import { classHref, studentHref } from "@/components/teacher/format";
import { loadClassContext, orNotFound } from "@/components/teacher/server/data";
import { ASSESSMENT_KIND_LABEL } from "@/components/student/format";
import { cn } from "@/lib/cn";
import { requireStaff } from "@/modules/auth/session";
import { formatDuration } from "@/modules/analytics/activeTime";
import { STRUGGLING_BELOW, getUnitPracticeReport, type StepReport } from "@/modules/classrooms/practiceReport";

export const metadata: Metadata = { title: "Lessons & practice" };

const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);

export default async function PracticeReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireStaff();
  const { classId } = await params;
  const sp = await searchParams;
  const unitParam = typeof sp.unit === "string" ? sp.unit : undefined;
  const ctx = await loadClassContext(user, classId);
  const report = await orNotFound(getUnitPracticeReport(user, classId, unitParam));
  const available = report.units.filter((u) => u.available);

  const exercises = report.steps.filter((s) => s.kind === "exercise");
  const lessons = report.steps.filter((s) => s.type === "lesson");
  const n = report.students.length;
  const exerciseCoverage = exercises.length && n ? exercises.reduce((sum, s) => sum + s.started, 0) / (exercises.length * n) : null;
  const exerciseAverage = (() => {
    const xs = exercises.flatMap((s) => (s.averageBest === null ? [] : [s.averageBest]));
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  })();
  const strugglingStudents = new Set(report.steps.flatMap((s) => s.struggling.map((x) => x.studentId)));
  const misconceptionTotals = new Map<string, { title: string; students: number }>();
  for (const s of report.steps)
    for (const m of s.misconceptions) {
      const e = misconceptionTotals.get(m.id) ?? { title: m.title, students: 0 };
      e.students = Math.max(e.students, m.students);
      misconceptionTotals.set(m.id, e);
    }
  const topMisconception = [...misconceptionTotals.values()].sort((a, b) => b.students - a.students)[0] ?? null;

  const byTopic: { title: string; steps: StepReport[] }[] = [];
  for (const s of report.steps) {
    const title = s.topicTitle ?? "Unit checks";
    const last = byTopic[byTopic.length - 1];
    if (last && last.title === title) last.steps.push(s);
    else byTopic.push({ title, steps: [s] });
  }

  return (
    <>
      <ClassHeader
        ctx={ctx}
        current="practice"
        title="Lessons & practice"
        description="How the class is handling each lesson, exercise, quiz and test in a unit — in the order students meet them."
      />

      <p className="mb-6 flex items-start gap-2 rounded-lg border border-info/40 bg-info-soft px-4 py-3 text-sm text-ink-2">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
        <span>
          Exercises draw new questions on every try, so their scores show how students apply a topic. For lessons, &ldquo;Checks right&rdquo; is the share
          of inline check questions answered correctly on the first try. &ldquo;Struggling&rdquo; means a best score (or first-try check accuracy) under{" "}
          {Math.round(STRUGGLING_BELOW * 100)}%. Times are estimated active time with idle periods removed — not evidence of learning.
        </span>
      </p>

      {available.length > 1 ? (
        <TabLinks
          className="mb-6"
          label="Units"
          current={report.unit?.id ?? ""}
          items={available.map((u) => ({ id: u.id, label: `Unit ${u.number}`, href: `${classHref(classId, "practice")}?unit=${encodeURIComponent(u.id)}` }))}
        />
      ) : null}

      {!report.unit ? (
        <EmptyState icon={<BookOpen />} title="No lessons yet" description="This course has no units with lessons, so there is nothing to report." />
      ) : n === 0 ? (
        <EmptyState icon={<Users />} title="No students yet" description="Results appear once students join and start the unit." />
      ) : (
        <>
          <h2 className="mb-4 font-display text-xl font-semibold text-ink">
            Unit {report.unit.number}: {report.unit.title}
          </h2>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Lessons finished" value={`${lessons.reduce((a, s) => a + s.done, 0)} / ${lessons.length * n}`} hint={`${pluralize(lessons.length, "lesson")} × ${pluralize(n, "student")}`} />
            <StatTile label="Exercises tried" value={pct(exerciseCoverage)} hint={`${pluralize(exercises.length, "exercise")} in this unit`} />
            <StatTile label="Average best on exercises" value={pct(exerciseAverage)} hint="Mean of each student's best try" />
            <StatTile
              label="Students struggling somewhere"
              value={`${strugglingStudents.size} / ${n}`}
              hint={topMisconception ? `Most common: ${topMisconception.title}` : "No misconceptions detected yet"}
            />
          </div>

          <div className="space-y-8">
            {byTopic.map((group) => (
              <section key={group.title} aria-label={group.title}>
                <h3 className="mb-3 text-[0.75rem] font-semibold uppercase tracking-[0.07em] text-muted">{group.title}</h3>
                <ul className="space-y-3">
                  {group.steps.map((s) => (
                    <li key={s.id}>
                      <StepCard step={s} classId={classId} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function StepCard({ step: s, classId }: { step: StepReport; classId: string }) {
  const isLesson = s.type === "lesson";
  const Icon = isLesson ? BookOpen : s.kind === "exercise" ? Dumbbell : ClipboardCheck;
  const kindLabel = isLesson ? `Lesson ${s.number ?? ""}`.trim() : (ASSESSMENT_KIND_LABEL[s.kind] ?? s.kind);
  const progressLabel = isLesson ? "finished" : "tried";
  const progressValue = isLesson ? s.done : s.started;
  return (
    <article aria-label={`${kindLabel}: ${s.title}`} className="rounded-card border border-line bg-surface shadow-card">
      <div className="grid gap-4 px-5 py-4 sm:px-6 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))] lg:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <Icon aria-hidden="true" className={cn("mt-0.5 size-5 shrink-0", s.kind === "exercise" ? "text-accent" : "text-faint")} />
          <div className="min-w-0">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">{kindLabel}</p>
            <p className="font-medium leading-snug text-ink">{s.title}</p>
          </div>
        </div>
        <Metric label={`Students ${progressLabel}`}>
          <span className="tabular-nums">
            {progressValue} / {s.students}
          </span>
          <ProgressBar value={s.students ? progressValue / s.students : 0} label={`Students ${progressLabel}`} size="sm" className="mt-1.5" />
        </Metric>
        <Metric label={isLesson ? "Checks right" : "Average best"}>{pct(s.averageBest)}</Metric>
        <Metric label={isLesson ? "Median time" : "Tries · median time"}>
          {isLesson ? "" : `${s.attempts} · `}
          {s.medianActiveMs ? formatDuration(s.medianActiveMs) : "—"}
        </Metric>
        <Metric label="Struggling">
          {s.struggling.length ? (
            <Badge tone="warn">{pluralize(s.struggling.length, "student")}</Badge>
          ) : (
            <span className="text-muted">None</span>
          )}
        </Metric>
      </div>

      {s.misconceptions.length || s.struggling.length ? (
        <div className="flex flex-col gap-2 border-t border-line px-5 py-3 text-sm sm:px-6">
          {s.struggling.length ? (
            <p className="text-ink-2">
              <span className="font-medium text-ink">Check in with: </span>
              {s.struggling.map((x, i) => (
                <span key={x.studentId}>
                  {i ? ", " : ""}
                  <Link href={studentHref(x.studentId, classId)} className="text-accent underline-offset-4 hover:underline">
                    {x.name}
                  </Link>{" "}
                  <span className="text-muted">({pct(x.best)})</span>
                </span>
              ))}
            </p>
          ) : null}
          {s.misconceptions.length ? (
            <p className="text-ink-2">
              <span className="font-medium text-ink">Misconceptions seen: </span>
              {s.misconceptions.map((m, i) => (
                <span key={m.id}>
                  {i ? "; " : ""}
                  {m.title} <span className="text-muted">({pluralize(m.students, "student")})</span>
                </span>
              ))}
            </p>
          ) : null}
        </div>
      ) : null}

      <details className="group border-t border-line">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-5 py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2 sm:px-6 [&::-webkit-details-marker]:hidden">
          By student
          <ChevronDown aria-hidden="true" className="size-4 text-faint transition-transform group-open:rotate-180" />
        </summary>
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[34rem] text-sm">
            <caption className="sr-only">
              {s.title} — results by student
            </caption>
            <thead>
              <tr className="text-left text-xs text-muted">
                <th scope="col" className="px-5 py-2 font-medium sm:px-6">
                  Student
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Status
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {isLesson ? "Checks right" : "Best"}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {isLesson ? "Check tries" : "Tries"}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Est. active
                </th>
                <th scope="col" className="px-5 py-2 text-right font-medium sm:px-6">
                  Last
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {s.perStudent.map((r) => (
                <tr key={r.studentId}>
                  <th scope="row" className="px-5 py-2 text-left font-medium sm:px-6">
                    <Link href={studentHref(r.studentId, classId)} className="text-ink underline-offset-4 hover:underline">
                      {r.name}
                    </Link>
                  </th>
                  <td className="px-3 py-2 text-ink-2">
                    {r.status === "done" ? (isLesson ? "Finished" : "Submitted") : r.status === "started" ? "Started" : <span className="text-muted">Not started</span>}
                  </td>
                  <td className={cn("px-3 py-2 text-right tabular-nums", r.best !== null && r.best < STRUGGLING_BELOW ? "font-medium text-warn" : "text-ink-2")}>
                    {pct(r.best)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-2">{r.attempts || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-2">{r.activeMs ? formatDuration(r.activeMs) : "—"}</td>
                  <td className="px-5 py-2 text-right text-muted sm:px-6">{r.lastAt ? formatDate(r.lastAt, { short: true }) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </article>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 text-sm">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-0.5 font-medium text-ink">{children}</div>
    </div>
  );
}
