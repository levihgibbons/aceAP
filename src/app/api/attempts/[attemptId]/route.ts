import { apiHandler } from "@/lib/api";
import { getAttemptView } from "@/modules/assessments/service";
import { requireApiUser } from "@/modules/auth/session";
import type { AttemptRouteContext } from "../_lib";

/** GET /api/attempts/[attemptId] → AttemptView (answers stripped by the service). */
export const GET = apiHandler<AttemptRouteContext>(async (_req, ctx) => {
  const user = await requireApiUser("student");
  const { attemptId } = await ctx.params;
  return getAttemptView(user.id, attemptId);
});
