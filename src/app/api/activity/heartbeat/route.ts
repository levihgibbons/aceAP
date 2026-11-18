import { z } from "zod";
import { apiHandler, parseJson } from "@/lib/api";
import { DomainError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { recordHeartbeat } from "@/modules/analytics/service";
import { requireApiUser } from "@/modules/auth/session";

const MAX_MS = 24 * 60 * 60 * 1000;

const bodySchema = z.object({
  sessionId: z.uuid(),
  openMs: z.number().finite().min(0).max(MAX_MS),
  activeMs: z.number().finite().min(0).max(MAX_MS),
});

/**
 * POST /api/activity/heartbeat {sessionId, openMs, activeMs} → accepted (clamped) deltas.
 * The client is not trusted: the service clamps to wall-clock time since the
 * previous heartbeat. Accepts navigator.sendBeacon bodies (JSON Blob).
 */
export const POST = apiHandler(async (req) => {
  const user = await requireApiUser("student");
  if (!(await rateLimit(`activity-heartbeat:${user.id}`, 40, 60_000)).allowed) throw new DomainError("rate_limited", "Too many heartbeats.");
  const body = await parseJson(req, bodySchema);
  const accepted = await recordHeartbeat(user.id, body);
  return { ok: true, accepted };
});
