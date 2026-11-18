"use client";
/**
 * MasteryHeatmap — students × objectives (or skills). Every cell is a real
 * button with a full text label; Enter/Space opens the evidence drawer, arrow
 * keys move between cells (Home/End jump within a row). On small screens the
 * grid becomes a per-student list using the same drawer.
 *
 * Data is computed on the server and passed in serialisable form; the drawer
 * loads evidence on demand through the loadCellEvidence server action.
 */
import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import { ChevronRight, ExternalLink } from "lucide-react";
import { loadCellEvidence } from "@/app/teacher/classes/actions";
import { Badge, Drawer, ErrorState, MasteryBadge, MasteryDot, SegmentedProgress, Skeleton, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { LEVEL_LABEL, MASTERY_LEVELS, type MasteryLevel } from "@/modules/mastery/types";
import { EvidencePanel } from "./EvidencePanel";
import { READING_LABEL, interventionHref, studentHref, type CellReading } from "./format";
import type { CellEvidenceResult } from "./types";

export interface HeatmapColumn {
  id: string;
  label: string;
  /** Objective code (objective view) or parent objective code (skill view). */
  code: string | null;
  description: string;
  unitLabel: string;
  skillCount: number;
  distribution: Record<MasteryLevel, number>;
  needsReview: number;
  /** Skill-aware counts of students. */
  difficulty: number;
  noEvidence: number;
  proficient: number;
}

export interface HeatmapCell {
  level: MasteryLevel;
  needsReview: boolean;
  skillsWithEvidence: number;
  totalSkills: number;
  reading: CellReading;
}

export interface HeatmapRow {
  id: string;
  name: string;
  isDemo: boolean;
  /** Aligned with columns. */
  cells: HeatmapCell[];
  difficultyCount: number;
  noEvidenceCount: number;
}

interface Selection {
  studentId: string;
  studentName: string;
  columnId: string;
  columnLabel: string;
}

function cellLabel(row: HeatmapRow, col: HeatmapColumn, cell: HeatmapCell, kind: "objective" | "skill"): string {
  const what = kind === "objective" ? `objective ${col.label}` : `skill ${col.label}`;
  const level = cell.skillsWithEvidence === 0 ? "no evidence yet" : LEVEL_LABEL[cell.level];
  const partial = cell.totalSkills > 1 && cell.skillsWithEvidence > 0 && cell.skillsWithEvidence < cell.totalSkills ? `, ${cell.skillsWithEvidence} of ${cell.totalSkills} skills tested` : "";
  const review = cell.needsReview ? ", needs review" : "";
  return `${row.name}, ${what}: ${level}${review}${partial}. ${READING_LABEL[cell.reading]}. Open evidence.`;
}

function CellGlyph({ cell }: { cell: HeatmapCell }) {
  const partial = cell.totalSkills > 1 && cell.skillsWithEvidence < cell.totalSkills && cell.skillsWithEvidence > 0;
  return (
    <span aria-hidden="true" className="flex flex-col items-center gap-0.5">
      <MasteryDot level={cell.level} needsReview={cell.needsReview} />
      <span className={cn("h-3.5 text-[0.625rem] font-medium leading-none tabular-nums", partial ? "text-muted" : "text-transparent")}>
        {partial ? `${cell.skillsWithEvidence}/${cell.totalSkills}` : "·"}
      </span>
    </span>
  );
}

export function MasteryHeatmap({
  classId,
  kind,
  columns,
  rows,
  studentCount,
}: {
  classId: string;
  kind: "objective" | "skill";
  columns: HeatmapColumn[];
  rows: HeatmapRow[];
  studentCount: number;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [result, setResult] = useState<CellEvidenceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const request = useRef(0);
  const tableRef = useRef<HTMLTableElement>(null);

  const open = async (sel: Selection) => {
    const id = ++request.current;
    setSelection(sel);
    setResult(null);
    setLoading(true);
    try {
      const r = await loadCellEvidence(classId, sel.studentId, sel.columnId);
      if (request.current === id) setResult(r);
    } catch {
      if (request.current === id) setResult({ ok: false, error: "Couldn't load the evidence. Check your connection and try again." });
    } finally {
      if (request.current === id) setLoading(false);
    }
  };

  const close = () => {
    request.current++;
    setSelection(null);
    setResult(null);
    setLoading(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTableElement>) => {
    const target = e.target as HTMLElement;
    if (target.dataset.r === undefined || target.dataset.c === undefined) return;
    let r = Number(target.dataset.r);
    let c = Number(target.dataset.c);
    switch (e.key) {
      case "ArrowRight":
        c += 1;
        break;
      case "ArrowLeft":
        c -= 1;
        break;
      case "ArrowDown":
        r += 1;
        break;
      case "ArrowUp":
        r -= 1;
        break;
      case "Home":
        c = 0;
        break;
      case "End":
        c = columns.length - 1;
        break;
      default:
        return;
    }
    const next = tableRef.current?.querySelector<HTMLButtonElement>(`button[data-r="${r}"][data-c="${c}"]`);
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  const kindLabel = kind === "objective" ? "Objective" : "Skill";

  return (
    <>
      {/* ── Desktop / tablet grid ─────────────────────────────────────────── */}
      <div className="hidden md:block">
        <p id="heatmap-help" className="mb-2 text-xs text-muted">
          Tab to a cell and press Enter to see the evidence. Arrow keys move between cells.
        </p>
        <div className="isolate max-h-[75vh] overflow-auto rounded-card border border-line bg-surface shadow-card" role="region" aria-label="Mastery heatmap (scrolls horizontally)" tabIndex={0}>
          <table ref={tableRef} onKeyDown={onKeyDown} aria-describedby="heatmap-help" className="border-separate border-spacing-0 text-sm">
            <caption className="sr-only">
              Mastery by student and {kind}. Rows are students; columns are {kind}s with the class distribution under each heading.
            </caption>
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 top-0 z-30 min-w-48 border-b border-r border-line bg-surface-2 px-4 py-3 text-left align-bottom text-xs font-semibold text-muted">
                  Student
                </th>
                {columns.map((col) => (
                  <th key={col.id} scope="col" className="sticky top-0 z-20 w-32 min-w-32 border-b border-line bg-surface-2 px-2 py-3 text-left align-bottom font-normal">
                    <span className="block text-[0.6875rem] text-faint">{col.unitLabel}</span>
                    <Link
                      href={interventionHref(classId, col.id)}
                      title={col.description}
                      className="mt-0.5 line-clamp-2 block rounded text-xs font-semibold text-ink underline-offset-4 hover:underline"
                    >
                      {col.label}
                      <span className="sr-only">: {col.description}. Plan an intervention.</span>
                    </Link>
                    {kind === "skill" && col.code ? <span className="block text-[0.6875rem] text-muted">{col.code}</span> : null}
                    {kind === "objective" ? <span className="block text-[0.6875rem] text-muted">{col.skillCount} skill{col.skillCount === 1 ? "" : "s"}</span> : null}
                    <SegmentedProgress
                      className="mt-2"
                      size="sm"
                      total={studentCount}
                      label={`${col.label} class distribution`}
                      segments={MASTERY_LEVELS.map((level) => ({ level, count: col.distribution[level] }))}
                    />
                    <span className="mt-1.5 block space-y-0.5 text-[0.6875rem] leading-tight text-muted">
                      <span className="block">
                        <span className="font-semibold tabular-nums text-ink-2">{col.proficient}</span> Proficient+
                      </span>
                      <span className="block">
                        <span className="font-semibold tabular-nums text-ink-2">{col.difficulty}</span> showing difficulty
                      </span>
                      <span className="block">
                        <span className="font-semibold tabular-nums text-ink-2">{col.noEvidence}</span> no evidence
                      </span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={row.id} className="group">
                  <th scope="row" className="sticky left-0 z-10 border-b border-r border-line bg-surface px-4 py-2 text-left font-medium text-ink group-hover:bg-surface-2">
                    <Link href={studentHref(row.id, classId)} className="rounded underline-offset-4 hover:underline">
                      {row.name}
                    </Link>
                    <span className="mt-0.5 block text-[0.6875rem] font-normal text-muted">
                      {row.difficultyCount ? `${row.difficultyCount} showing difficulty` : row.noEvidenceCount === columns.length ? "No evidence yet" : "No difficulty shown"}
                      {row.noEvidenceCount && row.noEvidenceCount < columns.length ? ` · ${row.noEvidenceCount} untested` : ""}
                    </span>
                  </th>
                  {columns.map((col, c) => {
                    const cell = row.cells[c];
                    const selected = selection?.studentId === row.id && selection.columnId === col.id;
                    return (
                      <td key={col.id} className="border-b border-line p-1 text-center group-hover:bg-surface-2">
                        <button
                          type="button"
                          data-r={r}
                          data-c={c}
                          onClick={() => open({ studentId: row.id, studentName: row.name, columnId: col.id, columnLabel: col.label })}
                          className={cn(
                            "inline-flex h-12 w-full min-w-16 items-center justify-center rounded-lg border transition-colors hover:border-line-strong hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
                            cell.reading === "no_evidence" ? "border-dashed border-line-strong" : "border-transparent",
                            selected && "border-accent bg-accent-soft",
                          )}
                        >
                          <CellGlyph cell={cell} />
                          <span className="sr-only">{cellLabel(row, col, cell, kind)}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Phone: per-student list ───────────────────────────────────────── */}
      <ul className="space-y-3 md:hidden" aria-label={`Mastery by student (${kindLabel.toLowerCase()}s)`}>
        {rows.map((row) => (
          <li key={row.id}>
            <details className="group rounded-card border border-line bg-surface shadow-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="block font-medium text-ink">{row.name}</span>
                  <span className="block text-xs text-muted">
                    {row.difficultyCount ? `${row.difficultyCount} showing difficulty` : "No difficulty shown"} · {row.noEvidenceCount} with no evidence
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted transition-transform group-open:rotate-90" />
              </summary>
              <ul className="divide-y divide-line border-t border-line">
                {columns.map((col, c) => {
                  const cell = row.cells[c];
                  return (
                    <li key={col.id}>
                      <button
                        type="button"
                        onClick={() => open({ studentId: row.id, studentName: row.name, columnId: col.id, columnLabel: col.label })}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-2"
                      >
                        <span className="min-w-0 text-sm text-ink-2">
                          <span className="block font-medium text-ink">{col.label}</span>
                          <span className="block text-xs text-muted">
                            {cell.skillsWithEvidence === 0
                              ? "No evidence yet"
                              : cell.totalSkills > 1 && cell.skillsWithEvidence < cell.totalSkills
                                ? `${cell.skillsWithEvidence} of ${cell.totalSkills} skills tested`
                                : READING_LABEL[cell.reading]}
                          </span>
                        </span>
                        <MasteryBadge level={cell.level} needsReview={cell.needsReview} size="sm" />
                        <span className="sr-only">Open evidence</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="border-t border-line px-4 py-3">
                <Link href={studentHref(row.id, classId)} className="inline-flex items-center gap-1 text-sm font-medium text-accent">
                  Open profile <ExternalLink aria-hidden="true" className="size-3.5" />
                </Link>
              </div>
            </details>
          </li>
        ))}
      </ul>

      <Drawer
        open={selection !== null}
        onClose={close}
        title={selection ? `${selection.studentName} · ${selection.columnLabel}` : "Evidence"}
        description={`${kindLabel} evidence — what the mastery level is based on`}
      >
        {loading ? (
          <div role="status" aria-live="polite" className="space-y-4">
            <p className="flex items-center gap-2 text-sm text-muted">
              <Spinner size="sm" /> Loading evidence…
            </p>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : result && !result.ok ? (
          <ErrorState description={result.error} retry={selection ? () => open(selection) : undefined} />
        ) : result && result.ok ? (
          <>
            {result.evidence.student.id !== selection?.studentId ? null : <EvidencePanel evidence={result.evidence} variant="drawer" />}
            <p className="mt-6">
              <Badge tone="neutral">Evidence summary, not a test score</Badge>
            </p>
          </>
        ) : null}
      </Drawer>
    </>
  );
}
