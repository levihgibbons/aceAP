"use server";
/**
 * Integrations server actions. The LMS service runs as the trusted database
 * role, so every action here proves the caller is teacher/school admin of the
 * organisation (or a platform admin) before calling it.
 */
import { refresh } from "next/cache";
import { getDb } from "@/db/client";
import { DomainError } from "@/lib/errors";
import { failureFrom, str, type ActionState } from "@/components/assignments/action-state";
import { requireApiUser } from "@/modules/auth/session";
import { staffOrganizations } from "@/modules/classrooms/service";
import {
  CANVAS_PRODUCTION_ISSUER,
  canvasEndpointDefaults,
  type CanvasEndpointDefaults,
} from "@/modules/integrations/lms/canvasAdapter";
import {
  getConnectionConfig,
  retrySyncJob,
  runDiagnostics,
  saveConnection,
  type DiagnosticsReport,
} from "@/modules/integrations/lms/service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authorizeOrg(organizationId: string) {
  const user = await requireApiUser("teacher", "school_admin", "platform_admin");
  if (typeof organizationId !== "string" || !UUID.test(organizationId))
    throw new DomainError("not_found", "Organisation not found.");
  if (user.role === "platform_admin") return user;
  const orgs = await staffOrganizations(await getDb(), user.id);
  if (!orgs.some((o) => o.id === organizationId))
    throw new DomainError("not_found", "Organisation not found.");
  return user;
}

export async function saveConnectionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const organizationId = str(formData, "organizationId");
    const user = await authorizeOrg(organizationId);
    const id = str(formData, "id");
    const result = await saveConnection(organizationId, user.id, {
      ...(id ? { id } : {}),
      platform: "canvas",
      issuer: str(formData, "issuer"),
      clientId: str(formData, "clientId"),
      deploymentId: str(formData, "deploymentId"),
      authLoginUrl: str(formData, "authLoginUrl"),
      authTokenUrl: str(formData, "authTokenUrl"),
      jwksUrl: str(formData, "jwksUrl"),
    });
    if (!result.ok) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues ?? []) fieldErrors[issue.path] ??= issue.message;
      return { ok: false, error: result.error.message, fieldErrors };
    }
  } catch (e) {
    return failureFrom(e, "saveConnection");
  }
  refresh();
  return {
    ok: true,
    message:
      "Saved as “Configured — not verified”. Nothing has been sent to Canvas. Run diagnostics to check the endpoints.",
  };
}

export interface DiagnosticsResult extends ActionState {
  report?: DiagnosticsReport;
}

export async function runDiagnosticsAction(
  organizationId: string,
  connectionId: string,
): Promise<DiagnosticsResult> {
  let report: DiagnosticsReport;
  try {
    await authorizeOrg(organizationId);
    const conn = typeof connectionId === "string" ? await getConnectionConfig(connectionId) : null;
    if (!conn || conn.organizationId !== organizationId)
      throw new DomainError("not_found", "Connection not found.");
    const result = await runDiagnostics(connectionId);
    if (!result.ok) return { ok: false, error: result.error.message };
    report = result.value;
  } catch (e) {
    return failureFrom(e, "runDiagnostics");
  }
  refresh();
  return { ok: true, report };
}

export async function retrySyncJobAction(
  organizationId: string,
  jobId: string,
): Promise<ActionState> {
  try {
    const user = await authorizeOrg(organizationId);
    const result = await retrySyncJob(jobId, user.id);
    if (!result.ok) return { ok: false, error: result.error.message };
  } catch (e) {
    return failureFrom(e, "retrySyncJob");
  }
  refresh();
  return {
    ok: true,
    message: "Job re-queued as pending. It is sent the next time the sync worker runs.",
  };
}

/** Suggested Canvas endpoints for an issuer (production cloud when empty). Pure; no network. */
export async function canvasDefaultsAction(
  issuer: string,
): Promise<(CanvasEndpointDefaults & { issuer: string }) | null> {
  await requireApiUser("teacher", "school_admin", "platform_admin");
  const iss =
    typeof issuer === "string" && issuer.trim()
      ? issuer.trim().replace(/\/+$/, "")
      : CANVAS_PRODUCTION_ISSUER;
  const d = canvasEndpointDefaults(iss);
  return d ? { ...d, issuer: iss } : null;
}
