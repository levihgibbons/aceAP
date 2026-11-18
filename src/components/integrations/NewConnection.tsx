"use client";
/** "Add a Canvas connection" disclosure wrapping the connection form. */
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import type { ActionState } from "@/components/assignments/action-state";
import { ConnectionForm } from "./ConnectionForm";

export function NewConnection({
  organizationId,
  hasConnections,
  saveAction,
  defaultsAction,
}: {
  organizationId: string;
  hasConnections: boolean;
  saveAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultsAction: Parameters<typeof ConnectionForm>[0]["defaultsAction"];
}) {
  const [open, setOpen] = useState(!hasConnections);
  if (!open)
    return (
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        icon={<Plus aria-hidden="true" className="size-4" />}
      >
        Add another Canvas connection
      </Button>
    );
  return (
    <div className="rounded-lg border border-dashed border-line-strong p-4">
      <h4 className="mb-3 font-display text-base font-semibold text-ink">
        {hasConnections ? "Add another Canvas connection" : "Enter your Canvas connection"}
      </h4>
      <ConnectionForm
        organizationId={organizationId}
        saveAction={saveAction}
        defaultsAction={defaultsAction}
        onDone={hasConnections ? () => setOpen(false) : undefined}
      />
    </div>
  );
}
