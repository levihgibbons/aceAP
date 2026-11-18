"use client";
/** Archive an assignment after a confirmation dialog. */
import { useState, useTransition } from "react";
import { Archive } from "lucide-react";
import { Button, Dialog, useToast } from "@/components/ui";
import type { ActionState } from "./action-state";

export function ArchiveAssignmentButton({
  assignmentId,
  title,
  action,
}: {
  assignmentId: string;
  title: string;
  action: (assignmentId: string) => Promise<ActionState>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { toast } = useToast();

  const confirm = () =>
    start(async () => {
      const res = await action(assignmentId);
      if (res.ok) {
        setOpen(false);
        toast({ title: "Assignment archived", description: res.message, tone: "good" });
      } else setError(res.error ?? "Couldn't archive the assignment.");
    });

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        icon={<Archive aria-hidden="true" className="size-3.5" />}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        aria-label={`Archive ${title}`}
      >
        Archive
      </Button>
      {open ? (
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          title="Archive this assignment?"
          description={title}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirm} loading={pending} loadingText="Archiving…">
                Archive
              </Button>
            </>
          }
        >
          <p className="text-sm text-ink-2">
            Students will no longer see it and its column leaves the gradebook. Submissions,
            responses and mastery evidence are kept — nothing is deleted.
          </p>
          {error ? (
            <p role="alert" className="mt-3 text-sm font-medium text-bad">
              {error}
            </p>
          ) : null}
        </Dialog>
      ) : null}
    </>
  );
}
