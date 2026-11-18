/**
 * Deterministic graders for every automatically scorable question type.
 * Pure: (question body, response) → result. No I/O.
 */
import { z } from "zod";
import type { QuestionBody } from "@/modules/content/schema";
import { ExpressionError, compileExpression, expressionsEquivalent, hashString, mulberry32, parseNumber } from "./math";

export const GRADER_VERSION = "auto:1.0.0";

/** What the client sends for each question type. */
export const responseSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("multiple_choice"), choiceId: z.string().max(100) }),
  z.object({ type: z.literal("multi_select"), choiceIds: z.array(z.string().max(100)).max(20) }),
  z.object({ type: z.literal("numeric"), value: z.string().max(100) }),
  z.object({ type: z.literal("expression"), value: z.string().max(200) }),
  z.object({ type: z.literal("ordering"), order: z.array(z.string().max(100)).max(20) }),
  z.object({ type: z.literal("matching"), pairs: z.record(z.string().max(100), z.string().max(100)) }),
  z.object({ type: z.literal("short_response"), text: z.string().max(5000) }),
]);
export type QuestionResponse = z.infer<typeof responseSchema>;

export type GradeResult =
  /** The input could not be interpreted; nothing is recorded and the student may fix it. */
  | { status: "invalid"; message: string }
  /** Awaiting a teacher's rubric score. */
  | { status: "pending_review" }
  | {
      status: "graded";
      /** 0..1 */
      score: number;
      correct: boolean;
      /** Catalog id of the misconception this specific wrong answer indicates. */
      misconceptionId: string | null;
      /** Answer-specific note (distractor rationale / common-error note). */
      note: string | null;
    };

const graded = (score: number, misconceptionId: string | null = null, note: string | null = null): GradeResult => ({
  status: "graded",
  score,
  correct: score >= 0.999,
  misconceptionId,
  note,
});

export function gradeResponse(questionId: string, body: QuestionBody, response: QuestionResponse): GradeResult {
  if (response.type !== body.type) return { status: "invalid", message: "That response doesn't match this question." };

  switch (body.type) {
    case "multiple_choice": {
      const r = response as Extract<QuestionResponse, { type: "multiple_choice" }>;
      const choice = body.choices.find((c) => c.id === r.choiceId);
      if (!choice) return { status: "invalid", message: "Choose one of the options." };
      if (choice.id === body.correctChoiceId) return graded(1, null, choice.rationale ?? null);
      return graded(0, choice.misconception ?? null, choice.rationale ?? null);
    }

    case "multi_select": {
      const r = response as Extract<QuestionResponse, { type: "multi_select" }>;
      const valid = new Set(body.choices.map((c) => c.id));
      const picked = new Set(r.choiceIds.filter((idv) => valid.has(idv)));
      if (picked.size === 0) return { status: "invalid", message: "Select at least one option." };
      const correct = new Set(body.correctChoiceIds);
      const exact = picked.size === correct.size && [...picked].every((c) => correct.has(c));
      if (exact) return graded(1);
      const wrongPick = body.choices.find((c) => picked.has(c.id) && !correct.has(c.id));
      return graded(0, wrongPick?.misconception ?? null, wrongPick?.rationale ?? null);
    }

    case "numeric": {
      const r = response as Extract<QuestionResponse, { type: "numeric" }>;
      let value: number;
      try {
        value = parseNumber(r.value);
      } catch (e) {
        // Letters in a numeric answer get a plain message, not the expression validator's.
        const msg = e instanceof ExpressionError && !/[a-z]/i.test(r.value.replace(/sqrt|pi/gi, "")) ? e.userMessage : "Enter a number, like 12.5 or 25/2.";
        return { status: "invalid", message: msg };
      }
      const within = (target: number) => {
        const diff = Math.abs(value - target);
        const abs = body.tolerance.abs ?? 0;
        const rel = (body.tolerance.rel ?? 0) * Math.abs(target);
        return diff <= Math.max(abs, rel, 1e-9);
      };
      if (within(body.answer)) return graded(1);
      const known = body.commonErrors?.find((c) => within(c.value));
      return graded(0, known?.misconception ?? null, known?.note ?? null);
    }

    case "expression": {
      const r = response as Extract<QuestionResponse, { type: "expression" }>;
      let candidate;
      try {
        candidate = compileExpression(r.value, body.variables);
      } catch (e) {
        return { status: "invalid", message: e instanceof ExpressionError ? e.userMessage : "We couldn't read that expression." };
      }
      const opts = { variables: body.variables, domain: body.domain, seed: questionId };
      const reference = compileExpression(body.answer, body.variables);
      if (expressionsEquivalent(reference, candidate, opts)) return graded(1);
      for (const err of body.commonErrors ?? []) {
        if (expressionsEquivalent(compileExpression(err.expr, body.variables), candidate, opts))
          return graded(0, err.misconception, err.note ?? null);
      }
      return graded(0);
    }

    case "ordering": {
      const r = response as Extract<QuestionResponse, { type: "ordering" }>;
      if (r.order.length !== body.correctOrder.length || new Set(r.order).size !== r.order.length)
        return { status: "invalid", message: "Place every item in the order." };
      return graded(r.order.every((idv, i) => idv === body.correctOrder[i]) ? 1 : 0);
    }

    case "matching": {
      const r = response as Extract<QuestionResponse, { type: "matching" }>;
      const lefts = body.left.map((l) => l.id);
      if (lefts.some((l) => !r.pairs[l])) return { status: "invalid", message: "Match every item." };
      const right = lefts.filter((l) => r.pairs[l] === body.pairs[l]).length;
      return graded(right === lefts.length ? 1 : right / lefts.length);
    }

    case "short_response": {
      const r = response as Extract<QuestionResponse, { type: "short_response" }>;
      if (r.text.trim().length < 2) return { status: "invalid", message: "Write a response first." };
      return { status: "pending_review" };
    }
  }
}

// ─────────────────────── What a student is allowed to see ───────────────────

export interface StudentQuestion {
  id: string;
  version: number;
  type: QuestionBody["type"];
  prompt: string;
  difficulty: number;
  hintCount: number;
  stimulus: { simulation: { id: string; params?: Record<string, number | string> } } | null;
  choices?: { id: string; text: string }[];
  items?: { id: string; text: string }[];
  left?: { id: string; text: string }[];
  right?: { id: string; text: string }[];
  unit?: string;
  variables?: string[];
  inputHint?: string;
  rubric?: { id: string; description: string; points: number }[];
}

function shuffled<T>(items: T[], seed: string): T[] {
  const rand = mulberry32(hashString(seed));
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Strip answers, rationales and misconception tags. Option order is shuffled
 * deterministically per (attempt, question) so it is stable across reloads.
 */
export function toStudentQuestion(
  q: { id: string; version: number; prompt: string; body: QuestionBody; hints: string[]; difficulty: number; stimulus: StudentQuestion["stimulus"] },
  seed: string,
): StudentQuestion {
  const base: StudentQuestion = {
    id: q.id,
    version: q.version,
    type: q.body.type,
    prompt: q.prompt,
    difficulty: q.difficulty,
    hintCount: q.hints.length,
    stimulus: q.stimulus ?? null,
  };
  const s = `${seed}:${q.id}`;
  switch (q.body.type) {
    case "multiple_choice":
    case "multi_select":
      return { ...base, choices: shuffled(q.body.choices.map(({ id, text }) => ({ id, text })), s) };
    case "numeric":
      return { ...base, unit: q.body.unit };
    case "expression":
      return { ...base, variables: q.body.variables, inputHint: q.body.inputHint };
    case "ordering": {
      let items = shuffled(q.body.items, s);
      // Never present the items already in the correct order.
      if (items.every((it, i) => it.id === (q.body as Extract<QuestionBody, { type: "ordering" }>).correctOrder[i])) items = [...items].reverse();
      return { ...base, items };
    }
    case "matching":
      return { ...base, left: q.body.left, right: shuffled(q.body.right, s) };
    case "short_response":
      return { ...base, rubric: q.body.rubric };
  }
}

/** The answer key in a displayable form — only sent once feedback is allowed. */
export function describeCorrectAnswer(body: QuestionBody): string {
  switch (body.type) {
    case "multiple_choice":
      return body.choices.find((c) => c.id === body.correctChoiceId)?.text ?? "";
    case "multi_select":
      return body.choices.filter((c) => body.correctChoiceIds.includes(c.id)).map((c) => c.text).join("; ");
    case "numeric":
      return `${body.answer}${body.unit ? ` ${body.unit}` : ""}`;
    case "expression":
      return `\`${body.answer}\``;
    case "ordering":
      return body.correctOrder.map((idv) => body.items.find((i) => i.id === idv)?.text ?? idv).join(" → ");
    case "matching":
      return body.left.map((l) => `${l.text} ↔ ${body.right.find((r) => r.id === body.pairs[l.id])?.text ?? "?"}`).join("; ");
    case "short_response":
      return body.sampleResponse;
  }
}
