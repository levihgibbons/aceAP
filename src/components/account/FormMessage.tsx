/** Inline success / error line for account forms (announced politely). */
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { AccountFormState } from "./actions";

export function FormMessage({ state }: { state: AccountFormState }) {
  return (
    <p aria-live="polite" className="min-h-5 text-sm">
      {state.status === "success" && state.message ? (
        <span className="inline-flex items-start gap-1.5 text-good">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </span>
      ) : null}
      {state.status === "error" && state.message ? (
        <span className="inline-flex items-start gap-1.5 text-bad">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </span>
      ) : null}
    </p>
  );
}
