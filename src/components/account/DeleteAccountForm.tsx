"use client";
/** Self-service account deletion: password re-entry + typing DELETE (deleteAccountAction). */
import { useActionState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { deleteAccountAction, type AccountFormState } from "./actions";
import { FormMessage } from "./FormMessage";

const INITIAL: AccountFormState = { status: "idle" };

export function DeleteAccountForm({ confirmationWord }: { confirmationWord: string }) {
  const [state, action, pending] = useActionState(deleteAccountAction, INITIAL);
  return (
    <form action={action} noValidate className="space-y-4">
      <Field label="Your password" htmlFor="delete-password" error={state.fieldErrors?.password}>
        <Input
          id="delete-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <Field
        label={
          <>
            Type <span className="font-mono font-semibold">{confirmationWord}</span> to confirm
          </>
        }
        htmlFor="delete-confirmation"
        error={state.fieldErrors?.confirmation}
      >
        <Input
          id="delete-confirmation"
          name="confirmation"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="danger" loading={pending} loadingText="Deleting…">
          Delete my account
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
