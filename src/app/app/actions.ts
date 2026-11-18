"use server";

import { revalidatePath } from "next/cache";
import { DomainError } from "@/lib/errors";
import { requireApiUser } from "@/modules/auth/session";
import { joinClassByCode } from "@/modules/classrooms/service";

export interface JoinClassState {
  status: "idle" | "error" | "success";
  message: string;
  courseId?: string;
  /** Echo of what was typed, so the field keeps its value after an error. */
  code?: string;
}

/** Join a class with the code a teacher shared. Used with useActionState. */
export async function joinClassAction(
  _prev: JoinClassState,
  formData: FormData,
): Promise<JoinClassState> {
  const raw = formData.get("code");
  const code = typeof raw === "string" ? raw.slice(0, 40) : "";
  try {
    const user = await requireApiUser("student");
    if (!code.trim())
      return { status: "error", message: "Enter the join code your teacher gave you.", code };
    const result = await joinClassByCode(user, code);
    revalidatePath("/app", "layout");
    return {
      status: "success",
      message: result.alreadyMember
        ? `You're already in ${result.className}.`
        : `You joined ${result.className}.`,
      courseId: result.courseId,
    };
  } catch (error) {
    if (error instanceof DomainError) return { status: "error", message: error.message, code };
    console.error("joinClassAction failed", error);
    return {
      status: "error",
      message: "We couldn't join that class right now. Please try again.",
      code,
    };
  }
}
