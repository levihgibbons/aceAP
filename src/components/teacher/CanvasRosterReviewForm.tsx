"use client";
/**
 * CanvasRosterReviewForm — "Review Canvas roster". Fetches the Canvas roster
 * and refreshes the proposal snapshot; it never links accounts or enrols
 * anyone (see src/modules/integrations/lms/roster.ts).
 */
import { useActionState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { reviewCanvasRosterAction, type FormState } from "@/app/teacher/classes/actions";
import { Button, useToast } from "@/components/ui";

export function CanvasRosterReviewForm({ classId, hasSnapshot }: { classId: string; hasSnapshot: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(reviewCanvasRosterAction, {});
  const { toast } = useToast();
  useEffect(() => {
    if (state.ok) toast({ title: "Canvas roster reviewed", description: state.message, tone: "good" });
  }, [state, toast]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="classId" value={classId} />
      <Button type="submit" loading={pending} loadingText="Fetching roster…" icon={<RefreshCw aria-hidden="true" className="size-4" />}>
        {hasSnapshot ? "Review Canvas roster again" : "Review Canvas roster"}
      </Button>
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-bad">
          {state.error}
        </p>
      ) : null}
      <p aria-live="polite" className="text-sm text-muted">
        {state.ok ? state.message : ""}
      </p>
    </form>
  );
}
