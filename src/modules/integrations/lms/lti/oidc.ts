/**
 * LTI 1.3 third-party-initiated login (OpenID Connect, steps 1 and 2).
 *
 * The platform calls our login endpoint (GET or POST) with `iss`,
 * `login_hint`, `target_link_uri` and usually `client_id`,
 * `lti_message_hint` and `lti_deployment_id`. We answer with a browser
 * redirect to the platform's authorization endpoint carrying a fresh `state`
 * and `nonce`.
 *
 * The state is stateless: an HMAC-signed token that embeds the nonce, the
 * expected issuer/client and an expiry, so the launch can be validated without
 * a server-side session. Replay is prevented by the single-use nonce store in
 * `launch.ts`.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { fail, ok, systemClock, type Clock, type LmsConnectionConfig, type LmsResult, type LoginInitiationRequest, type LoginRedirect } from "../types";
import { deriveStateSecret } from "./keys";

export const STATE_TOKEN_VERSION = "v1";
export const DEFAULT_STATE_TTL_SECONDS = 600;
/** Path of the launch (redirect) endpoint, relative to APP_BASE_URL. */
export const LTI_LAUNCH_PATH = "/api/lti/launch";
export const LTI_LOGIN_PATH = "/api/lti/login";
export const LTI_JWKS_PATH = "/api/lti/jwks";

export type StateSecret = string | Uint8Array;

export interface StatePayload {
  nonce: string;
  issuer: string;
  clientId: string;
  /** Deployment hinted at login, when the platform sent one. */
  deploymentId: string | null;
  targetLinkUri: string;
  /** Expiry, seconds since the epoch. */
  exp: number;
}

type ParamSource = URLSearchParams | Record<string, string | null | undefined>;

function read(source: ParamSource, name: string): string | null {
  const value = source instanceof URLSearchParams ? source.get(name) : source[name];
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed === "" ? null : trimmed;
}

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Validate the platform's login-initiation parameters (query string or form body). */
export function parseLoginInitiation(source: ParamSource): LmsResult<LoginInitiationRequest> {
  const issuer = read(source, "iss");
  const loginHint = read(source, "login_hint");
  const targetLinkUri = read(source, "target_link_uri");
  const missing = [
    ["iss", issuer],
    ["login_hint", loginHint],
    ["target_link_uri", targetLinkUri],
  ]
    .filter(([, value]) => value === null)
    .map(([name]) => name);
  if (!issuer || !loginHint || !targetLinkUri) {
    return fail("bad_request", `Login initiation is missing required parameter(s): ${missing.join(", ")}.`);
  }
  if (!isAbsoluteHttpUrl(targetLinkUri)) return fail("bad_request", "target_link_uri must be an absolute http(s) URL.");
  return ok({
    issuer,
    loginHint,
    targetLinkUri,
    clientId: read(source, "client_id"),
    ltiMessageHint: read(source, "lti_message_hint"),
    // The LTI spec names it `lti_deployment_id`; Canvas documents `deployment_id`.
    ltiDeploymentId: read(source, "lti_deployment_id") ?? read(source, "deployment_id"),
  });
}

// ─────────────────────────────── State tokens ───────────────────────────────

function sign(body: string, secret: StateSecret): Buffer {
  return createHmac("sha256", secret).update(`${STATE_TOKEN_VERSION}.${body}`).digest();
}

/** Constant-time string comparison (hash first so lengths never leak or throw). */
export function constantTimeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function createStateToken(payload: StatePayload, secret: StateSecret): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${STATE_TOKEN_VERSION}.${body}.${sign(body, secret).toString("base64url")}`;
}

function isStatePayload(value: unknown): value is StatePayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.nonce === "string" &&
    typeof v.issuer === "string" &&
    typeof v.clientId === "string" &&
    (v.deploymentId === null || typeof v.deploymentId === "string") &&
    typeof v.targetLinkUri === "string" &&
    typeof v.exp === "number"
  );
}

/** Verify the HMAC (constant time) and expiry of a state token. */
export function verifyStateToken(token: string, secret: StateSecret, now: Clock = systemClock): LmsResult<StatePayload> {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== STATE_TOKEN_VERSION) return fail("invalid_token", "State token is malformed.", { reason: "invalid_state" });
  const [, body, signature] = parts;
  const expected = sign(body, secret);
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return fail("invalid_token", "State token signature is invalid.", { reason: "invalid_state" });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return fail("invalid_token", "State token is malformed.", { reason: "invalid_state" });
  }
  if (!isStatePayload(payload)) return fail("invalid_token", "State token is malformed.", { reason: "invalid_state" });
  if (payload.exp * 1000 <= now().getTime()) return fail("invalid_token", "State token has expired; start the launch again from the LMS.", { reason: "state_expired" });
  return ok(payload);
}

/** The injected secret if given, otherwise one derived from the tool key. */
export function resolveStateSecret(injected?: StateSecret | null): LmsResult<StateSecret> {
  if (injected && injected.length > 0) return ok(injected);
  const derived = deriveStateSecret();
  if (!derived) return fail("not_configured", "LTI tool key is not configured, so launches cannot be started.");
  return ok(derived);
}

/**
 * Name of the (optional) browser-binding cookie for a state value. The login
 * route sets it; the launch route should require it when the browser sent it
 * back. Embedded launches may have third-party cookies blocked.
 */
export function stateCookieName(state: string): string {
  return `aceap_lti_state_${createHash("sha256").update(state).digest("hex").slice(0, 16)}`;
}

// ────────────────────────────── Login redirect ──────────────────────────────

export interface BuildLoginRedirectInput {
  request: LoginInitiationRequest;
  /** Candidate connections; only those matching issuer (+ client id) are used. */
  connections: LmsConnectionConfig[];
  /** Our launch endpoint; must be registered as a redirect URI on the platform. */
  redirectUri: string;
  secret?: StateSecret | null;
  now?: Clock;
  stateTtlSeconds?: number;
  /** When set, `target_link_uri` must share this origin (prevents open redirects). */
  toolBaseUrl?: string;
  /** Source of randomness for the nonce (tests may inject). */
  randomId?: () => string;
}

function selectConnections(request: LoginInitiationRequest, connections: LmsConnectionConfig[]): LmsResult<LmsConnectionConfig[]> {
  const byIssuer = connections.filter((c) => c.issuer === request.issuer);
  const matches = request.clientId ? byIssuer.filter((c) => c.clientId === request.clientId) : byIssuer;
  if (matches.length === 0) {
    return fail("not_configured", "No LMS connection is configured for this issuer and client id. An administrator must add the connection in AceAP first.");
  }
  if (new Set(matches.map((c) => c.clientId)).size > 1) {
    return fail("bad_request", "client_id is required because several connections share this issuer.");
  }
  if (request.ltiDeploymentId && !matches.some((c) => c.deploymentId === request.ltiDeploymentId)) {
    return fail("not_configured", "The deployment id of this launch is not registered with AceAP.");
  }
  return ok(matches);
}

function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

/** Build the authorization redirect for a validated login-initiation request. */
export function buildLoginRedirect(input: BuildLoginRedirectInput): LmsResult<LoginRedirect> {
  const { request } = input;
  const selected = selectConnections(request, input.connections);
  if (!selected.ok) return selected;
  const connection = selected.value[0];

  if (input.toolBaseUrl && !sameOrigin(request.targetLinkUri, input.toolBaseUrl)) {
    return fail("bad_request", "target_link_uri does not point at this tool.");
  }
  const secret = resolveStateSecret(input.secret);
  if (!secret.ok) return secret;

  const now = (input.now ?? systemClock)();
  const nonce = (input.randomId ?? (() => randomBytes(24).toString("base64url")))();
  const state = createStateToken(
    {
      nonce,
      issuer: connection.issuer,
      clientId: connection.clientId,
      deploymentId: request.ltiDeploymentId,
      targetLinkUri: request.targetLinkUri,
      exp: Math.floor(now.getTime() / 1000) + (input.stateTtlSeconds ?? DEFAULT_STATE_TTL_SECONDS),
    },
    secret.value,
  );

  const url = new URL(connection.authLoginUrl);
  url.searchParams.set("scope", "openid");
  url.searchParams.set("response_type", "id_token");
  url.searchParams.set("response_mode", "form_post");
  url.searchParams.set("prompt", "none");
  url.searchParams.set("client_id", connection.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("login_hint", request.loginHint);
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  if (request.ltiMessageHint) url.searchParams.set("lti_message_hint", request.ltiMessageHint);

  return ok({ redirectUrl: url.toString(), state, nonce });
}

/** Absolute URLs of the tool's LTI endpoints for a given public base URL. */
export function toolEndpoints(baseUrl: string): { loginUrl: string; launchUrl: string; jwksUrl: string } {
  const base = baseUrl.replace(/\/+$/, "");
  return { loginUrl: `${base}${LTI_LOGIN_PATH}`, launchUrl: `${base}${LTI_LAUNCH_PATH}`, jwksUrl: `${base}${LTI_JWKS_PATH}` };
}
