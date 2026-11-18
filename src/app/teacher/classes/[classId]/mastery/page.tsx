import type { Metadata } from "next";
import Link from "next/link";
import { Grid3x3, Users } from "lucide-react";
import { Button, Card, EmptyState, Field, MasteryLegend, Section, Select, buttonStyles } from "@/components/ui";
import { ClassHeader } from "@/components/teacher/ClassHeader";
import { MasteryHeatmap, type HeatmapColumn, type HeatmapRow } from "@/components/teacher/MasteryHeatmap";
import { readCell } from "@/components/teacher/analysis";
import { classHref, firstParam, interventionHref } from "@/components/teacher/format";
import { loadClassContext, orNotFound } from "@/components/teacher/server/data";
import { requireStaff } from "@/modules/auth/session";
import { getMasteryMatrix } from "@/modules/classrooms/analytics";
import { LEVEL_RANK } from "@/modules/mastery/types";

export const metadata: Metadata = { title: "Mastery heatmap" };

type SP = Record<string, string | string[] | undefined>;

export default async function MasteryPage({ params, searchParams }: { params: Promise<{ classId: string }>; searchParams: Promise<SP> }) {
  const user = await requireStaff();
  const { classId } = await params;
  const sp = await searchParams;
  const ctx = await loadClassContext(user, classId);

  const view: "objective" | "skill" = firstParam(sp.view) === "skill" ? "skill" : "objective";
  const sort: "name" | "weakest" = firstParam(sp.sort) === "weakest" ? "weakest" : "name";
  const availableUnits = ctx.tree.units.filter((u) => u.status === "available");
  const unitParam = firstParam(sp.unit);
  const unitId = availableUnits.some((u) => u.id === unitParam) ? unitParam : undefined;

  const [matrix, skillMatrix] = await Promise.all([
    orNotFound(getMasteryMatrix(user, classId, { groupBy: view, unitId })),
    view === "objective" ? orNotFound(getMasteryMatrix(user, classId, { groupBy: "skill", unitId })) : Promise.resolve(null),
  ]);
  const skillCells = view === "skill" ? matrix : skillMatrix;
  const unitNumber = new Map(ctx.tree.units.map((u) => [u.id, u.number]));

  const columns: HeatmapColumn[] = matrix.columns.map((col) => {
    let difficulty = 0;
    let noEvidence = 0;
    for (const s of matrix.students) {
      const reading = readCell(matrix.cells[s.id]?.[col.id], col.skillIds, skillCells?.cells[s.id]);
      if (reading === "difficulty") difficulty += 1;
      if (reading === "no_evidence") noEvidence += 1;
    }
    return {
      id: col.id,
      label: col.label,
      code: col.code,
      description: col.description,
      unitLabel: `Unit ${unitNumber.get(col.unitId) ?? "?"}`,
      skillCount: col.skillIds.length,
      distribution: col.distribution,
      needsReview: col.needsReview,
      difficulty,
      noEvidence,
      proficient: col.distribution.proficient + col.distribution.mastered,
    };
  });

  const rows: (HeatmapRow & { meanRank: number })[] = matrix.students.map((s) => {
    const cells = matrix.columns.map((col) => {
      const cell = matrix.cells[s.id][col.id];
      return { ...cell, reading: readCell(cell, col.skillIds, skillCells?.cells[s.id]) };
    });
    const withEvidence = cells.filter((c) => c.skillsWithEvidence > 0);
    return {
      id: s.id,
      name: s.name,
      isDemo: s.isDemo,
      cells,
      difficultyCount: cells.filter((c) => c.reading === "difficulty").length,
      noEvidenceCount: cells.filter((c) => c.reading === "no_evidence").length,
      meanRank: withEvidence.length ? withEvidence.reduce((n, c) => n + LEVEL_RANK[c.level], 0) / withEvidence.length : 99,
    };
  });
  if (sort === "weakest") rows.sort((a, b) => b.difficultyCount - a.difficultyCount || a.meanRank - b.meanRank || a.name.localeCompare(b.name));

  const lookFirst = [...columns].filter((c) => c.difficulty > 0).sort((a, b) => b.difficulty - a.difficulty || a.proficient - b.proficient).slice(0, 3);
  const viewHref = (v: "objective" | "skill") => {
    const q = new URLSearchParams();
    if (v === "skill") q.set("view", "skill");
    if (unitId) q.set("unit", unitId);
    if (sort === "weakest") q.set("sort", "weakest");
    const s = q.toString();
    return `${classHref(classId, "mastery")}${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <ClassHeader
        ctx={ctx}
        current="mastery"
        title="Mastery heatmap"
        description="Which students understand which objectives — and why. Open any cell to see the responses behind it."
      />

      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <nav aria-label="Heatmap columns" className="inline-flex rounded-lg border border-line bg-surface p-1 shadow-card">
          {(["objective", "skill"] as const).map((v) => (
            <Link
              key={v}
              href={viewHref(v)}
              aria-current={view === v ? "page" : undefined}
              className={buttonStyles({ variant: view === v ? "primary" : "ghost", size: "sm", className: "shadow-none" })}
            >
              By {v}
            </Link>
          ))}
        </nav>
        <form method="get" action={classHref(classId, "mastery")} className="flex flex-wrap items-end gap-3">
          {view === "skill" ? <input type="hidden" name="view" value="skill" /> : null}
          <Field label="Unit" htmlFor="unit" className="min-w-52">
            <Select id="unit" name="unit" defaultValue={unitId ?? ""}>
              <option value="">All units with lessons</option>
              {availableUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  Unit {u.number}: {u.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sort students" htmlFor="sort" className="min-w-44">
            <Select id="sort" name="sort" defaultValue={sort}>
              <option value="name">By name</option>
              <option value="weakest">Most difficulty first</option>
            </Select>
          </Field>
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>
      </div>

      {matrix.students.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No students yet"
          description={
            <>
              Share the join code <span className="font-mono font-semibold text-ink">{ctx.joinCode}</span> with your class. The heatmap fills in as students answer questions.
            </>
          }
        />
      ) : columns.length === 0 ? (
        <EmptyState icon={<Grid3x3 />} title="Nothing to map yet" description="This course has no objectives with lessons in the selected unit yet." />
      ) : (
        <>
          {lookFirst.length ? (
            <Card className="mb-5" padded={false}>
              <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
                <p className="text-sm font-semibold text-ink">Where to look first</p>
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {lookFirst.map((c) => (
                    <li key={c.id}>
                      <Link href={interventionHref(classId, c.id)} className="font-medium text-accent underline-offset-4 hover:underline">
                        {c.label}
                      </Link>{" "}
                      <span className="text-muted">
                        {c.difficulty} showing difficulty · {c.noEvidence} no evidence
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ) : null}

          <MasteryHeatmap classId={classId} kind={view} columns={columns} rows={rows} studentCount={matrix.students.length} />

          <Section title="Reading the heatmap" className="mt-8">
            <div className="space-y-3 text-sm text-muted">
              <MasteryLegend />
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <span className="font-medium text-ink-2">Dashed outline</span> — no graded evidence yet. That is unknown, not weak: assign a few questions to find out.
                </li>
                {view === "objective" ? (
                  <li>
                    <span className="font-medium text-ink-2">“2/4” under a cell</span> — only 2 of the objective’s 4 skills have evidence. Partial coverage can never read above Approaching mastery.
                  </li>
                ) : null}
                <li>
                  <span className="font-medium text-ink-2">“Showing difficulty”</span> counts students whose answers on a tested skill are mostly wrong. A student below Proficient whose answers so far are mostly correct is shown as “needs more evidence” instead, and untested skills never count against anyone.
                </li>
                <li>Levels are evidence summaries from graded answers only (help and retries count for less). Time spent never changes them.</li>
                {sort === "weakest" ? <li>Sorted by most objectives showing difficulty; students with no evidence come last.</li> : null}
              </ul>
            </div>
          </Section>
        </>
      )}
    </>
  );
}
