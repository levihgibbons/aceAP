import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { apiHandler, parseJson } from "@/lib/api";
import { DomainError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { SIMULATION_IDS } from "@/components/simulations/types";
import { requireApiUser } from "@/modules/auth/session";
import { getCourseTree } from "@/modules/curriculum/queries";
import { logEvent } from "@/modules/learning/events";

const bodySchema = z.object({
  simId: z.enum(SIMULATION_IDS),
  lessonId: z.string().min(1).max(200).optional(),
  questionId: z.string().min(1).max(200).optional(),
  courseId: z.string().min(1).max(100).optional(),
});

const PER_SIM_WINDOW_MS = 30_000;

/**
 * POST /api/activity/simulation — records SIMULATION_INTERACTED as engagement
 * only (never mastery). Payload holds only the simulation id and the lesson or
 * question it was used in. At most one event per simulation per 30 s.
 */
export const POST = apiHandler(async (req) => {
  const user = await requireApiUser("student");
  if (!(await rateLimit(`activity-sim:${user.id}`, 20, 60_000)).allowed) throw new DomainError("rate_limited", "Too many simulation events.");
  const body = await parseJson(req, bodySchema);
  if (!(await rateLimit(`activity-sim:${user.id}:${body.simId}:${body.lessonId ?? body.questionId ?? ""}`, 1, PER_SIM_WINDOW_MS)).allowed) return { recorded: false };

  const db = await getDb();
  let courseId: string | null = null;
  if (body.lessonId) {
    const [lesson] = await db.select({ courseId: t.lessons.courseId }).from(t.lessons).where(eq(t.lessons.id, body.lessonId));
    if (!lesson) throw new DomainError("not_found", "Lesson not found.");
    courseId = lesson.courseId;
  } else if (body.questionId) {
    const [question] = await db.select({ courseId: t.questions.courseId }).from(t.questions).where(eq(t.questions.id, body.questionId));
    if (!question) throw new DomainError("not_found", "Question not found.");
    courseId = question.courseId;
  } else if (body.courseId && (await getCourseTree(body.courseId))) courseId = body.courseId;

  const payload: Record<string, string> = { simulationId: body.simId };
  if (body.lessonId) payload.lessonId = body.lessonId;
  else if (body.questionId) payload.questionId = body.questionId;

  await logEvent(db, { userId: user.id, type: "SIMULATION_INTERACTED", courseId, activityType: "simulation", activityId: body.simId, payload });
  return { recorded: true };
});
