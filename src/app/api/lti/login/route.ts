/**
 * GET|POST /api/lti/login — LTI 1.3 third-party-initiated login (OIDC).
 *
 * The LMS calls this with `iss`, `login_hint`, `target_link_uri` (and usually
 * `client_id`, `lti_message_hint`, `lti_deployment_id`). We answer with a 302
 * to the platform's authorization endpoint, or a clear 400 JSON error when the
 * issuer/client is not a configured connection.
 *
 * Starting a login proves nothing about the connection: it only becomes a
 * launch once the platform posts a valid id_token to the launch endpoint.
 */
import { getToolKeyStatus } from "@/modules/integrations/lms/lti/keys";
import { buildLoginRedirect, DEFAULT_STATE_TTL_SECONDS, parseLoginInitiation, stateCookieName, toolEndpoints } from "@/modules/integrations/lms/lti/oidc";
import { findConnectionsForIssuer } from "@/modules/integrations/lms/service";

function errorResponse(status: number, error: string, message: string): Response {
  return Response.json({ error, message }, { status, headers: { "cache-control": "no-store" } });
}

async function readParams(request: Request): Promise<URLSearchParams> {
  const params = new URLSearchParams(new URL(request.url).search);
  if (request.method === "POST") {
    const form = await request.formData();
    for (const [key, value] of form.entries()) if (typeof value === "string") params.set(key, value);
  }
  return params;
}

async function handle(request: Request): Promise<Response> {
  let params: URLSearchParams;
  try {
    params = await readParams(request);
  } catch {
    return errorResponse(400, "bad_request", "The login request body could not be read.");
  }
  const parsed = parseLoginInitiation(params);
  if (!parsed.ok) return errorResponse(400, parsed.error.code, parsed.error.message);

  const baseUrl = process.env.APP_BASE_URL?.trim() || new URL(request.url).origin;
  let connections;
  try {
    connections = await findConnectionsForIssuer(parsed.value.issuer, parsed.value.clientId);
  } catch {
    return errorResponse(500, "server_error", "The LMS connection could not be looked up.");
  }

  const redirect = buildLoginRedirect({
    request: parsed.value,
    connections,
    redirectUri: toolEndpoints(baseUrl).launchUrl,
    toolBaseUrl: baseUrl,
  });
  if (!redirect.ok) {
    // A known connection but no tool key is a server-side configuration gap, not a bad request.
    const keyMissing = redirect.error.code === "not_configured" && connections.length > 0 && !getToolKeyStatus().configured;
    return errorResponse(keyMissing ? 503 : 400, redirect.error.code, redirect.error.message);
  }

  const headers = new Headers({ location: redirect.value.redirectUrl, "cache-control": "no-store" });
  // Best-effort browser binding of the state. Embedded (iframe) launches may
  // have third-party cookies blocked, so the launch route must not rely on it alone.
  headers.append("set-cookie", `${stateCookieName(redirect.value.state)}=1; Path=/api/lti; Max-Age=${DEFAULT_STATE_TTL_SECONDS}; HttpOnly; Secure; SameSite=None`);
  return new Response(null, { status: 302, headers });
}

export function GET(request: Request): Promise<Response> {
  return handle(request);
}

export function POST(request: Request): Promise<Response> {
  return handle(request);
}
