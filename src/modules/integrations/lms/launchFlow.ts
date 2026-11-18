/**
 * What happens after a VALID LTI launch (see docs/CANVAS_INTEGRATION.md, "Launch route").
 *
 * Canvas posts the launch cross-site, so the browser does not send AceAP's
 * SameSite=Lax session cookie with it. Identity is therefore resolved like this:
 *  - LMS user already linked (explicitly, earlier) → sign that AceAP user in.
 *  - Not linked → issue a short-lived signed "pending link" token and send the
 *    browser (top-level GET, where the session cookie IS sent) to /lti/link,
 *    where the signed-in user confirms the link. Never matched by name/email.
 */
import { createHmac } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import type { LaunchContext } from "./types";
import { constantTimeEqual, resolveStateSecret, type StateSecret } from "./lti/oidc";
import { isInstructor } from "./lti/launch";

export interface PendingLink {
  connectionId: string;
  organizationId: string;
  userSub: string;
  instructor: boolean;
  assignmentId: string | null;
  resourceLinkId: string | null;
  lineItemUrl: string | null;
  contextTitle: string | null;
  /** Canvas course (LTI context id) and its NRPS memberships URL, used to map the course to the class. */
  contextId?: string | null;
  membershipsUrl?: string | null;
  /**
   * Set for a deep-linking launch: the signed deep-link session token
   * (deepLinkFlow.ts). After the link is confirmed the user continues to the
   * activity picker instead of an assignment.
   */
  deepLinkToken?: string | null;
  exp: number;
}

const TTL_SECONDS = 10 * 60;

function secretOrThrow(): StateSecret {
  const s = resolveStateSecret();
  if (!s.ok) throw new Error(s.error.message);
  return s.value;
}

export function pendingFromLaunch(launch: LaunchContext, now: Date = new Date()): PendingLink | null {
  if (!launch.userSub) return null;
  return {
    connectionId: launch.connectionId,
    organizationId: launch.organizationId,
    userSub: launch.userSub,
    instructor: isInstructor(launch.roles),
    assignmentId: launch.custom.aceap_assignment_id ?? null,
    resourceLinkId: launch.resourceLink?.id ?? null,
    lineItemUrl: launch.ags?.lineItemUrl ?? null,
    contextTitle: launch.context?.title ?? null,
    contextId: launch.context?.id ?? null,
    membershipsUrl: launch.nrps?.contextMembershipsUrl ?? null,
    exp: Math.floor(now.getTime() / 1000) + TTL_SECONDS,
  };
}

export function signPendingLink(p: PendingLink, secret: StateSecret = secretOrThrow()): string {
  const body = Buffer.from(JSON.stringify(p)).toString("base64url");
  const mac = createHmac("sha256", secret).update(`pending-link.${body}`).digest("base64url");
  return `${body}.${mac}`;
}

export function verifyPendingLink(token: string, now: Date = new Date(), secret: StateSecret = secretOrThrow()): PendingLink | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", secret).update(`pending-link.${body}`).digest("base64url");
  if (!constantTimeEqual(mac, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PendingLink;
    if (typeof p.exp !== "number" || p.exp * 1000 <= now.getTime()) return null;
    if (typeof p.connectionId !== "string" || typeof p.userSub !== "string") return null;
    return p;
  } catch {
    return null;
  }
}

/** The activity picker URL for a deep-link session token. */
export function deepLinkPickerPath(deepLinkToken: string): string {
  return `/lti/deep-link?token=${encodeURIComponent(deepLinkToken)}`;
}

/** Where to send a linked user after launch — only to an assignment they can actually access. */
export async function destinationFor(userId: string, role: t.UserRole, p: Pick<PendingLink, "assignmentId" | "organizationId">): Promise<string> {
  const staff = role !== "student";
  if (!p.assignmentId || !/^[0-9a-f-]{36}$/i.test(p.assignmentId)) return staff ? "/teacher/integrations" : "/app";
  const db = await getDb();
  const [a] = await db
    .select({ id: t.assignments.id, classId: t.assignments.classId, organizationId: t.classes.organizationId, teacherId: t.classes.teacherId })
    .from(t.assignments)
    .innerJoin(t.classes, eq(t.classes.id, t.assignments.classId))
    .where(eq(t.assignments.id, p.assignmentId));
  // The assignment must belong to the organisation that owns this LMS connection.
  if (!a || a.organizationId !== p.organizationId) return staff ? "/teacher/integrations" : "/app";
  if (staff) return a.teacherId === userId ? `/teacher/assignments/${a.id}` : "/teacher";
  const [enrolled] = await db
    .select({ s: t.classEnrollments.studentId })
    .from(t.classEnrollments)
    .where(and(eq(t.classEnrollments.classId, a.classId), eq(t.classEnrollments.studentId, userId), eq(t.classEnrollments.status, "active")));
  return enrolled ? `/app/assignments/${a.id}` : "/app";
}

/**
 * Instructor launch of a deep-linked assignment they teach: remember its
 * resource link and grade column, and map the Canvas course (context) to the
 * assignment's class with its NRPS memberships URL (used by the teacher's
 * "Review Canvas roster"). A course already mapped to a different class is
 * never re-pointed. Maps no identities.
 */
export async function maybeMapAssignment(userId: string, p: PendingLink): Promise<void> {
  if (!p.instructor || !p.assignmentId || !p.resourceLinkId || !/^[0-9a-f-]{36}$/i.test(p.assignmentId)) return;
  const db = await getDb();
  const [a] = await db
    .select({ classId: t.assignments.classId, teacherId: t.classes.teacherId, organizationId: t.classes.organizationId })
    .from(t.assignments)
    .innerJoin(t.classes, eq(t.classes.id, t.assignments.classId))
    .where(eq(t.assignments.id, p.assignmentId));
  if (!a || a.teacherId !== userId || a.organizationId !== p.organizationId) return;
  const { mapAssignment, mapCourse } = await import("./service");
  await mapAssignment({ connectionId: p.connectionId, assignmentId: p.assignmentId, resourceLinkId: p.resourceLinkId, lineItemUrl: p.lineItemUrl });

  const contextId = p.contextId?.trim();
  if (!contextId) return;
  const [existing] = await db
    .select({ classId: t.externalCourseMappings.classId })
    .from(t.externalCourseMappings)
    .where(and(eq(t.externalCourseMappings.connectionId, p.connectionId), eq(t.externalCourseMappings.externalCourseId, contextId)));
  if (existing && existing.classId !== a.classId) return;
  const mapped = await mapCourse({ connectionId: p.connectionId, externalCourseId: contextId, classId: a.classId, membershipsUrl: p.membershipsUrl ?? undefined });
  // A memberships URL that fails the URL policy is dropped; the course is still mapped.
  if (!mapped.ok && mapped.error.code === "validation" && p.membershipsUrl && !existing) {
    await mapCourse({ connectionId: p.connectionId, externalCourseId: contextId, classId: a.classId, membershipsUrl: null });
  }
}
