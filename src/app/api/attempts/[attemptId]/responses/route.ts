import { z } from "zod";
import { apiHandler, parseJson } from "@/lib/api";
import { responseSchema } from "@/modules/assessments/grading";
import { submitResponse } from "@/modules/assessments/service";
import { requireApiUser } from "@/modules/auth/session";
import { questionIdSchema, type AttemptRouteContext } from "../../_lib";

const bodySchema = z.object({
  questionId: questionIdSchema,
  response: responseSchema,
  idempotencyKey: z.string().min(8).max(100),
  timeSpentMs: z.number().finite().nonnegative().optional(),
});

/** POST /api/attempts/[attemptId]/responses → SubmitResult (immediate-feedback modes). */
export const POST = apiHandler<AttemptRouteContext>(async (req, ctx) => {
  const user = await requireApiUser("student");
  const { attemptId } = await ctx.params;
  const body = await parseJson(req, bodySchema);
  return submitResponse(user.id, { attemptId, ...body });
});
