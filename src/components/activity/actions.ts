"use server";
/**
 * Server action behind every Start/Resume button: validate the spec, start
 * (or resume) the attempt, and go to the attempt runner. Domain errors (no
 * attempts left, not open yet, nothing to review…) come back as a friendly
 * message for the form instead of crashing the page.
 */
import { redirect } from "next/navigation";
import { z } from "zod";
import { DomainError } from "@/lib/errors";
import { startAttempt, type StartSpec } from "@/modules/assessments/service";
import { requireApiUser } from "@/modules/auth/session";

const id = z.string().min(1).max(200);
const specSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("assessment"), assessmentId: id }),
  z.object({ kind: z.literal("practice"), skillId: id, count: z.number().int().min(1).max(20).optional() }),
  z.object({ kind: z.literal("review"), courseId: id, count: z.number().int().min(3).max(20).optional() }),
  z.object({ kind: z.literal("exam_mixed"), courseId: id, count: z.number().int().min(4).max(30).optional(), timed: z.boolean().optional() }),
  z.object({ kind: z.literal("assignment"), assignmentId: z.uuid() }),
]);

export interface StartAttemptState {
  error: string | null;
}

export async function startAttemptAction(spec: StartSpec, _prev: StartAttemptState, formData: FormData): Promise<StartAttemptState> {
  let attemptId: string;
  try {
    const user = await requireApiUser("student");
    const parsed = specSchema.parse(spec);
    // Exam sets are timed unless the form offered the choice and the student switched it off.
    const timed = formData.has("timedChoice") ? formData.get("timed") === "on" : true;
    const effective: StartSpec = parsed.kind === "exam_mixed" ? { ...parsed, timed } : parsed;
    ({ attemptId } = await startAttempt(user.id, effective));
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    if (e instanceof z.ZodError) return { error: "That activity couldn't be started." };
    console.error("[startAttemptAction]", e);
    return { error: "Something went wrong starting this. Please try again." };
  }
  redirect(`/app/attempts/${attemptId}`);
}
