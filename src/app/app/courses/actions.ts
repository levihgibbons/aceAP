"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { requireApiUser } from "@/modules/auth/session";

export interface AddCourseState {
  status: "idle" | "error" | "success";
  message: string;
}

/** Statuses with real learning content a student can work through. */
const ENROLLABLE = new Set<t.CourseContentStatus>([
  "pilot_available",
  "complete",
  "lessons_in_development",
]);

/**
 * Add a course to "My courses" for an independent learner. Enrolling oneself
 * in an active course with content is safe; class enrolment happens through
 * join codes instead.
 */
export async function addCourseAction(
  courseId: string,
  _prev: AddCourseState,
  _formData: FormData,
): Promise<AddCourseState> {
  void _formData;
  try {
    const user = await requireApiUser("student");
    if (typeof courseId !== "string" || courseId.length === 0 || courseId.length > 100)
      throw new DomainError("not_found", "Course not found.");
    const db = await getDb();
    const [course] = await db
      .select({
        id: t.courses.id,
        name: t.courses.name,
        availability: t.courses.availability,
        contentStatus: t.courses.contentStatus,
      })
      .from(t.courses)
      .where(eq(t.courses.id, courseId));
    if (!course) throw new DomainError("not_found", "Course not found.");
    if (course.availability !== "active")
      throw new DomainError("invalid", `${course.name} isn't offered yet, so it can't be added.`);
    if (!ENROLLABLE.has(course.contentStatus))
      throw new DomainError("invalid", `AceAP doesn't have lessons for ${course.name} yet.`);
    await db
      .insert(t.courseEnrollments)
      .values({ userId: user.id, courseId: course.id })
      .onConflictDoNothing();
    revalidatePath("/app", "layout");
    return { status: "success", message: `${course.name} is now in your courses.` };
  } catch (error) {
    if (error instanceof DomainError) return { status: "error", message: error.message };
    console.error("addCourseAction failed", error);
    return { status: "error", message: "We couldn't add that course right now. Please try again." };
  }
}
