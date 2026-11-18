/**
 * Pure interpretation of mastery-matrix cells for teachers. The key rule:
 * "not enough evidence" is never treated as "weak performance".
 *
 * An objective rollup reads below Proficient both when a tested skill is weak
 * AND when tested skills are fine but others are untested (the rollup caps
 * partial coverage at Approaching). The skill-level matrix tells them apart.
 */
import type { MasteryMatrix, MatrixCell } from "@/modules/classrooms/analytics";
import { DEFAULT_MASTERY_POLICY } from "@/modules/mastery/policy";
import { LEVEL_RANK, MASTERY_LEVELS, type MasteryLevel } from "@/modules/mastery/types";
import type { CellReading } from "./format";

export type { CellReading } from "./format";

/**
 * A sub-Proficient skill reads as "difficulty" only when its graded evidence
 * leans toward incorrect: the estimate has fallen below the prior's neutral mean
 * (alpha = beta → 0.5). Correct answers always pull the estimate above 0.5, so a
 * student with only a few correct answers reads as "needs more evidence", never
 * as struggling. (A single low-weight correct answer leaves the estimate near
 * 0.57, which the Approaching cut-off of 0.6 would misread as difficulty.)
 */
const PRIOR = DEFAULT_MASTERY_POLICY.prior;
export const WEAK_ESTIMATE = PRIOR.alpha / (PRIOR.alpha + PRIOR.beta);

export function readCell(cell: MatrixCell | undefined, skillIds: string[], skillCells?: Record<string, MatrixCell>): CellReading {
  if (!cell || cell.skillsWithEvidence === 0) return "no_evidence";
  if (LEVEL_RANK[cell.level] < LEVEL_RANK.proficient) {
    const tested = skillCells ? skillIds.map((id) => skillCells[id]).filter((c): c is MatrixCell => Boolean(c && c.skillsWithEvidence > 0)) : [cell];
    if (tested.length === 0) return "no_evidence";
    const below = tested.filter((c) => LEVEL_RANK[c.level] < LEVEL_RANK.proficient);
    if (below.some((c) => (c.estimate ?? 0) < WEAK_ESTIMATE)) return "difficulty";
    return below.length ? "emerging" : "partial";
  }
  return cell.needsReview ? "review" : "on_track";
}

export interface StudentMatrixSummary {
  studentId: string;
  totalColumns: number;
  proficient: number;
  withEvidence: number;
  difficulty: string[];
  noEvidence: string[];
  partial: string[];
  emerging: string[];
  review: string[];
  /** Sum of level ranks — used for "weakest first" sorting (lower = weaker). */
  rankSum: number;
}

/** Summarise one student across an objective matrix, using the skill matrix to separate weak from untested. */
export function summariseStudent(objectives: MasteryMatrix, skills: MasteryMatrix | null, studentId: string): StudentMatrixSummary {
  const row = objectives.cells[studentId] ?? {};
  const skillRow = skills?.cells[studentId];
  const out: StudentMatrixSummary = { studentId, totalColumns: objectives.columns.length, proficient: 0, withEvidence: 0, difficulty: [], noEvidence: [], partial: [], emerging: [], review: [], rankSum: 0 };
  for (const col of objectives.columns) {
    const cell = row[col.id];
    const reading = readCell(cell, col.skillIds, skillRow);
    if (cell) out.rankSum += LEVEL_RANK[cell.level];
    if (cell && cell.skillsWithEvidence > 0) out.withEvidence += 1;
    if (cell && LEVEL_RANK[cell.level] >= LEVEL_RANK.proficient) out.proficient += 1;
    if (reading === "difficulty") out.difficulty.push(col.id);
    else if (reading === "no_evidence") out.noEvidence.push(col.id);
    else if (reading === "partial") out.partial.push(col.id);
    else if (reading === "emerging") out.emerging.push(col.id);
    else if (reading === "review") out.review.push(col.id);
  }
  return out;
}

/** Distribution of every student × column cell, for a class-wide summary bar. */
export function matrixDistribution(matrix: MasteryMatrix): { segments: { level: MasteryLevel; count: number }[]; total: number } {
  const counts = Object.fromEntries(MASTERY_LEVELS.map((l) => [l, 0])) as Record<MasteryLevel, number>;
  for (const col of matrix.columns) for (const l of MASTERY_LEVELS) counts[l] += col.distribution[l];
  return { segments: MASTERY_LEVELS.map((level) => ({ level, count: counts[level] })), total: matrix.columns.length * matrix.students.length };
}

/** Per column: how many students show difficulty vs have no evidence (skill-aware). */
export function columnReadings(objectives: MasteryMatrix, skills: MasteryMatrix | null, columnId: string): Record<CellReading, string[]> {
  const col = objectives.columns.find((c) => c.id === columnId);
  const out: Record<CellReading, string[]> = { no_evidence: [], difficulty: [], emerging: [], partial: [], review: [], on_track: [] };
  if (!col) return out;
  for (const s of objectives.students) out[readCell(objectives.cells[s.id]?.[col.id], col.skillIds, skills?.cells[s.id])].push(s.id);
  return out;
}
