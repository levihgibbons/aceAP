import { apiHandler, parseJson } from "@/lib/api";
import { revealHint } from "@/modules/assessments/service";
import { requireApiUser } from "@/modules/auth/session";
import { questionRefSchema, type AttemptRouteContext } from "../../_lib";

/** POST /api/attempts/[attemptId]/hints {questionId} → { hints, remaining } */
export const POST = apiHandler<AttemptRouteContext>(async (req, ctx) => {
  const user = await requireApiUser("student");
  const { attemptId } = await ctx.params;
  const { questionId } = await parseJson(req, questionRefSchema);
  return revealHint(user.id, attemptId, questionId);
});
