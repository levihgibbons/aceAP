/**
 * POST /api/lti/launch — LTI 1.3 resource-link launch (OIDC step 3).
 *
 * Validates the platform's id_token (signature, issuer, audience, nonce,
 * deployment, version, message type). Nothing is created on failure.
 * On success, see src/modules/integrations/lms/launchFlow.ts for identity
 * handling. Deep-linking requests (src/modules/integrations/lms/deepLinkFlow.ts)
 * continue to the /lti/deep-link activity picker — directly for a linked
 * teacher, or through the /lti/link confirmation for an unlinked LMS user.
 * Responses are full HTML pages because this is a browser form POST.
 */
import { cookies } from "next/headers";
import { frameAncestors } from "@/lib/csp";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { createCanvasAdapter } from "@/modules/integrations/lms/canvasAdapter";
import { parseLaunchForm } from "@/modules/integrations/lms/lti/launch";
import { findConnectionsForIssuer, getLinkedUserId } from "@/modules/integrations/lms/service";
import { deepLinkPickerPath, destinationFor, maybeMapAssignment, pendingFromLaunch, signPendingLink } from "@/modules/integrations/lms/launchFlow";
import { deepLinkSessionFromLaunch, signDeepLinkSession } from "@/modules/integrations/lms/deepLinkFlow";
import { getToolKeyStatus } from "@/modules/integrations/lms/lti/keys";
import { checkLmsUrl } from "@/modules/integrations/lms/lti/urlPolicy";
import { createSession } from "@/modules/auth/service";
import { SESSION_COOKIE } from "@/modules/auth/session";

const adapter = createCanvasAdapter();

const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);

function page(status: number, title: string, body: string): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · AceAP</title>
<style>:root{color-scheme:light dark}body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.6 system-ui,sans-serif;background:#f6f5f1;color:#1c1b18}@media (prefers-color-scheme:dark){body{background:#121315;color:#edecea}}main{max-width:32rem;padding:2rem}h1{font-size:1.4rem;margin:0 0 .5rem}</style>
</head><body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p></main></body></html>`;
  // Static page, inline style only; may be shown inside the LMS iframe (see src/lib/csp.ts).
  const csp = `default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors ${frameAncestors("/api/lti/launch").join(" ")}`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": csp } });
}

export async function POST(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return page(400, "Launch couldn't be read", "AceAP couldn't read the launch from your LMS. Please start again from the LMS.");
  }
  const parsed = parseLaunchForm(form);
  if (!parsed.ok) return page(400, "Launch failed", parsed.error.message);

  const launch = await adapter.validateLaunch({ idToken: parsed.value.idToken, state: parsed.value.state, connections: findConnectionsForIssuer });
  if (!launch.ok) return page(401, "Launch failed", launch.error.message);
  const ctx = launch.value;

  let deepLinkToken: string | null = null;
  if (ctx.messageType === "LtiDeepLinkingRequest") {
    // The response must be signed with the tool key; say so now rather than after the teacher picked.
    if (!getToolKeyStatus().configured)
      return page(503, "AceAP can't answer this request yet", "The launch was valid, but AceAP's LTI signing key isn't configured on the server, so it can't send activities back to your LMS. Ask your AceAP administrator to set it up.");
    const session = deepLinkSessionFromLaunch(ctx);
    if (!session) return page(400, "Anonymous launch", "This request didn't identify a user, so AceAP can't show your classes.");
    const returnUrl = checkLmsUrl(session.settings.deepLinkReturnUrl);
    if (!returnUrl.ok) return page(400, "Launch failed", `The LMS return address ${returnUrl.reason}`);
    deepLinkToken = signDeepLinkSession(session);
  }

  const pending = pendingFromLaunch(ctx);
  if (!pending) return page(400, "Anonymous launch", "This launch didn't identify a user, so AceAP can't open a personal workspace.");
  if (deepLinkToken) pending.deepLinkToken = deepLinkToken;

  const linkedUserId = await getLinkedUserId(ctx.connectionId, pending.userSub);
  if (linkedUserId) {
    const db = await getDb();
    const [user] = await db.select({ id: t.users.id, role: t.users.role, deletedAt: t.users.deletedAt }).from(t.users).where(eq(t.users.id, linkedUserId));
    if (!user || user.deletedAt) return page(403, "Account unavailable", "The AceAP account linked to your LMS account is no longer active.");
    if (deepLinkToken && user.role === "student")
      return page(403, "Only teachers can add AceAP activities", "Your LMS account is linked to an AceAP student account. Choosing activities for a course needs a teacher account.");
    if (!deepLinkToken) await maybeMapAssignment(user.id, pending);
    const { token, expiresAt } = await createSession(user.id);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" && process.env.ACEAP_INSECURE_COOKIES !== "1",
      path: "/",
      expires: expiresAt,
    });
    // 303 so the browser follows with a top-level GET.
    const location = deepLinkToken ? deepLinkPickerPath(deepLinkToken) : await destinationFor(user.id, user.role, pending);
    return new Response(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store" } });
  }

  return new Response(null, { status: 303, headers: { Location: `/lti/link?token=${encodeURIComponent(signPendingLink(pending))}`, "Cache-Control": "no-store" } });
}
