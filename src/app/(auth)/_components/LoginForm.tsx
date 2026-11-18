"use client";
/** Email + password sign-in form (server action via useActionState). */
import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { signIn, type AuthFormState } from "../actions";

const initial: AuthFormState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, initial);
  return (
    <form action={action} noValidate className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.error ? (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-bad/25 bg-bad-soft px-3.5 py-3 text-sm text-bad">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{state.error}</p>
        </div>
      ) : null}
      <Field label="Email" htmlFor="login-email" error={state.fieldErrors?.email}>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          defaultValue={state.values?.email}
        />
      </Field>
      <Field label="Password" htmlFor="login-password" error={state.fieldErrors?.password}>
        <Input id="login-password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" size="lg" fullWidth loading={pending} loadingText="Signing in…">
        Sign in
      </Button>
    </form>
  );
}
