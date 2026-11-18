import { apiHandler } from "@/lib/api";
import { requireApiUser } from "@/modules/auth/session";
import { completeLesson } from "@/modules/learning/progress";

interface Ctx {
  params: Promise<{ lessonId: string }>;
}

/** POST /api/lessons/[lessonId]/complete → { alreadyCompleted }. Completion never changes mastery. */
export const POST = apiHandler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser("student");
  const { lessonId } = await ctx.params;
  return completeLesson(user.id, lessonId);
});
