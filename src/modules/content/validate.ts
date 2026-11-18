/**
 * Deterministic content validation — the "Validation" stage of the content
 * pipeline (Draft → Review → Validation → Published). Nothing is published by
 * content sync unless this returns no errors.
 */
import katex from "katex";
import { courseContentSchema, type AuthoredQuestion, type CourseContent, type CourseContentInput } from "./schema";
import { gradeResponse, type QuestionResponse } from "@/modules/assessments/grading";
import { compileExpression } from "@/modules/assessments/math";
import { SIMULATION_IDS } from "@/components/simulations/types";

export interface ContentIssue {
  level: "error" | "warning";
  where: string;
  message: string;
}

export interface ValidationResult {
  content: CourseContent | null;
  issues: ContentIssue[];
  checks: { name: string; passed: boolean; detail?: string }[];
}

const MATH_SEGMENT = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

function latexErrors(text: string): string[] {
  const errors: string[] = [];
  const dollars = (text.match(/(?<!\\)\$/g) ?? []).length;
  if (dollars % 2 !== 0) errors.push("unbalanced $ delimiters");
  for (const m of text.matchAll(MATH_SEGMENT)) {
    const src = m[1] ?? m[2];
    try {
      katex.renderToString(src, { throwOnError: true, displayMode: Boolean(m[1]), strict: "ignore" });
    } catch (e) {
      errors.push(`LaTeX "${src.slice(0, 40)}": ${(e as Error).message.slice(0, 80)}`);
    }
  }
  return errors;
}

function questionTexts(q: AuthoredQuestion): string[] {
  const texts = [q.prompt, q.solution, ...q.hints];
  const b = q.body;
  if (b.type === "multiple_choice" || b.type === "multi_select") for (const c of b.choices) texts.push(c.text, c.rationale ?? "");
  if (b.type === "ordering") texts.push(...b.items.map((i) => i.text));
  if (b.type === "matching") texts.push(...b.left.map((i) => i.text), ...b.right.map((i) => i.text));
  if (b.type === "numeric") texts.push(...(b.commonErrors ?? []).map((c) => c.note ?? ""));
  if (b.type === "expression") texts.push(...(b.commonErrors ?? []).map((c) => c.note ?? ""));
  return texts;
}

/** Grade the authored key and every authored wrong answer through the real grader. */
function checkAnswerKey(q: AuthoredQuestion, misconceptionIds: Set<string>): string[] {
  const errs: string[] = [];
  const b = q.body;
  const grade = (resp: QuestionResponse) => gradeResponse(q.id, b, resp);
  const mustBe = (label: string, resp: QuestionResponse, expectCorrect: boolean, expectMisconception?: string) => {
    const g = grade(resp);
    if (g.status !== "graded") return errs.push(`${label}: grader returned "${g.status}"`);
    if (g.correct !== expectCorrect) errs.push(`${label}: expected ${expectCorrect ? "correct" : "incorrect"} but graded ${g.correct ? "correct" : "incorrect"}`);
    if (expectMisconception && g.misconceptionId !== expectMisconception) errs.push(`${label}: expected misconception ${expectMisconception}, got ${g.misconceptionId}`);
  };
  const knownMisconception = (id: string | undefined, label: string) => {
    if (id && !misconceptionIds.has(id)) errs.push(`${label}: unknown misconception "${id}"`);
  };

  switch (b.type) {
    case "multiple_choice": {
      const ids = b.choices.map((c) => c.id);
      if (new Set(ids).size !== ids.length) errs.push("duplicate choice ids");
      if (!ids.includes(b.correctChoiceId)) errs.push("correctChoiceId is not one of the choices");
      else mustBe("key", { type: "multiple_choice", choiceId: b.correctChoiceId }, true);
      for (const c of b.choices) {
        knownMisconception(c.misconception, `choice ${c.id}`);
        if (c.id === b.correctChoiceId && c.misconception) errs.push("the correct choice is tagged with a misconception");
      }
      if (new Set(b.choices.map((c) => c.text.trim())).size !== b.choices.length) errs.push("two choices have identical text");
      break;
    }
    case "multi_select": {
      const ids = new Set(b.choices.map((c) => c.id));
      if (b.correctChoiceIds.some((c) => !ids.has(c))) errs.push("correctChoiceIds contains an unknown id");
      else mustBe("key", { type: "multi_select", choiceIds: b.correctChoiceIds }, true);
      if (b.correctChoiceIds.length === b.choices.length) errs.push("every option is correct — nothing to discriminate");
      for (const c of b.choices) knownMisconception(c.misconception, `choice ${c.id}`);
      break;
    }
    case "numeric": {
      if (!Number.isFinite(b.answer)) errs.push("answer is not finite");
      if (b.tolerance.abs === undefined && b.tolerance.rel === undefined) errs.push("no tolerance specified");
      mustBe("key", { type: "numeric", value: String(b.answer) }, true);
      for (const c of b.commonErrors ?? []) {
        knownMisconception(c.misconception, `commonError ${c.value}`);
        mustBe(`commonError ${c.value}`, { type: "numeric", value: String(c.value) }, false, c.misconception);
      }
      break;
    }
    case "expression": {
      try {
        compileExpression(b.answer, b.variables);
      } catch (e) {
        errs.push(`answer does not parse: ${(e as Error).message}`);
        break;
      }
      mustBe("key", { type: "expression", value: b.answer }, true);
      // The input hint is shown to students: it must never contain the answer itself.
      for (const token of (b.inputHint ?? "").split(/[\s,;]+/).map((s) => s.replace(/[.:]+$/, "")).filter((s) => /[a-z]/i.test(s) && /[0-9(^*]/.test(s))) {
        try {
          const g = gradeResponse(q.id, b, { type: "expression", value: token });
          if (g.status === "graded" && g.correct) errs.push(`inputHint reveals the answer ("${token}")`);
        } catch {
          // not an expression
        }
      }
      for (const c of b.commonErrors ?? []) {
        knownMisconception(c.misconception, `commonError ${c.expr}`);
        try {
          compileExpression(c.expr, b.variables);
        } catch (e) {
          errs.push(`commonError "${c.expr}" does not parse: ${(e as Error).message}`);
          continue;
        }
        mustBe(`commonError ${c.expr}`, { type: "expression", value: c.expr }, false, c.misconception);
      }
      break;
    }
    case "ordering": {
      const ids = b.items.map((i) => i.id);
      if (new Set(ids).size !== ids.length) errs.push("duplicate item ids");
      if (b.correctOrder.length !== ids.length || b.correctOrder.some((i) => !ids.includes(i))) errs.push("correctOrder is not a permutation of the items");
      else mustBe("key", { type: "ordering", order: b.correctOrder }, true);
      break;
    }
    case "matching": {
      const rights = new Set(b.right.map((x) => x.id));
      for (const l of b.left) if (!b.pairs[l.id] || !rights.has(b.pairs[l.id])) errs.push(`left item ${l.id} has no valid pair`);
      if (!errs.length) mustBe("key", { type: "matching", pairs: b.pairs }, true);
      break;
    }
    case "short_response":
      if (b.sampleResponse.trim().length < 20) errs.push("sample response is too short to guide a grader");
      break;
  }
  return errs;
}

export function validateCourseContent(input: CourseContentInput, options: { minQuestionsPerSkill?: number; minPatternsPerSkill?: number } = {}): ValidationResult {
  const issues: ContentIssue[] = [];
  const err = (where: string, message: string) => issues.push({ level: "error", where, message });
  const warn = (where: string, message: string) => issues.push({ level: "warning", where, message });

  const parsed = courseContentSchema.safeParse(input);
  if (!parsed.success) {
    for (const i of parsed.error.issues) err(i.path.join("."), i.message);
    return { content: null, issues, checks: [{ name: "schema", passed: false }] };
  }
  const c = parsed.data;
  const prefix = `${c.courseId}.`;

  const skillIds = new Set<string>();
  for (const s of c.skills) {
    if (skillIds.has(s.id)) err(s.id, "duplicate skill id");
    if (!s.id.startsWith(prefix)) err(s.id, `skill id must start with "${prefix}"`);
    skillIds.add(s.id);
  }
  for (const s of c.skills) {
    for (const p of s.prerequisites) {
      if (!skillIds.has(p)) err(s.id, `unknown prerequisite "${p}"`);
      if (p === s.id) err(s.id, "a skill cannot be its own prerequisite");
    }
  }
  // Prerequisite graph must be acyclic.
  const state = new Map<string, 0 | 1 | 2>();
  const bySkill = new Map(c.skills.map((s) => [s.id, s]));
  const visit = (id: string): boolean => {
    if (state.get(id) === 1) return true;
    if (state.get(id) === 2) return false;
    state.set(id, 1);
    for (const p of bySkill.get(id)?.prerequisites ?? []) if (visit(p)) return true;
    state.set(id, 2);
    return false;
  };
  for (const s of c.skills) if (visit(s.id)) err(s.id, "prerequisite cycle detected");

  const misconceptionIds = new Set<string>();
  for (const m of c.misconceptions) {
    if (misconceptionIds.has(m.id)) err(m.id, "duplicate misconception id");
    misconceptionIds.add(m.id);
    if (!skillIds.has(m.skillId)) err(m.id, `unknown skill "${m.skillId}"`);
  }

  const questionIds = new Set<string>();
  const perSkill = new Map<string, { count: number; patterns: Set<string> }>();
  let latexChecked = 0;
  let keysChecked = 0;
  for (const q of c.questions) {
    if (questionIds.has(q.id)) err(q.id, "duplicate question id");
    if (!q.id.startsWith(prefix)) err(q.id, `question id must start with "${prefix}"`);
    questionIds.add(q.id);
    for (const s of q.skillIds) if (!skillIds.has(s)) err(q.id, `unknown skill "${s}"`);
    const primary = q.skillIds[0];
    const stat = perSkill.get(primary) ?? { count: 0, patterns: new Set<string>() };
    stat.count += 1;
    stat.patterns.add(q.pattern);
    perSkill.set(primary, stat);
    if (q.body.type !== "short_response" && q.hints.length === 0) warn(q.id, "no hints authored");
    for (const e of checkAnswerKey(q, misconceptionIds)) err(q.id, e);
    keysChecked += 1;
    for (const t of questionTexts(q)) {
      for (const e of latexErrors(t)) err(q.id, e);
      latexChecked += 1;
    }
    if (q.stimulus && !(SIMULATION_IDS as readonly string[]).includes(q.stimulus.simulation.id)) err(q.id, `unknown simulation "${q.stimulus.simulation.id}"`);
    const label = bySkill.get(primary)?.patternLabels[q.pattern];
    if (bySkill.has(primary) && !label) warn(q.id, `pattern "${q.pattern}" has no label on skill ${primary}`);
  }

  const minQ = options.minQuestionsPerSkill ?? 5;
  const minP = options.minPatternsPerSkill ?? 2;
  for (const s of c.skills) {
    const stat = perSkill.get(s.id);
    if (!stat) err(s.id, "skill has no questions — it could never be assessed");
    else {
      if (stat.count < minQ) err(s.id, `only ${stat.count} questions (minimum ${minQ} needed to reach Mastered)`);
      if (stat.patterns.size < minP) err(s.id, `only ${stat.patterns.size} problem pattern(s) (minimum ${minP})`);
    }
  }

  const ids = new Set<string>();
  const once = (id: string, kind: string) => {
    if (ids.has(id)) err(id, `duplicate ${kind} id`);
    ids.add(id);
  };
  const unitIds = new Set<string>();
  const topicIds = new Set<string>();
  const coveredSkills = new Set<string>();
  for (const u of c.units) {
    once(u.id, "unit");
    unitIds.add(u.id);
    for (const t of u.topics) {
      once(t.id, "topic");
      topicIds.add(t.id);
      for (const o of t.objectives) {
        once(o.id, "objective");
        for (const s of o.skillIds) {
          if (!skillIds.has(s)) err(o.id, `unknown skill "${s}"`);
          coveredSkills.add(s);
        }
      }
      for (const l of t.lessons) {
        once(l.id, "lesson");
        for (const s of l.skillIds) if (!skillIds.has(s)) err(l.id, `unknown skill "${s}"`);
        l.blocks.forEach((b, i) => {
          const where = `${l.id}#${i}`;
          if (b.type === "check" && !questionIds.has(b.questionId)) err(where, `unknown question "${b.questionId}"`);
          if (b.type === "simulation" && !(SIMULATION_IDS as readonly string[]).includes(b.simId)) err(where, `unknown simulation "${b.simId}"`);
          const texts: string[] = [];
          if ("md" in b) texts.push(b.md);
          if (b.type === "formula") texts.push(`$$${b.latex}$$`);
          if (b.type === "worked_example") texts.push(b.problem, b.answer ?? "", ...b.steps.map((s) => s.md));
          if (b.type === "summary") texts.push(...b.points);
          if (b.type === "simulation") texts.push(...(b.explore ?? []));
          for (const t2 of texts) {
            for (const e of latexErrors(t2)) err(where, e);
            latexChecked += 1;
          }
        });
        if (!l.blocks.some((b) => b.type === "check")) warn(l.id, "lesson has no check-for-understanding question");
        if (l.blocks.at(-1)?.type !== "summary") warn(l.id, "lesson does not end with a summary");
      }
    }
  }
  for (const s of c.skills) if (!coveredSkills.has(s.id)) err(s.id, "skill is not mapped to any learning objective");

  for (const a of c.assessments) {
    once(a.id, "assessment");
    if (a.unitId && !unitIds.has(a.unitId)) err(a.id, `unknown unit "${a.unitId}"`);
    if (a.topicId && !topicIds.has(a.topicId)) err(a.id, `unknown topic "${a.topicId}"`);
    if (new Set(a.questionIds).size !== a.questionIds.length) err(a.id, "question listed twice");
    for (const q of a.questionIds) if (!questionIds.has(q)) err(a.id, `unknown question "${q}"`);
  }
  for (const s of c.simulations) for (const k of s.skillIds) if (!skillIds.has(k)) err(s.id, `unknown skill "${k}"`);

  const errors = issues.filter((i) => i.level === "error");
  return {
    content: c,
    issues,
    checks: [
      { name: "schema", passed: true },
      { name: "references", passed: !errors.some((e) => e.message.startsWith("unknown") || e.message.startsWith("duplicate")) },
      { name: "answer_keys_graded", passed: !errors.some((e) => /^(key|commonError|answer|correct)/.test(e.message)), detail: `${keysChecked} questions run through the grader` },
      { name: "latex_renders", passed: !errors.some((e) => e.message.includes("LaTeX") || e.message.includes("delimiters")), detail: `${latexChecked} text fragments` },
      { name: "skill_coverage", passed: !errors.some((e) => e.message.includes("questions") || e.message.includes("pattern")), detail: `≥${minQ} questions and ≥${minP} patterns per skill` },
    ],
  };
}
