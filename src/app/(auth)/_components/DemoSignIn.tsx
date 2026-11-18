"use client";
/**
 * One-click sign-in for the fictional demo accounts. Each account is its own
 * form posting `email` to the demoSignIn server action, which only accepts
 * accounts flagged isDemo and still creates a normal session.
 */
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, ArrowRight, ChevronDown } from "lucide-react";
import { Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { demoSignIn, type AuthFormState } from "../actions";
import { DEMO_PASSWORD, FEATURED_DEMO_ACCOUNTS, MORE_DEMO_ACCOUNTS, type DemoAccount } from "./demo-accounts";

const initial: AuthFormState = {};

function SubmitRow({ account, featured }: { account: DemoAccount; featured: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg text-left transition-colors disabled:opacity-70",
        featured ? "min-h-14 border border-line bg-surface px-3.5 py-2.5 shadow-card hover:border-line-strong hover:bg-surface-2" : "min-h-11 px-3 py-2 hover:bg-sunken",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">
          <span className="sr-only">Sign in as </span>
          {account.name}
          <span className="font-normal text-muted"> · {account.role}</span>
        </span>
        <span className="block truncate text-xs text-muted">{account.note}</span>
      </span>
      {pending ? (
        <Spinner size="sm" className="text-muted" />
      ) : (
        <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink-2" />
      )}
    </button>
  );
}

function AccountForm({ account, featured, action }: { account: DemoAccount; featured: boolean; action: (formData: FormData) => void }) {
  return (
    <form action={action}>
      <input type="hidden" name="email" value={account.email} />
      <SubmitRow account={account} featured={featured} />
    </form>
  );
}

export function DemoSignIn({ includeAdmin = true }: { includeAdmin?: boolean }) {
  const [state, action] = useActionState(demoSignIn, initial);
  const featured = includeAdmin ? FEATURED_DEMO_ACCOUNTS : FEATURED_DEMO_ACCOUNTS.filter((a) => a.role !== "Platform admin");
  return (
    <section aria-labelledby="demo-heading" className="rounded-card border border-line bg-surface-2 p-4 sm:p-5">
      <div className="mb-3">
        <h2 id="demo-heading" className="font-display text-base font-semibold text-ink">
          Try the demo
        </h2>
        <p className="mt-1 text-[0.8125rem] text-muted">
          {includeAdmin ? "Sign in as a fictional student, teacher or admin. No real people or data." : "Sign in as a fictional student or teacher. No real people or data."}
        </p>
      </div>
      {state.error ? (
        <div role="alert" className="mb-3 flex items-start gap-2.5 rounded-lg border border-bad/25 bg-bad-soft px-3.5 py-3 text-sm text-bad">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{state.error}</p>
        </div>
      ) : null}
      <ul className="space-y-2">
        {featured.map((a) => (
          <li key={a.email}>
            <AccountForm account={a} featured action={action} />
          </li>
        ))}
      </ul>
      <details className="group mt-3">
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-lg px-1 text-[0.8125rem] font-medium text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
          <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
          More demo accounts
        </summary>
        <ul className="mt-1 divide-y divide-line rounded-lg border border-line bg-surface">
          {MORE_DEMO_ACCOUNTS.map((a) => (
            <li key={a.email}>
              <AccountForm account={a} featured={false} action={action} />
            </li>
          ))}
        </ul>
      </details>
      <p className="mt-3 text-xs text-muted">
        Signing in manually? Every demo account uses the password{" "}
        <code className="rounded bg-sunken px-1 py-0.5 font-mono text-[0.75rem] text-ink-2">{DEMO_PASSWORD}</code>.
      </p>
    </section>
  );
}
