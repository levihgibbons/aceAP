import { z } from "zod";
import { apiHandler, parseJson } from "@/lib/api";
import { responseSchema } from "@/modules/assessments/grading";
import { saveDraftAnswer } from "@/modules/assessments/service";
import { requireApiUser } from "@/modules/auth/session";
import { questionIdSchema, type AttemptRouteContext } from "../../_lib";

const bodySchema = z.object({ questionId: questionIdSchema, response: responseSchema.nullable() });

/** PUT /api/attempts/[attemptId]/drafts {questionId, response|null} → { saved, message? } (deferred modes). */
export const PUT = apiHandler<AttemptRouteContext>(async (req, ctx) => {
  const user = await requireApiUser("student");
  const { attemptId } = await ctx.params;
  const body = await parseJson(req, bodySchema);
  return saveDraftAnswer(user.id, { attemptId, ...body });
});
