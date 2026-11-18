import { z } from "zod";
import { apiHandler, parseJson } from "@/lib/api";
import { requireApiUser } from "@/modules/auth/session";
import { saveLessonPosition } from "@/modules/learning/progress";

interface Ctx {
  params: Promise<{ lessonId: string }>;
}

const bodySchema = z.object({ furthestBlock: z.number().int().min(0).max(1000) });

/**
 * POST /api/lessons/[lessonId]/progress {furthestBlock}
 * Engagement only (resume position) — never an input to mastery. Accepts
 * navigator.sendBeacon bodies, which arrive as a JSON Blob.
 */
export const POST = apiHandler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser("student");
  const { lessonId } = await ctx.params;
  const { furthestBlock } = await parseJson(req, bodySchema);
  await saveLessonPosition(user.id, lessonId, furthestBlock);
  return { ok: true };
});
