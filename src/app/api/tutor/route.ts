/**
 * POST /api/tutor (askTutorSchema) → the tutor result as JSON.
 *   ok | disabled | not_configured → 200
 *   rate_limited                   → 429 + Retry-After
 *   error (provider failure)       → 503 with { status: "error", message }
 * Invalid input → 422; someone else's attempt → 404 (DomainError via apiHandler).
 */
import { NextResponse, type NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/api";
import { askTutor, askTutorSchema } from "@/modules/ai/tutor";
import { requireApiUser } from "@/modules/auth/session";

const NO_STORE = { "Cache-Control": "no-store" };

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requireApiUser();
  const input = await parseJson(req, askTutorSchema);
  const result = await askTutor(user, input);
  switch (result.status) {
    case "rate_limited":
      return NextResponse.json(result, {
        status: 429,
        headers: {
          ...NO_STORE,
          "Retry-After": String(Math.max(1, Math.ceil(result.retryAfterSeconds))),
        },
      });
    case "error":
      return NextResponse.json(result, { status: 503, headers: NO_STORE });
    default:
      return NextResponse.json(result, { headers: NO_STORE });
  }
});
