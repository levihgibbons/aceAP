"use server";
/**
 * Gradebook server actions. Each re-checks the staff role here and class
 * ownership inside the gradebook service. None of them touch responses or
 * mastery evidence — only gradebook_entries and grading_policies.
 */
import { refresh } from "next/cache";
import {
  failureFrom,
  str,
  zodFieldErrors,
  type ActionState,
} from "@/components/assignments/action-state";
import { describeSend, fullyConfirmed, toPanelData, type PassbackPanelData } from "@/components/gradebook/passback";
import { requireApiUser } from "@/modules/auth/session";
import { gradingPolicySchema } from "@/modules/gradebook/policy";
import {
  gradeOverrideSchema,
  previewGradingPolicy,
  publishGradingPolicy,
  setExcused,
  setGradeComment,
  setGradeOverride,
  type PolicyPreview,
} from "@/modules/gradebook/service";
import {
  getAssignmentPassback,
  retryGradeSync,
  sendAssignmentGrades,
  sendClassGrades,
} from "@/modules/integrations/lms/passback";

const staff = () => requireApiUser("teacher", "school_admin", "platform_admin");

export async function setOverrideAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await staff();
    const raw = str(formData, "grade").trim();
    const grade = raw === "" ? NaN : Number(raw);
    if (!Number.isFinite(grade))
      return {
        ok: false,
        error: "Enter the grade as a percentage.",
        fieldErrors: { grade: "Enter a number from 0 to 150." },
      };
    const input = {
      assignmentId: str(formData, "assignmentId"),
      studentId: str(formData, "studentId"),
      grade,
      reason: str(formData, "reason"),
    };
    const parsed = gradeOverrideSchema.safeParse(input);
    if (!parsed.success)
      return {
        ok: false,
        error: "Some fields need attention.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    await setGradeOverride(user, input);
  } catch (e) {
    return failureFrom(e, "setOverride");
  }
  refresh();
  return { ok: true, message: "Override saved. The computed grade is kept underneath." };
}

export async function clearOverrideAction(
  assignmentId: string,
  studentId: string,
): Promise<ActionState> {
  try {
    const user = await staff();
    await setGradeOverride(user, { assignmentId, studentId, grade: null });
  } catch (e) {
    return failureFrom(e, "clearOverride");
  }
  refresh();
  return { ok: true, message: "Override cleared. The computed grade is shown again." };
}

export async function setCommentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await staff();
    const comment = str(formData, "comment");
    if (comment.length > 2000)
      return {
        ok: false,
        error: "Comments can be at most 2000 characters.",
        fieldErrors: { comment: "Max 2000 characters." },
      };
    await setGradeComment(user, {
      assignmentId: str(formData, "assignmentId"),
      studentId: str(formData, "studentId"),
      comment: comment.trim() ? comment : null,
    });
  } catch (e) {
    return failureFrom(e, "setComment");
  }
  refresh();
  return { ok: true, message: "Comment saved." };
}

export async function setExcusedAction(
  assignmentId: string,
  studentId: string,
  excused: boolean,
): Promise<ActionState> {
  try {
    const user = await staff();
    await setExcused(user, { assignmentId, studentId, excused: excused === true });
  } catch (e) {
    return failureFrom(e, "setExcused");
  }
  refresh();
  return {
    ok: true,
    message: excused ? "Marked excused — left out of averages." : "No longer excused.",
  };
}

export interface PreviewResult extends ActionState {
  preview?: PolicyPreview;
}

export async function previewPolicyAction(
  classId: string,
  config: unknown,
): Promise<PreviewResult> {
  try {
    const user = await staff();
    const parsed = gradingPolicySchema.safeParse(config);
    if (!parsed.success)
      return {
        ok: false,
        error: "Fix the highlighted values to see a preview.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    const preview = await previewGradingPolicy(user, classId, parsed.data);
    return { ok: true, preview };
  } catch (e) {
    return failureFrom(e, "previewPolicy");
  }
}

export async function publishPolicyAction(classId: string, config: unknown): Promise<ActionState> {
  let version: number;
  try {
    const user = await staff();
    const parsed = gradingPolicySchema.safeParse(config);
    if (!parsed.success)
      return {
        ok: false,
        error: "Fix the highlighted values before publishing.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    version = (await publishGradingPolicy(user, classId, parsed.data)).version;
  } catch (e) {
    return failureFrom(e, "publishPolicy");
  }
  refresh();
  return {
    ok: true,
    message: `Version ${version} is now active. Gradebook grades were recomputed; evidence was not changed.`,
  };
}

// ─────────────────────────── Canvas grade passback ──────────────────────────
// Every action re-checks the staff role here and class staff membership in
// the passback service (assertClassStaff). Nothing is sent unless the class's
// school has a Canvas connection whose diagnostics passed; a grade is shown as
// synced only after Canvas answered 2xx.

export interface CanvasSyncResult extends ActionState {
  data?: PassbackPanelData;
  /** Some grades were not confirmed by Canvas (pending, blocked or failed). */
  partial?: boolean;
}

export async function loadCanvasSyncAction(assignmentId: string): Promise<CanvasSyncResult> {
  try {
    const user = await staff();
    return { ok: true, data: toPanelData(await getAssignmentPassback(user, String(assignmentId))) };
  } catch (e) {
    return failureFrom(e, "loadCanvasSync");
  }
}

export async function sendAssignmentGradesAction(
  classId: string,
  assignmentId: string,
  includeComments: boolean,
): Promise<CanvasSyncResult> {
  let message: string;
  let data: PassbackPanelData;
  let partial: boolean;
  try {
    const user = await staff();
    const result = await sendAssignmentGrades(user, {
      classId: String(classId),
      assignmentId: String(assignmentId),
      includeComments: includeComments === true,
    });
    message = describeSend(result);
    partial = !fullyConfirmed(result);
    data = toPanelData(await getAssignmentPassback(user, String(assignmentId)));
  } catch (e) {
    return failureFrom(e, "sendAssignmentGrades");
  }
  refresh();
  return { ok: true, message, data, partial };
}

export async function sendClassGradesAction(
  classId: string,
  includeComments: boolean,
): Promise<CanvasSyncResult> {
  let message: string;
  let partial: boolean;
  try {
    const user = await staff();
    const result = await sendClassGrades(user, {
      classId: String(classId),
      includeComments: includeComments === true,
    });
    const n = result.assignments.length;
    message = `${n} linked assignment${n === 1 ? "" : "s"}: ${describeSend(result)}`;
    partial = !fullyConfirmed(result);
  } catch (e) {
    return failureFrom(e, "sendClassGrades");
  }
  refresh();
  return { ok: true, message, partial };
}

export async function retryGradeSyncAction(
  assignmentId: string,
  jobId: string,
): Promise<CanvasSyncResult> {
  let message: string;
  let data: PassbackPanelData;
  let delivered: boolean;
  try {
    const user = await staff();
    const outcome = await retryGradeSync(user, String(jobId));
    delivered = outcome.status === "synced" || outcome.status === "pending";
    message =
      outcome.status === "synced"
        ? "Canvas confirmed the grade."
        : !outcome.attempted
          ? "Re-queued. It will be sent when the Canvas connection passes diagnostics."
          : outcome.status === "pending"
            ? "Canvas couldn't be reached; the grade will be retried automatically."
            : `Still ${outcome.status}: ${outcome.error ?? "see the reason"}`;
    data = toPanelData(await getAssignmentPassback(user, String(assignmentId)));
  } catch (e) {
    return failureFrom(e, "retryGradeSync");
  }
  refresh();
  return delivered ? { ok: true, message, data } : { ok: false, error: message, data };
}
