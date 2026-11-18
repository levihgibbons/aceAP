import { z } from "zod";
import { apiHandler, parseJson } from "@/lib/api";
import { DomainError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { startLearningSession } from "@/modules/analytics/service";
import { requireApiUser } from "@/modules/auth/session";
import { getCourseTree } from "@/modules/curriculum/queries";

const bodySchema = z.object({
  activityKind: z.enum(["lesson", "practice", "assessment", "simulation"]),
  courseId: z.string().min(1).max(100).optional(),
  activityId: z.string().min(1).max(200).optional(),
});

/** POST /api/activity/session → { sessionId }. Opens a learning session for active-time heartbeats. */
export const POST = apiHandler(async (req) => {
  const user = await requireApiUser("student");
  if (!(await rateLimit(`activity-session:${user.id}`, 30, 60_000)).allowed) throw new DomainError("rate_limited", "Too many sessions started. Please wait a moment.");
  const body = await parseJson(req, bodySchema);
  // Only attribute time to a course that exists (aggregates feed teacher dashboards).
  const courseId = body.courseId && (await getCourseTree(body.courseId)) ? body.courseId : null;
  const sessionId = await startLearningSession(user.id, { activityKind: body.activityKind, courseId, activityId: body.activityId ?? null });
  return { sessionId };
});
