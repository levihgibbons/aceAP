"use client";
/** Choose a new password from a reset link (server action via useActionState). */
import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { resetPassword, type ResetPasswordState } from "../recovery-actions";

const initial: ResetPasswordState = {};

export function ResetPasswordForm({
  token,
  minPasswordLength,
}: {
  token: string;
  minPasswordLength: number;
}) {
  const [state, action, pending] = useActionState(resetPassword, initial);
  return (
    <form action={action} noValidate className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-bad/25 bg-bad-soft px-3.5 py-3 text-sm text-bad"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            {state.error}{" "}
            <Link href="/forgot-password" className="font-medium underline underline-offset-4">
              Request a new link
            </Link>
          </p>
        </div>
      ) : null}
      <Field
        label="New password"
        htmlFor="reset-password"
        error={state.fieldErrors?.password}
        hint={`At least ${minPasswordLength} characters.`}
      >
        <Input
          id="reset-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={minPasswordLength}
          required
        />
      </Field>
      <Field
        label="Confirm new password"
        htmlFor="reset-confirm"
        error={state.fieldErrors?.confirm}
      >
        <Input
          id="reset-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={minPasswordLength}
          required
        />
      </Field>
      <Button type="submit" size="lg" fullWidth loading={pending} loadingText="Saving…">
        Set new password
      </Button>
      <p className="text-xs leading-relaxed text-muted">
        Setting a new password signs you out everywhere else.
      </p>
    </form>
  );
}
