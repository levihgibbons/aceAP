/**
 * POST /api/lti/deep-link — submit of the /lti/deep-link activity picker.
 *
 * Same-origin form post from the picker (session cookie is sent). Re-checks
 * everything: the signed deep-link session token, that the signed-in staff
 * user is the AceAP account linked to the launching LMS user, and that every
 * chosen assignment is theirs in the connection's organisation. Then returns
 * an auto-submitting page that POSTs the signed LtiDeepLinkingResponse JWT to
 * the platform's deep_link_return_url (with its own strict CSP).
 */
import { getCurrentUser } from "@/modules/auth/session";
import { buildPickerResponse, verifyDeepLinkSession } from "@/modules/integrations/lms/deepLinkFlow";
import { renderDeepLinkingPage } from "@/modules/integrations/lms/lti/deepLinking";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function back(token: string, error: string): Response {
  const location = `/lti/deep-link?token=${encodeURIComponent(token)}&error=${encodeURIComponent(error)}`;
  return new Response(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store" } });
}

function plain(status: number, message: string): Response {
  return new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

/** CSRF: the picker is our own page, so the Origin (or Referer) must be our origin. */
function sameOrigin(request: Request): boolean {
  const own = new Set([new URL(request.url).origin]);
  const base = process.env.APP_BASE_URL?.trim();
  if (base) {
    try {
      own.add(new URL(base).origin);
    } catch {
      /* ignore a malformed APP_BASE_URL */
    }
  }
  const origin = request.headers.get("origin");
  if (origin) return own.has(origin);
  const referer = request.headers.get("referer");
  if (!referer) return false;
  try {
    return own.has(new URL(referer).origin);
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return plain(403, "This form must be submitted from the AceAP activity picker.");
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return plain(400, "The form could not be read.");
  }
  const token = String(form.get("token") ?? "");
  const session = token ? verifyDeepLinkSession(token) : null;
  if (!session) return back(token, "expired");
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 303, headers: { Location: `/login?next=${encodeURIComponent(`/lti/deep-link?token=${token}`)}` } });

  const cancel = form.get("intent") === "cancel";
  const ids = cancel ? [] : form.getAll("assignmentId").map(String).filter((id) => UUID.test(id));
  if (!cancel && ids.length === 0) return back(token, "no_selection");

  const result = await buildPickerResponse(user, session, ids);
  if (!result.ok) {
    if (result.error.code === "bad_request") return back(token, "single");
    if (result.error.code === "permission_denied") return back(token, "forbidden");
    return back(token, "failed");
  }
  const { html, csp } = renderDeepLinkingPage(result.value.response, { itemCount: result.value.itemCount });
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": csp, "Referrer-Policy": "no-referrer" } });
}
