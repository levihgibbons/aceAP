"use client";
import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import type { ActionState } from "@/components/assignments/action-state";

export function RetryJobButton({
  organizationId,
  jobId,
  label,
  action,
}: {
  organizationId: string;
  jobId: string;
  label: string;
  action: (organizationId: string, jobId: string) => Promise<ActionState>;
}) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="secondary"
        loading={pending}
        loadingText="Retrying…"
        icon={<RotateCcw aria-hidden="true" className="size-3.5" />}
        aria-label={`Retry ${label}`}
        onClick={() =>
          start(async () => {
            const res = await action(organizationId, jobId);
            if (res.ok) toast({ title: "Job re-queued", description: res.message, tone: "good" });
            else setError(res.error ?? "Couldn't retry.");
          })
        }
      >
        Retry
      </Button>
      {error ? (
        <span role="alert" className="max-w-48 text-right text-xs text-bad">
          {error}
        </span>
      ) : null}
    </div>
  );
}
