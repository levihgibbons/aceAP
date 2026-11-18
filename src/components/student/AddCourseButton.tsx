"use client";

/** "Add to my courses" for independent learners → addCourseAction. */
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { addCourseAction, type AddCourseState } from "@/app/app/courses/actions";

const INITIAL: AddCourseState = { status: "idle", message: "" };

export function AddCourseButton({
  courseId,
  courseName,
  size = "md",
}: {
  courseId: string;
  courseName: string;
  size?: "sm" | "md";
}) {
  const [state, formAction, pending] = useActionState(
    addCourseAction.bind(null, courseId),
    INITIAL,
  );
  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <Button
        type="submit"
        size={size}
        loading={pending}
        loadingText="Adding…"
        icon={<Plus aria-hidden="true" className="size-4" />}
        aria-label={`Add ${courseName} to my courses`}
      >
        Add to my courses
      </Button>
      <p
        aria-live="polite"
        className={state.status === "error" ? "text-xs font-medium text-bad" : "text-xs text-good"}
      >
        {state.status !== "idle" ? state.message : null}
      </p>
    </form>
  );
}
