"use client";
/** "Forgot password?" email form (server action via useActionState). */
import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { forgotPassword, type ForgotPasswordState } from "../recovery-actions";

const initial: ForgotPasswordState = { status: "idle" };

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPassword, initial);

  if (state.status === "sent") {
    return (
      <div
        role="status"
        className="flex items-start gap-2.5 rounded-lg border border-good/25 bg-good-soft px-3.5 py-3 text-sm text-good"
      >
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p>{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="space-y-4">
      {state.status === "unavailable" ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-warn/25 bg-warn-soft px-3.5 py-3 text-sm text-warn"
        >
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{state.message}</p>
        </div>
      ) : null}
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-bad/25 bg-bad-soft px-3.5 py-3 text-sm text-bad"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{state.message}</p>
        </div>
      ) : null}
      <Field
        label="Email"
        htmlFor="forgot-email"
        error={state.fieldError}
        hint="The email you sign in with."
      >
        <Input
          id="forgot-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          defaultValue={state.email}
        />
      </Field>
      <Button type="submit" size="lg" fullWidth loading={pending} loadingText="Sending…">
        Send reset link
      </Button>
    </form>
  );
}
