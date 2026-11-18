import { apiHandler, parseJson } from "@/lib/api";
import { revealSolution } from "@/modules/assessments/service";
import { requireApiUser } from "@/modules/auth/session";
import { questionRefSchema, type AttemptRouteContext } from "../../_lib";

/** POST /api/attempts/[attemptId]/solution {questionId} → { solution, correctAnswer } (guided modes only). */
export const POST = apiHandler<AttemptRouteContext>(async (req, ctx) => {
  const user = await requireApiUser("student");
  const { attemptId } = await ctx.params;
  const { questionId } = await parseJson(req, questionRefSchema);
  return revealSolution(user.id, attemptId, questionId);
});
