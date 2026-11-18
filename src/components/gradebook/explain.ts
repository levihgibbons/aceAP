/**
 * Plain-language explanations of where a gradebook number came from.
 * Pure and server-safe: pages compute the strings and pass them to client UI.
 */
import type { GradebookCell, GradeCellStatus } from "@/modules/gradebook/service";
import type { GradingPolicyConfig } from "@/modules/gradebook/policy";
import { LEVEL_LABEL } from "@/modules/mastery/types";

export interface SubmissionFact {
  score: number | null;
  maxScore: number | null;
  late: boolean;
  submittedAt: Date;
}

export interface ExplainContext {
  gradingMethod: "score" | "mastery" | "completion";
  policy: GradingPolicyConfig;
  submissions: SubmissionFact[];
  skillName: (id: string) => string;
  userName: (id: string | null) => string;
}

const num = (x: number) => (Number.isInteger(x) ? String(x) : String(Math.round(x * 100) / 100));
export const pct = (x: number | null | undefined) =>
  x === null || x === undefined ? "—" : `${num(x)}%`;

export const STATUS_TEXT: Record<GradeCellStatus, string> = {
  not_submitted: "Not submitted",
  submitted: "Submitted",
  late: "Late",
  awaiting_grading: "Awaiting grading",
  excused: "Excused",
  missing: "Missing",
};

/** The score-attempt line, recomputed from the raw submissions so it can show s/m. */
function scoreLine(ctx: ExplainContext): string | null {
  const graded = ctx.submissions.filter(
    (s) => s.score !== null && s.maxScore !== null && s.maxScore > 0,
  );
  if (graded.length === 0) return null;
  const penalty = ctx.policy.latePenalty;
  const p = (s: SubmissionFact) =>
    Math.max(0, ((s.score as number) / (s.maxScore as number)) * 100 - (s.late ? penalty : 0));
  const chosen =
    ctx.policy.attemptRule === "best"
      ? graded.reduce((a, b) => (p(b) > p(a) ? b : a))
      : graded.reduce((a, b) => (b.submittedAt.getTime() >= a.submittedAt.getTime() ? b : a));
  const raw = ((chosen.score as number) / (chosen.maxScore as number)) * 100;
  const lead =
    graded.length === 1
      ? "1 attempt"
      : `${ctx.policy.attemptRule === "best" ? "Best" : "Latest"} of ${graded.length} attempts`;
  const base = `${lead}: ${num(chosen.score as number)}/${num(chosen.maxScore as number)} = ${num(Math.round(raw * 10) / 10)}%`;
  return chosen.late && penalty > 0
    ? `${base}, minus ${num(penalty)}-point late penalty = ${num(Math.round(p(chosen) * 10) / 10)}%`
    : base;
}

/** Lines describing the cell's grade source, most important first. */
export function explainCell(cell: GradebookCell, ctx: ExplainContext): string[] {
  const lines: string[] = [];
  const src = cell.source;
  switch (src.kind) {
    case "override": {
      const was = src.replaced === null ? "no computed grade" : `was ${pct(src.replaced)}`;
      lines.push(
        `Override by ${ctx.userName(src.by)}: ${pct(cell.percent)} (${was})${src.reason ? ` — “${src.reason}”` : ""}`,
      );
      lines.push("The computed grade is kept underneath and returns if the override is cleared.");
      break;
    }
    case "score":
      lines.push(
        scoreLine(ctx) ??
          `${src.attemptRule === "best" ? "Best" : "Latest"} of ${src.attempts} attempt(s) = ${pct(src.percent)}`,
      );
      break;
    case "mastery": {
      const parts = src.skills.map(
        (s) => `${ctx.skillName(s.skillId)} — ${LEVEL_LABEL[s.level]} → ${num(s.grade)}%`,
      );
      lines.push(
        `Mastery-graded (${src.basis === "highest" ? "highest level demonstrated" : "current level"}): ${parts.join("; ")}${src.skills.length > 1 ? `; average ${pct(cell.percent)}` : ""}`,
      );
      if (src.skills.some((s) => s.level === "not_started"))
        lines.push("Skills with no evidence yet count as Not started.");
      break;
    }
    case "completion":
      lines.push("Completion-graded: submitted → 100%.");
      break;
    case "none":
      if (src.reason === "awaiting_grading")
        lines.push("Submitted — waiting for written responses to be scored with the rubric.");
      else if (src.reason === "no_skills")
        lines.push("No skills are attached to this assignment, so mastery can't produce a grade.");
      else if (cell.status === "missing")
        lines.push("Missing: past due with no submission. Not counted as zero in averages.");
      else lines.push("No submission yet.");
      break;
  }
  if (cell.status === "late" && src.kind !== "override")
    lines.push(
      ctx.policy.latePenalty > 0 && ctx.gradingMethod === "score"
        ? `Submitted late (late penalty: ${num(ctx.policy.latePenalty)} points).`
        : "Submitted after the due date.",
    );
  if (cell.status === "excused") lines.push("Excused — left out of every average.");
  return lines;
}
