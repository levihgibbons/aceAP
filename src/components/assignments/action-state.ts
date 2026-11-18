/**
 * Shared result shape for the teacher/admin server actions in this area, and a
 * mapper from thrown errors to something a form can show inline.
 * Server-safe (no React); import from actions and client forms alike.
 */
import { ZodError } from "zod";
import { DomainError } from "@/lib/errors";

export interface ActionState {
  ok?: boolean;
  /** Success message (for a toast). */
  message?: string;
  /** Form-level error. */
  error?: string;
  /** Field-level errors keyed by input name. */
  fieldErrors?: Record<string, string>;
  /** Incremented on every completed submission so clients can react once. */
  seq?: number;
}

/** First issue per top-level path → { field: message }. */
export function zodFieldErrors(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.map(String).join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Map anything thrown by a service to an ActionState (never leaks internals). */
export function failureFrom(err: unknown, context: string): ActionState {
  if (err instanceof DomainError) return { ok: false, error: err.message };
  if (err instanceof ZodError) {
    const fieldErrors = zodFieldErrors(err);
    return { ok: false, error: fieldErrors.form ?? "Some fields need attention.", fieldErrors };
  }
  console.error(`[${context}]`, err);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}
