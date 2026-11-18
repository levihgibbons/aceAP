"use server";
/**
 * Assignment server actions. Every action re-authorises the caller (staff
 * role here, class ownership inside the service); hiding a button is never the
 * access control.
 */
import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import {
  failureFrom,
  str,
  zodFieldErrors,
  type ActionState,
} from "@/components/assignments/action-state";
import { gradeWrittenResponse } from "@/modules/assessments/service";
import { requireApiUser } from "@/modules/auth/session";
import {
  archiveAssignment,
  assertClassStaff,
  createAssignment,
  setAccommodation,
} from "@/modules/classrooms/service";

const staff = () => requireApiUser("teacher", "school_admin", "platform_admin");

const list = (formData: FormData, key: string) => [
  ...new Set(
    formData.getAll(key).filter((v): v is string => typeof v === "string" && v.length > 0),
  ),
];

/** Field names in createAssignmentSchema → form input names. */
const FIELD_ALIAS: Record<string, string> = {
  dueAt: "dueAt",
  availableFrom: "availableFrom",
  skillIds: "skillIds",
  studentIds: "studentIds",
};

export async function createAssignmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let created: { id: string; assignedTo: number } | null = null;
  try {
    const user = await staff();
    const kind = str(formData, "kind");
    const audience = str(formData, "audience");
    const studentIds = audience === "selected" ? list(formData, "studentIds") : [];
    if (audience === "selected" && studentIds.length === 0)
      return {
        ok: false,
        error: "Choose at least one student, or assign it to the whole class.",
        fieldErrors: { studentIds: "Choose at least one student." },
      };
    const maxAttempts = str(formData, "maxAttempts").trim();
    const row = await createAssignment(user, {
      classId: str(formData, "classId"),
      title: str(formData, "title"),
      instructions: str(formData, "instructions"),
      kind: kind as "lesson" | "skill_practice" | "assessment",
      lessonId: kind === "lesson" ? str(formData, "lessonId") || null : null,
      assessmentId: kind === "assessment" ? str(formData, "assessmentId") || null : null,
      skillIds: kind === "skill_practice" ? list(formData, "skillIds") : [],
      questionCount: str(formData, "questionCount") || undefined,
      dueAt: str(formData, "dueAt") || null,
      availableFrom: str(formData, "availableFrom") || null,
      maxAttempts: maxAttempts ? maxAttempts : null,
      gradingMethod: (str(formData, "gradingMethod") || "score") as
        "score" | "mastery" | "completion",
      points: str(formData, "points") || undefined,
      aiPolicy: (str(formData, "aiPolicy") || "hints_only") as
        "allowed" | "hints_only" | "disabled",
      feedback: (str(formData, "feedback") || "after_submit") as "immediate" | "after_submit",
      studentIds,
    } as Parameters<typeof createAssignment>[1]);
    let assignedTo = studentIds.length;
    if (!assignedTo) {
      const db = await getDb();
      assignedTo = (
        await db
          .select({ id: t.classEnrollments.studentId })
          .from(t.classEnrollments)
          .where(
            and(
              eq(t.classEnrollments.classId, row.classId),
              eq(t.classEnrollments.status, "active"),
            ),
          )
      ).length;
    }
    created = { id: row.id, assignedTo };
  } catch (e) {
    if (e instanceof ZodError) {
      const raw = zodFieldErrors(e);
      const fieldErrors: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw))
        fieldErrors[FIELD_ALIAS[k.split(".")[0]] ?? k.split(".")[0]] ??= v;
      return { ok: false, error: "Some fields need attention.", fieldErrors };
    }
    return failureFrom(e, "createAssignment");
  }
  redirect(`/teacher/assignments/${created.id}?created=${created.assignedTo}`);
}

export async function archiveAssignmentAction(assignmentId: string): Promise<ActionState> {
  try {
    const user = await staff();
    if (typeof assignmentId !== "string" || !/^[0-9a-f-]{36}$/i.test(assignmentId))
      throw new DomainError("not_found", "Assignment not found.");
    await archiveAssignment(user, assignmentId);
  } catch (e) {
    return failureFrom(e, "archiveAssignment");
  }
  refresh();
  return {
    ok: true,
    message: "Assignment archived. Its grades are hidden from the gradebook; nothing was deleted.",
  };
}

export async function setAccommodationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const seq = Number(str(formData, "seq") || 0) + 1;
  try {
    const user = await staff();
    const tm = str(formData, "timeMultiplier").trim();
    const ma = str(formData, "maxAttempts").trim();
    await setAccommodation(user, {
      assignmentId: str(formData, "assignmentId"),
      studentId: str(formData, "studentId"),
      dueAt: str(formData, "dueAt") || null,
      maxAttempts: ma ? ma : null,
      timeMultiplier: tm ? tm : null,
      note: str(formData, "note"),
    } as Parameters<typeof setAccommodation>[1]);
  } catch (e) {
    return { ...failureFrom(e, "setAccommodation"), seq };
  }
  refresh();
  return { ok: true, message: "Accommodation saved.", seq };
}

export async function gradeWrittenResponseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const seq = Number(str(formData, "seq") || 0) + 1;
  try {
    const user = await staff();
    const responseId = str(formData, "responseId");
    const assignmentId = str(formData, "assignmentId");
    if (!/^[0-9a-f-]{36}$/i.test(responseId) || !/^[0-9a-f-]{36}$/i.test(assignmentId))
      throw new DomainError("not_found", "Response not found.");
    // gradeWrittenResponse trusts its caller: prove the response belongs to an
    // attempt on this assignment, and that the user is staff of its class.
    const db = await getDb();
    const [row] = await db
      .select({ classId: t.assignments.classId, studentId: t.questionResponses.userId })
      .from(t.questionResponses)
      .innerJoin(t.attempts, eq(t.attempts.id, t.questionResponses.attemptId))
      .innerJoin(t.assignments, eq(t.assignments.id, t.attempts.assignmentId))
      .where(and(eq(t.questionResponses.id, responseId), eq(t.assignments.id, assignmentId)));
    if (!row) throw new DomainError("not_found", "Response not found.");
    await assertClassStaff(db, user, row.classId);
    const scores: Record<string, number> = {};
    for (const [k, v] of formData.entries()) {
      if (!k.startsWith("rubric:") || typeof v !== "string") continue;
      if (v.trim() === "")
        return {
          ok: false,
          error: "Score every rubric criterion.",
          fieldErrors: { [k]: "Required." },
          seq,
        };
      const n = Number(v);
      if (!Number.isFinite(n))
        return {
          ok: false,
          error: "Scores must be numbers.",
          fieldErrors: { [k]: "Enter a number." },
          seq,
        };
      scores[k.slice("rubric:".length)] = n;
    }
    const { score } = await gradeWrittenResponse(user.id, responseId, scores);
    refresh();
    return {
      ok: true,
      message: `Response scored ${Math.round(score * 100)}%. The student's mastery was updated from this evidence.`,
      seq,
    };
  } catch (e) {
    return { ...failureFrom(e, "gradeWrittenResponse"), seq };
  }
}
