"use server";
/**
 * Teacher classroom server actions. Each re-authorises on the server through
 * the domain services; hiding a control is never the access check.
 *  - createClassAction(prev, formData)    useActionState; fields: name, courseId, organizationId? → redirect to the class
 *  - removeStudentAction(prev, formData)  useActionState; fields: classId, studentId
 *  - setAiPolicyAction(prev, formData)    useActionState; fields: classId, aiPolicy
 *  - reviewCanvasRosterAction(prev, formData) useActionState; fields: classId — fetches the Canvas
 *    roster and stores PROPOSALS only (never links accounts or enrols anyone)
 *  - loadCellEvidence(classId, studentId, columnId)  heatmap drawer data (read-only)
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DomainError } from "@/lib/errors";
import { requireApiUser } from "@/modules/auth/session";
import { createClass, createClassSchema, removeStudent, setClassAiPolicy } from "@/modules/classrooms/service";
import { buildCellEvidence } from "@/components/teacher/server/evidence";
import { reviewCanvasRoster } from "@/modules/integrations/lms/roster";
import type { CellEvidenceResult } from "@/components/teacher/types";

const STAFF = ["teacher", "school_admin", "platform_admin"] as const;

export interface FormState {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function failure(e: unknown, fallback: string): FormState {
  if (e instanceof DomainError) return { error: e.message };
  console.error("[teacher action]", e);
  return { error: fallback };
}

export async function createClassAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { name: str(formData, "name"), courseId: str(formData, "courseId"), organizationId: str(formData, "organizationId") };
  const parsed = createClassSchema.safeParse({ name: values.name, courseId: values.courseId, organizationId: values.organizationId || undefined });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= key === "organizationId" ? "Choose a school." : issue.message;
    }
    return { error: "Check the highlighted fields.", fieldErrors, values };
  }
  let classId: string;
  try {
    const user = await requireApiUser(...STAFF);
    const row = await createClass(user, parsed.data);
    classId = row.id;
  } catch (e) {
    return { ...failure(e, "Couldn't create the class. Please try again."), values };
  }
  revalidatePath("/teacher", "layout");
  redirect(`/teacher/classes/${classId}?created=1`);
}

const removeSchema = z.object({ classId: z.string().uuid(), studentId: z.string().uuid() });

export async function removeStudentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = removeSchema.safeParse({ classId: str(formData, "classId"), studentId: str(formData, "studentId") });
  if (!parsed.success) return { error: "That student couldn't be found." };
  try {
    const user = await requireApiUser(...STAFF);
    await removeStudent(user, parsed.data.classId, parsed.data.studentId);
  } catch (e) {
    return failure(e, "Couldn't remove the student. Please try again.");
  }
  revalidatePath(`/teacher/classes/${parsed.data.classId}`, "layout");
  revalidatePath("/teacher");
  return { ok: true, message: "Student removed from the class." };
}

const aiSchema = z.object({ classId: z.string().uuid(), aiPolicy: z.enum(["allowed", "hints_only", "disabled"], { message: "Choose a setting." }) });

export async function setAiPolicyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = aiSchema.safeParse({ classId: str(formData, "classId"), aiPolicy: str(formData, "aiPolicy") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Choose a setting.", fieldErrors: { aiPolicy: "Choose a setting." } };
  try {
    const user = await requireApiUser(...STAFF);
    await setClassAiPolicy(user, parsed.data.classId, parsed.data.aiPolicy);
  } catch (e) {
    return failure(e, "Couldn't save the setting. Please try again.");
  }
  revalidatePath(`/teacher/classes/${parsed.data.classId}`, "layout");
  return { ok: true, message: "AI tutor setting saved." };
}

const rosterSchema = z.object({ classId: z.string().uuid() });

/** "Review Canvas roster": refresh the proposal snapshot. Creates no identity link and no enrolment. */
export async function reviewCanvasRosterAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = rosterSchema.safeParse({ classId: str(formData, "classId") });
  if (!parsed.success) return { error: "That class couldn't be found." };
  let message: string;
  try {
    const user = await requireApiUser(...STAFF);
    const outcome = await reviewCanvasRoster(user, parsed.data.classId);
    const failed = outcome.sources.filter((s) => !s.ok);
    if (failed.length === outcome.sources.length) return { error: `Couldn't fetch the Canvas roster: ${failed[0]?.error ?? "unknown error"} The previous review (if any) is still shown.` };
    const members = outcome.sources.reduce((n, s) => n + s.members, 0);
    message = `Canvas roster reviewed: ${members} member${members === 1 ? "" : "s"}, ${outcome.counts.suggested} suggestion${outcome.counts.suggested === 1 ? "" : "s"}. No accounts were linked.`;
    if (failed.length) message += ` ${failed.length} Canvas connection${failed.length === 1 ? "" : "s"} couldn't be reached: ${failed[0]?.error ?? ""}`;
  } catch (e) {
    return failure(e, "Couldn't review the Canvas roster. Please try again.");
  }
  revalidatePath(`/teacher/classes/${parsed.data.classId}/canvas-roster`);
  return { ok: true, message };
}

const cellSchema = z.object({ classId: z.string().uuid(), studentId: z.string().uuid(), columnId: z.string().min(1).max(200) });

/** Read-only: the evidence behind one heatmap cell. */
export async function loadCellEvidence(classId: string, studentId: string, columnId: string): Promise<CellEvidenceResult> {
  const parsed = cellSchema.safeParse({ classId, studentId, columnId });
  if (!parsed.success) return { ok: false, error: "That cell couldn't be found." };
  try {
    const user = await requireApiUser(...STAFF);
    const evidence = await buildCellEvidence(user, parsed.data.classId, parsed.data.studentId, parsed.data.columnId);
    return { ok: true, evidence };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, error: e.code === "not_found" || e.code === "forbidden" ? "This evidence isn't available." : e.message };
    console.error("[teacher evidence]", e);
    return { ok: false, error: "Couldn't load the evidence. Please try again." };
  }
}
