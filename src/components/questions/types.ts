/**
 * Client-safe types for the question runtime. Type-only re-exports from the
 * domain services — nothing here pulls server code into the browser bundle.
 */
import type { QuestionResponse, StudentQuestion } from "@/modules/assessments/grading";
import type { FeedbackView, MasteryChange, QuestionState, SubmitAttemptResult, SubmitResult } from "@/modules/assessments/service";

export type { FeedbackView, MasteryChange, QuestionResponse, QuestionState, StudentQuestion, SubmitAttemptResult, SubmitResult };

export type FeedbackMode = "immediate" | "after_submit";
export type Assistance = "allowed" | "hints_only" | "disabled";

/** The parts of the attempt a QuestionCard needs; everything else stays with the page. */
export interface QuestionAttemptContext {
  attemptId: string;
  feedbackMode: FeedbackMode;
  assistance: Assistance;
  /** "Show solution" is offered only in guided, immediate-feedback modes. */
  allowSolution: boolean;
}

/** An empty-but-typed response for a question, or null where "nothing chosen" has no value. */
export function initialResponse(q: StudentQuestion, saved: QuestionResponse | null): QuestionResponse | null {
  if (saved && saved.type === q.type) return saved;
  switch (q.type) {
    case "multiple_choice":
      return null;
    case "multi_select":
      return { type: "multi_select", choiceIds: [] };
    case "numeric":
      return { type: "numeric", value: "" };
    case "expression":
      return { type: "expression", value: "" };
    case "ordering":
      return { type: "ordering", order: (q.items ?? []).map((i) => i.id) };
    case "matching":
      return { type: "matching", pairs: {} };
    case "short_response":
      return { type: "short_response", text: "" };
  }
}

/** True when the student hasn't given anything yet (ordering is never blank: the list itself is an answer). */
export function isBlank(r: QuestionResponse | null): boolean {
  if (!r) return true;
  switch (r.type) {
    case "multiple_choice":
      return !r.choiceId;
    case "multi_select":
      return r.choiceIds.length === 0;
    case "numeric":
    case "expression":
      return r.value.trim() === "";
    case "ordering":
      return r.order.length === 0;
    case "matching":
      return Object.keys(r.pairs).length === 0;
    case "short_response":
      return r.text.trim() === "";
  }
}

export function blankMessage(type: StudentQuestion["type"]): string {
  switch (type) {
    case "multiple_choice":
      return "Choose an answer first.";
    case "multi_select":
      return "Select at least one option.";
    case "matching":
      return "Match every item first.";
    case "short_response":
      return "Write a response first.";
    default:
      return "Enter an answer first.";
  }
}

/** Idempotency key for one submission (crypto.randomUUID, with a fallback for insecure origins). */
export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
