"use client";
/**
 * RemoveStudentButton — confirm dialog + server action to remove a student
 * from a class. Explains the consequence: the teacher loses access to the
 * student's records for this class; the student's own learning record stays.
 */
import { useState, useTransition } from "react";
import { UserMinus } from "lucide-react";
import { removeStudentAction } from "@/app/teacher/classes/actions";
import { Button, Dialog, toast } from "@/components/ui";

export function RemoveStudentButton({ classId, className, studentId, studentName }: { classId: string; className: string; studentId: string; studentName: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await removeStudentAction({}, formData);
        if (result.ok) {
          setOpen(false);
          // The toast store is global, so the confirmation survives this row unmounting.
          toast({ title: `${studentName} removed`, description: `They are no longer in ${className}.`, tone: "good" });
        } else setError(result.error ?? "Couldn't remove the student. Please try again.");
      } catch {
        setError("Couldn't remove the student. Check your connection and try again.");
      }
    });
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} icon={<UserMinus aria-hidden="true" className="size-4" />}>
        Remove<span className="sr-only"> {studentName} from {className}</span>
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        className="text-left"
        title={`Remove ${studentName}?`}
        description={`They will no longer be in ${className}.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="danger" type="submit" form={`remove-${studentId}`} loading={pending} loadingText="Removing…">
              Remove student
            </Button>
          </>
        }
      >
        <form id={`remove-${studentId}`} action={submit} className="space-y-3 text-sm text-ink-2">
          <input type="hidden" name="classId" value={classId} />
          <input type="hidden" name="studentId" value={studentId} />
          <p>
            Removing a student also removes <strong>your access to their records</strong> for this class — mastery, responses, engagement and shared notes —
            unless they are in another class you teach for the same course.
          </p>
          <p>Their own learning record is kept: nothing they have done is deleted, and they can rejoin later with the join code.</p>
          {error ? (
            <p role="alert" className="font-medium text-bad">
              {error}
            </p>
          ) : null}
        </form>
      </Dialog>
    </>
  );
}
