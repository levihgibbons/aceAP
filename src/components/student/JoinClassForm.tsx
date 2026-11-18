"use client";

/**
 * Inline "join a class" form → joinClassAction. Friendly errors come from the
 * classroom service (bad code, rate limit); success links to the course.
 */
import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { joinClassAction, type JoinClassState } from "@/app/app/actions";

const INITIAL: JoinClassState = { status: "idle", message: "" };

export function JoinClassForm({ idPrefix = "join" }: { idPrefix?: string }) {
  const [state, formAction, pending] = useActionState(joinClassAction, INITIAL);
  const inputId = `${idPrefix}-code`;

  return (
    <form action={formAction} className="w-full max-w-sm text-left" noValidate>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field
          label="Class join code"
          htmlFor={inputId}
          className="flex-1"
          error={state.status === "error" ? state.message : undefined}
          hint={
            state.status !== "error" ? "Your teacher shares this code, e.g. ABC1234." : undefined
          }
        >
          <Input
            id={inputId}
            name="code"
            defaultValue={state.code ?? ""}
            key={state.code ?? "empty"}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={20}
            required
            className="h-10 font-mono uppercase tracking-[0.12em]"
          />
        </Field>
        <Button type="submit" loading={pending} loadingText="Joining…" className="sm:mb-[1.375rem]">
          Join class
        </Button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-sm">
        {state.status === "success" ? (
          <span className="inline-flex items-center gap-1.5 text-good">
            <CheckCircle2 aria-hidden="true" className="size-4" />
            {state.message}
            {state.courseId ? (
              <Link
                href={`/app/courses/${state.courseId}`}
                className="font-medium text-accent underline-offset-4 hover:underline"
              >
                Open the course
              </Link>
            ) : null}
          </span>
        ) : null}
      </p>
    </form>
  );
}
