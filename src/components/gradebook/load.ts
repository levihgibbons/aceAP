/**
 * Server-side loader that turns the gradebook service's output into a
 * serialisable view (strings for dates, explanation lines per cell) for the
 * gradebook grid and the assignment detail page.
 */
import "server-only";
import { inArray } from "drizzle-orm";
import { asUser, getDb, type Actor } from "@/db/client";
import * as t from "@/db/schema";
import { getCourseTree, type CourseTree } from "@/modules/curriculum/queries";
import { getGradebook, type Gradebook, type GradeCellStatus } from "@/modules/gradebook/service";
import type { StaffUser } from "@/modules/classrooms/service";
import { formatDate } from "@/components/ui/format";
import { explainCell, type SubmissionFact } from "./explain";

export interface GridCell {
  percent: number | null;
  /** Grade the evidence supports before any override. */
  computedPercent: number | null;
  points: number | null;
  status: GradeCellStatus;
  sourceKind: "none" | "score" | "mastery" | "completion" | "override";
  override: { grade: number; reason: string | null; byName: string; at: string | null } | null;
  comment: string | null;
  attempts: number;
  /** Best raw score across graded submissions, e.g. "8/10". */
  bestScore: string | null;
  explanation: string[];
  dueAt: string | null;
}

export interface GridAssignment {
  id: string;
  title: string;
  kind: t.AssignmentKind;
  gradingMethod: "score" | "mastery" | "completion";
  points: number;
  dueAt: string | null;
  /** Server-formatted short due date ("Nov 20"), so SSR and hydration agree. */
  dueLabel: string | null;
  average: number | null;
  counted: number;
}

export interface GridStudent {
  id: string;
  name: string;
  average: number | null;
  counted: number;
}

export interface GradebookView {
  gb: Gradebook;
  tree: CourseTree | null;
  assignments: GridAssignment[];
  students: GridStudent[];
  /** cells[studentId][assignmentId]; absent = not assigned to that student. */
  cells: Record<string, Record<string, GridCell>>;
}

const num = (x: number) => (Number.isInteger(x) ? String(x) : String(Math.round(x * 100) / 100));

export async function loadGradebookView(user: StaffUser, classId: string): Promise<GradebookView> {
  const gb = await getGradebook(user, classId);
  const tree = await getCourseTree(gb.class.courseId);
  const aIds = gb.assignments.map((a) => a.id);

  const subs = aIds.length
    ? await asUser(user as Actor, (tx) =>
        tx
          .select({
            assignmentId: t.submissions.assignmentId,
            studentId: t.submissions.studentId,
            score: t.submissions.score,
            maxScore: t.submissions.maxScore,
            status: t.submissions.status,
            submittedAt: t.submissions.submittedAt,
          })
          .from(t.submissions)
          .where(inArray(t.submissions.assignmentId, aIds)),
      )
    : [];
  const subsBy = new Map<string, SubmissionFact[]>();
  for (const s of subs) {
    const k = `${s.assignmentId}:${s.studentId}`;
    const list = subsBy.get(k) ?? [];
    list.push({
      score: s.score,
      maxScore: s.maxScore,
      late: s.status === "late",
      submittedAt: s.submittedAt,
    });
    subsBy.set(k, list);
  }

  // Override authors are staff; names come from the trusted role (staff names only).
  const authorIds = new Set<string>();
  for (const row of Object.values(gb.cells))
    for (const c of Object.values(row)) if (c.override?.by) authorIds.add(c.override.by);
  const authors = authorIds.size
    ? await (
        await getDb()
      )
        .select({ id: t.users.id, name: t.users.name })
        .from(t.users)
        .where(inArray(t.users.id, [...authorIds]))
    : [];
  const authorName = new Map(authors.map((a) => [a.id, a.name]));

  const skillName = (id: string) => tree?.skills.get(id)?.name ?? id;
  const userName = (id: string | null) =>
    id ? (authorName.get(id) ?? "a staff member") : "a staff member";

  const cells: GradebookView["cells"] = {};
  for (const s of gb.students) {
    cells[s.id] = {};
    for (const a of gb.assignments) {
      const cell = gb.cells[s.id]?.[a.id];
      if (!cell) continue;
      const facts = subsBy.get(`${a.id}:${s.id}`) ?? [];
      const graded = facts.filter((f) => f.score !== null && f.maxScore !== null && f.maxScore > 0);
      const best = graded.length
        ? graded.reduce((x, y) =>
            (y.score as number) / (y.maxScore as number) >
            (x.score as number) / (x.maxScore as number)
              ? y
              : x,
          )
        : null;
      cells[s.id][a.id] = {
        percent: cell.percent,
        computedPercent: cell.source.kind === "override" ? cell.source.replaced : cell.percent,
        points: cell.points,
        status: cell.status,
        sourceKind: cell.source.kind,
        override: cell.override
          ? {
              grade: cell.override.grade,
              reason: cell.override.reason,
              byName: userName(cell.override.by),
              at: cell.override.at ? cell.override.at.toISOString() : null,
            }
          : null,
        comment: cell.comment,
        attempts: cell.attempts,
        bestScore: best ? `${num(best.score as number)}/${num(best.maxScore as number)}` : null,
        explanation: explainCell(cell, {
          gradingMethod: a.gradingMethod,
          policy: gb.policy.config,
          submissions: facts,
          skillName,
          userName,
        }),
        dueAt: cell.dueAt ? cell.dueAt.toISOString() : null,
      };
    }
  }

  return {
    gb,
    tree,
    assignments: gb.assignments.map((a) => ({
      id: a.id,
      title: a.title,
      kind: a.kind,
      gradingMethod: a.gradingMethod,
      points: a.points,
      dueAt: a.dueAt ? a.dueAt.toISOString() : null,
      dueLabel: a.dueAt ? formatDate(a.dueAt, { short: true }) : null,
      average: gb.averages.assignments[a.id]?.percent ?? null,
      counted: gb.averages.assignments[a.id]?.counted ?? 0,
    })),
    students: gb.students.map((s) => ({
      id: s.id,
      name: s.name,
      average: gb.averages.students[s.id]?.percent ?? null,
      counted: gb.averages.students[s.id]?.counted ?? 0,
    })),
    cells,
  };
}
