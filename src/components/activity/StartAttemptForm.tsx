"use client";
/**
 * StartAttemptForm — the Start/Resume button on intro pages. Runs the
 * startAttemptAction server action (which redirects to the attempt runner) and
 * shows a friendly inline message when the attempt can't be started.
 *   <StartAttemptForm spec={{ kind: "practice", skillId }} label="Start practice" />
 */
import { useActionState } from "react";
import { AlertCircle, Play } from "lucide-react";
import { Button, Switch } from "@/components/ui";
import type { StartSpec } from "@/modules/assessments/service";
import { startAttemptAction, type StartAttemptState } from "./actions";

export interface StartAttemptFormProps {
  spec: StartSpec;
  label: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary";
  /** Offer a "Timed" switch (adaptive exam sets). */
  timedChoice?: { defaultOn: boolean; description: string };
}

export function StartAttemptForm({ spec, label, pendingLabel = "Starting…", variant = "primary", timedChoice }: StartAttemptFormProps) {
  const [state, action, pending] = useActionState<StartAttemptState, FormData>(startAttemptAction.bind(null, spec), { error: null });
  return (
    <form action={action} className="space-y-3">
      {timedChoice ? (
        <>
          <input type="hidden" name="timedChoice" value="1" />
          <Switch name="timed" label="Timed" description={timedChoice.description} defaultChecked={timedChoice.defaultOn} />
        </>
      ) : null}
      <Button type="submit" variant={variant} size="lg" loading={pending} loadingText={pendingLabel} icon={<Play aria-hidden="true" className="size-4" />}>
        {label}
      </Button>
      {state.error ? (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm text-ink">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warn" />
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
