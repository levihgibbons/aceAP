"use client";
/** Account creation form (server action via useActionState). */
import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { Button, Field, Input, RadioGroup } from "@/components/ui";
import { signUp, type AuthFormState } from "../actions";

const initial: AuthFormState = {};

export function SignupForm({ minPasswordLength }: { minPasswordLength: number }) {
  const [state, action, pending] = useActionState(signUp, initial);
  return (
    <form action={action} noValidate className="space-y-4">
      {state.error ? (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-bad/25 bg-bad-soft px-3.5 py-3 text-sm text-bad">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{state.error}</p>
        </div>
      ) : null}
      <RadioGroup
        name="role"
        legend="I'm joining as a…"
        variant="cards"
        orientation="horizontal"
        defaultValue={state.values?.role ?? "student"}
        error={state.fieldErrors?.role}
        options={[
          { value: "student", label: "Student", description: "Learn, practise and track mastery." },
          { value: "teacher", label: "Teacher", description: "Run classes and see evidence of learning." },
        ]}
      />
      <Field label="Full name" htmlFor="signup-name" error={state.fieldErrors?.name}>
        <Input id="signup-name" name="name" autoComplete="name" required defaultValue={state.values?.name} />
      </Field>
      <Field label="Email" htmlFor="signup-email" error={state.fieldErrors?.email}>
        <Input
          id="signup-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
        />
      </Field>
      <Field label="Password" htmlFor="signup-password" error={state.fieldErrors?.password} hint={`At least ${minPasswordLength} characters.`}>
        <Input id="signup-password" name="password" type="password" autoComplete="new-password" minLength={minPasswordLength} required />
      </Field>
      <Button type="submit" size="lg" fullWidth loading={pending} loadingText="Creating account…">
        Create account
      </Button>
      <p className="text-xs leading-relaxed text-muted">
        Teachers get a personal workspace for their classes. You can join a school later.
      </p>
    </form>
  );
}
