"use client";
/** Change password while signed in (changePasswordAction); other sessions are revoked. */
import { useActionState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { changePasswordAction, type AccountFormState } from "./actions";
import { FormMessage } from "./FormMessage";

const INITIAL: AccountFormState = { status: "idle" };

export function ChangePasswordForm({ minPasswordLength }: { minPasswordLength: number }) {
  const [state, action, pending] = useActionState(changePasswordAction, INITIAL);
  return (
    // Re-mount on success so the password fields clear.
    <form
      key={state.status === "success" ? state.message : "form"}
      action={action}
      noValidate
      className="space-y-4"
    >
      <Field
        label="Current password"
        htmlFor="pw-current"
        error={state.fieldErrors?.currentPassword}
      >
        <Input
          id="pw-current"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <Field
        label="New password"
        htmlFor="pw-new"
        error={state.fieldErrors?.newPassword}
        hint={`At least ${minPasswordLength} characters.`}
      >
        <Input
          id="pw-new"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={minPasswordLength}
          required
        />
      </Field>
      <Field
        label="Confirm new password"
        htmlFor="pw-confirm"
        error={state.fieldErrors?.confirmPassword}
      >
        <Input
          id="pw-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={minPasswordLength}
          required
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending} loadingText="Changing…">
          Change password
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
