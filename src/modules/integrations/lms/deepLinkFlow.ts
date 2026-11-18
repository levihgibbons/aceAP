/**
 * Deep Linking 2.0 activity picker (after a VALID `LtiDeepLinkingRequest`).
 *
 * The launch route stores the validated deep-linking settings in a
 * short-lived HMAC-signed token (same construction as the pending-link token
 * in launchFlow.ts) and sends the browser top-level to `/lti/deep-link`.
 * There the signed-in AceAP teacher — who must be the AceAP account explicitly
 * linked to the launching LMS user — picks assignments from their classes in
 * the connection's organisation. The response JWT is built by the adapter's
 * `buildDeepLinkingResponse` and returned to `deep_link_return_url`.
 *
 * Every content item:
 *   type ltiResourceLink · title · url = APP_BASE_URL/api/lti/launch ·
 *   custom.aceap_assignment_id · lineItem { scoreMaximum: points, label: title,
 *   resourceId: assignment id } · window { targetName: "_blank" }
 * (AceAP pages refuse to be framed, so the link asks to open in a new tab.)
 */
import { createHmac } from "node:crypto";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { createCanvasAdapter } from "./canvasAdapter";
import { LTI_LAUNCH_PATH, constantTimeEqual, resolveStateSecret, type StateSecret } from "./lti/oidc";
import { getConnectionConfig, getLinkedUserId } from "./service";
import { fail, type DeepLinkItem, type DeepLinkingResponse, type DeepLinkingSettings, type LaunchContext, type LmsAdapter, type LmsResult } from "./types";

export interface DeepLinkSession {
  connectionId: string;
  organizationId: string;
  /** LMS user (`sub`) who started the deep-linking request. */
  userSub: string;
  settings: DeepLinkingSettings;
  contextTitle: string | null;
  /** Expiry, seconds since the epoch. */
  exp: number;
}

/** Long enough to pick a few assignments, short enough that a leaked URL is soon useless. */
export const DEEP_LINK_SESSION_TTL_SECONDS = 20 * 60;
export const DEEP_LINK_WINDOW_TARGET = "_blank";

function secretOrThrow(): StateSecret {
  const s = resolveStateSecret();
  if (!s.ok) throw new Error(s.error.message);
  return s.value;
}

export function deepLinkSessionFromLaunch(launch: LaunchContext, now: Date = new Date()): DeepLinkSession | null {
  if (launch.messageType !== "LtiDeepLinkingRequest" || !launch.deepLinking || !launch.userSub) return null;
  return {
    connectionId: launch.connectionId,
    organizationId: launch.organizationId,
    userSub: launch.userSub,
    settings: launch.deepLinking,
    contextTitle: launch.context?.title ?? null,
    exp: Math.floor(now.getTime() / 1000) + DEEP_LINK_SESSION_TTL_SECONDS,
  };
}

export function signDeepLinkSession(session: DeepLinkSession, secret: StateSecret = secretOrThrow()): string {
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  const mac = createHmac("sha256", secret).update(`deep-link.${body}`).digest("base64url");
  return `${body}.${mac}`;
}

export function verifyDeepLinkSession(token: string, now: Date = new Date(), secret: StateSecret = secretOrThrow()): DeepLinkSession | null {
  const [body, mac, extra] = token.split(".");
  if (!body || !mac || extra !== undefined) return null;
  const expected = createHmac("sha256", secret).update(`deep-link.${body}`).digest("base64url");
  if (!constantTimeEqual(mac, expected)) return null;
  try {
    const s = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as DeepLinkSession;
    if (typeof s.exp !== "number" || s.exp * 1000 <= now.getTime()) return null;
    if (typeof s.connectionId !== "string" || typeof s.userSub !== "string" || typeof s.settings?.deepLinkReturnUrl !== "string") return null;
    return s;
  } catch {
    return null;
  }
}

// ───────────────────────────────── Picker data ──────────────────────────────

export interface PickerUser {
  id: string;
  role: t.UserRole;
}

export interface PickerAssignment {
  id: string;
  title: string;
  kind: t.AssignmentKind;
  points: number;
  dueAt: Date | null;
}

export interface PickerClass {
  id: string;
  name: string;
  assignments: PickerAssignment[];
}

export type PickerAccess =
  | { ok: true; classes: PickerClass[] }
  | { ok: false; reason: "not_staff" | "not_linked" | "wrong_account"; message: string };

/**
 * Who may use a deep-link session: a staff user who is the AceAP account
 * explicitly linked to the session's LMS user on its connection.
 */
export async function checkPickerUser(user: PickerUser, session: DeepLinkSession): Promise<{ ok: true } | Extract<PickerAccess, { ok: false }>> {
  if (user.role === "student") return { ok: false, reason: "not_staff", message: "Only teachers can add AceAP activities to a course." };
  const linked = await getLinkedUserId(session.connectionId, session.userSub);
  if (!linked) return { ok: false, reason: "not_linked", message: "Your LMS account isn't linked to an AceAP account yet. Start again from your LMS." };
  if (linked !== user.id) return { ok: false, reason: "wrong_account", message: "This request came from an LMS account that is linked to a different AceAP account. Sign in with that account and start again from your LMS." };
  return { ok: true };
}

/** Classes (and their active assignments) the user teaches — or administers — in the session's organisation. */
export async function listPickerClasses(user: PickerUser, session: DeepLinkSession): Promise<PickerAccess> {
  const access = await checkPickerUser(user, session);
  if (!access.ok) return access;
  const db = await getDb();
  const orgClasses = await db
    .select({ id: t.classes.id, name: t.classes.name, teacherId: t.classes.teacherId })
    .from(t.classes)
    .where(and(eq(t.classes.organizationId, session.organizationId), isNull(t.classes.archivedAt)))
    .orderBy(asc(t.classes.name));
  let allowed = orgClasses.filter((c) => c.teacherId === user.id);
  if (user.role === "platform_admin") allowed = orgClasses;
  else {
    const [admin] = await db
      .select({ userId: t.organizationMemberships.userId })
      .from(t.organizationMemberships)
      .where(and(eq(t.organizationMemberships.organizationId, session.organizationId), eq(t.organizationMemberships.userId, user.id), eq(t.organizationMemberships.role, "school_admin")));
    if (admin) allowed = orgClasses;
  }
  if (allowed.length === 0) return { ok: true, classes: [] };
  const rows = await db
    .select({ id: t.assignments.id, classId: t.assignments.classId, title: t.assignments.title, kind: t.assignments.kind, points: t.assignments.points, dueAt: t.assignments.dueAt })
    .from(t.assignments)
    .where(and(inArray(t.assignments.classId, allowed.map((c) => c.id)), isNull(t.assignments.archivedAt)))
    .orderBy(asc(t.assignments.dueAt), asc(t.assignments.createdAt));
  return {
    ok: true,
    classes: allowed.map((c) => ({
      id: c.id,
      name: c.name,
      assignments: rows.filter((r) => r.classId === c.id).map((r) => ({ id: r.id, title: r.title, kind: r.kind, points: r.points, dueAt: r.dueAt })),
    })),
  };
}

/** One `ltiResourceLink` content item per AceAP assignment. */
export function contentItemsFor(baseUrl: string, assignments: Pick<PickerAssignment, "id" | "title" | "points">[]): DeepLinkItem[] {
  const url = new URL(LTI_LAUNCH_PATH, baseUrl).toString();
  return assignments.map((a) => ({
    title: a.title,
    url,
    custom: { aceap_assignment_id: a.id },
    lineItem: { scoreMaximum: a.points, label: a.title, resourceId: a.id },
    window: { targetName: DEEP_LINK_WINDOW_TARGET },
  }));
}

export interface PickerResponse {
  response: DeepLinkingResponse;
  itemCount: number;
}

/**
 * Build the signed deep-linking response for the chosen assignments (an empty
 * selection returns an empty response so the LMS can close its dialog).
 * Re-checks the user and that every assignment is theirs, in the session's
 * organisation, and not archived.
 */
export async function buildPickerResponse(
  user: PickerUser,
  session: DeepLinkSession,
  assignmentIds: string[],
  deps: { adapter?: LmsAdapter; baseUrl?: string } = {},
): Promise<LmsResult<PickerResponse>> {
  const access = await listPickerClasses(user, session);
  if (!access.ok) return fail("permission_denied", access.message);
  const ids = [...new Set(assignmentIds)];
  const available = new Map(access.classes.flatMap((c) => c.assignments.map((a) => [a.id, a] as const)));
  const chosen: PickerAssignment[] = [];
  for (const id of ids) {
    const a = available.get(id);
    if (!a) return fail("permission_denied", "One of the selected assignments isn't available to you in this school.");
    chosen.push(a);
  }
  if (chosen.length > 1 && !session.settings.acceptMultiple) return fail("bad_request", "Your LMS accepts only one activity here. Select one assignment.");
  const connection = await getConnectionConfig(session.connectionId);
  if (!connection || connection.organizationId !== session.organizationId) return fail("not_configured", "The LMS connection for this request no longer exists.");
  const baseUrl = deps.baseUrl ?? (process.env.APP_BASE_URL?.trim() || "http://localhost:3000");
  const adapter = deps.adapter ?? createCanvasAdapter();
  const response = await adapter.buildDeepLinkingResponse({
    connection,
    settings: session.settings,
    items: contentItemsFor(baseUrl, chosen),
    message: chosen.length === 0 ? undefined : `Added ${chosen.length} AceAP ${chosen.length === 1 ? "assignment" : "assignments"}.`,
  });
  if (!response.ok) return response;
  const db = await getDb();
  await db.insert(t.auditLogs).values({
    actorId: user.id,
    action: "lms.deep_link_returned",
    entityType: "lms_connection",
    entityId: connection.id,
    organizationId: connection.organizationId,
    metadata: { assignmentIds: chosen.map((a) => a.id), count: chosen.length },
  });
  return { ok: true, value: { response: response.value, itemCount: chosen.length } };
}
