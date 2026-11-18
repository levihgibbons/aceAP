import { apiHandler } from "@/lib/api";
import { submitAttempt } from "@/modules/assessments/service";
import { requireApiUser } from "@/modules/auth/session";
import type { AttemptRouteContext } from "../../_lib";

/** POST /api/attempts/[attemptId]/submit → SubmitAttemptResult (idempotent: a second call reports alreadySubmitted). */
export const POST = apiHandler<AttemptRouteContext>(async (_req, ctx) => {
  const user = await requireApiUser("student");
  const { attemptId } = await ctx.params;
  return submitAttempt(user.id, attemptId);
});
