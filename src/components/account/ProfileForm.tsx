"use client";
/** Edit the display name (updateNameAction). */
import { useActionState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { updateNameAction, type AccountFormState } from "./actions";
import { FormMessage } from "./FormMessage";

const INITIAL: AccountFormState = { status: "idle" };

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState(updateNameAction, INITIAL);
  return (
    <form action={action} noValidate className="space-y-4">
      <Field
        label="Full name"
        htmlFor="account-name"
        error={state.fieldErrors?.name}
        hint="Shown to your teachers and classmates' teachers."
      >
        <Input
          id="account-name"
          name="name"
          autoComplete="name"
          required
          maxLength={80}
          defaultValue={name}
        />
      </Field>
      <Field
        label="Email"
        htmlFor="account-email"
        hint="Your sign-in email can't be changed here yet."
      >
        <Input id="account-email" type="email" value={email} readOnly disabled />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending} loadingText="Saving…">
          Save name
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
