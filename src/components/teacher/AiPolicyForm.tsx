"use client";
/**
 * AiPolicyForm — the class's AI tutor policy for ordinary learning
 * (assignments carry their own policy).
 */
import { useActionState, useEffect } from "react";
import { setAiPolicyAction, type FormState } from "@/app/teacher/classes/actions";
import { Button, RadioGroup, useToast } from "@/components/ui";
import type { AiPolicy } from "@/db/schema";
import { AI_POLICY } from "./format";

export function AiPolicyForm({ classId, current }: { classId: string; current: AiPolicy }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setAiPolicyAction, {});
  const { toast } = useToast();
  useEffect(() => {
    if (state.ok) toast({ title: state.message ?? "Saved", tone: "good" });
  }, [state, toast]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="classId" value={classId} />
      <RadioGroup
        name="aiPolicy"
        legend="AI tutor during ordinary lessons and practice"
        variant="cards"
        defaultValue={current}
        required
        error={state.fieldErrors?.aiPolicy}
        options={(Object.keys(AI_POLICY) as AiPolicy[]).map((value) => ({ value, label: AI_POLICY[value].label, description: AI_POLICY[value].description }))}
      />
      {state.error && !state.fieldErrors ? (
        <p role="alert" className="text-sm font-medium text-bad">
          {state.error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending} loadingText="Saving…">
          Save setting
        </Button>
        <p aria-live="polite" className="text-sm text-muted">
          {state.ok ? state.message : ""}
        </p>
      </div>
    </form>
  );
}
