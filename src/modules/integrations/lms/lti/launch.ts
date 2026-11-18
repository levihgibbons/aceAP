/**
 * LTI 1.3 launch validation (OpenID Connect, steps 3 and 4).
 *
 * The platform posts `id_token` + `state` to our redirect URI. A launch is
 * accepted only when ALL of the following hold:
 *   1. the state token is ours (HMAC) and not expired;
 *   2. the id_token is signed by a key in the platform's JWKS (RS256);
 *   3. `iss` is the issuer the login was started for;
 *   4. `aud` contains our client id (and `azp` equals it when there are
 *      several audiences);
 *   5. `exp`/`iat` are sane, with a small clock tolerance;
 *   6. `nonce` equals the nonce in the state token and has not been used;
 *   7. the deployment id belongs to a configured connection;
 *   8. LTI version is 1.3.0, the message type is supported and its required
 *      claims are present.
 *
 * This module is framework-free. A route handler needs only:
 * `parseLaunchForm`, `validateLaunch`, `defaultNonceStore`, `createPlatformKeySource`
 * and the role helpers.
 */
import { createLocalJWKSet, decodeJwt, errors, jwtVerify, type JSONWebKeySet, type JWTPayload } from "jose";
import {
  fail,
  ok,
  resolveConnections,
  systemClock,
  type AgsEndpointClaim,
  type Clock,
  type ConnectionSource,
  type DeepLinkingSettings,
  type InvalidTokenReason,
  type LaunchContext,
  type LmsConnectionConfig,
  type LmsError,
  type LmsResult,
  type LtiMessageType,
  type NrpsEndpointClaim,
  type PlatformKeyCheck,
} from "../types";
import { constantTimeEqual, resolveStateSecret, verifyStateToken, type StateSecret } from "./oidc";
import { bodySnippet, errorFromStatus, safeFetch, type HttpDeps } from "./token";

// ───────────────────────────────── Claim names ──────────────────────────────

const LTI = "https://purl.imsglobal.org/spec/lti/claim";
export const CLAIM = {
  messageType: `${LTI}/message_type`,
  version: `${LTI}/version`,
  deploymentId: `${LTI}/deployment_id`,
  targetLinkUri: `${LTI}/target_link_uri`,
  resourceLink: `${LTI}/resource_link`,
  roles: `${LTI}/roles`,
  context: `${LTI}/context`,
  custom: `${LTI}/custom`,
  agsEndpoint: "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint",
  nrpsService: "https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice",
  deepLinkingSettings: "https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings",
} as const;

export const LTI_VERSION = "1.3.0";
export const DEFAULT_CLOCK_TOLERANCE_SECONDS = 60;
const SUPPORTED_MESSAGE_TYPES: readonly LtiMessageType[] = ["LtiResourceLinkRequest", "LtiDeepLinkingRequest"];

// ───────────────────────────────── Nonce store ──────────────────────────────

/** Records nonces so each id_token can be used once. */
export interface NonceStore {
  /** Returns true the first time `nonce` is seen; false on any replay before `expiresAt`. */
  consume(nonce: string, expiresAt: Date): Promise<boolean>;
}

/**
 * Process-local nonce store with TTL. Sufficient for a single server process;
 * a multi-instance deployment needs a shared store behind the same interface.
 */
export class InMemoryNonceStore implements NonceStore {
  private readonly seen = new Map<string, number>();

  constructor(private readonly now: Clock = systemClock) {}

  async consume(nonce: string, expiresAt: Date): Promise<boolean> {
    const nowMs = this.now().getTime();
    for (const [key, expiry] of this.seen) if (expiry <= nowMs) this.seen.delete(key);
    if (this.seen.has(nonce)) return false;
    this.seen.set(nonce, expiresAt.getTime());
    return true;
  }

  get size(): number {
    return this.seen.size;
  }
}

/**
 * Nonce store in PostgreSQL (`lti_nonces`): one atomic upsert per launch, so a
 * replay is refused whichever serverless instance receives it. An expired row
 * may be taken over by the same nonce again (it can no longer be replayed:
 * the id_token itself has expired by then).
 */
export class DatabaseNonceStore implements NonceStore {
  constructor(private readonly now: Clock = systemClock) {}

  async consume(nonce: string, expiresAt: Date): Promise<boolean> {
    const { getDb } = await import("@/db/client");
    const { sql } = await import("drizzle-orm");
    const db = await getDb();
    const nowIso = this.now().toISOString();
    const result = (await db.execute(sql`
      insert into lti_nonces (nonce, expires_at) values (${nonce}, ${expiresAt.toISOString()}::timestamptz)
      on conflict (nonce) do update set expires_at = excluded.expires_at
        where lti_nonces.expires_at <= ${nowIso}::timestamptz
      returning nonce`)) as unknown as { rows: unknown[] };
    if (Math.random() < 0.02) await db.execute(sql`delete from lti_nonces where expires_at <= ${nowIso}::timestamptz`).catch(() => {});
    return result.rows.length === 1;
  }
}

const memoryNonceStore = new InMemoryNonceStore();
const databaseNonceStore = new DatabaseNonceStore();

/**
 * Default for all launches: the shared database store whenever a database
 * server is configured (DATABASE_URL — staging/production, many instances),
 * the process-local store for the embedded single-process database.
 */
export const defaultNonceStore: NonceStore = {
  consume: (nonce, expiresAt) => (process.env.DATABASE_URL?.trim() ? databaseNonceStore : memoryNonceStore).consume(nonce, expiresAt),
};

// ─────────────────────────────── Platform keys ──────────────────────────────

export interface PlatformKeySource {
  getKeySet(jwksUrl: string, options?: { forceRefresh?: boolean }): Promise<LmsResult<JSONWebKeySet>>;
}

function isKeySet(value: unknown): value is JSONWebKeySet {
  if (typeof value !== "object" || value === null) return false;
  const keys = (value as { keys?: unknown }).keys;
  return Array.isArray(keys) && keys.every((k) => typeof k === "object" && k !== null && typeof (k as { kty?: unknown }).kty === "string");
}

/** Fetch and parse a platform JWKS. Used for launches and for connection diagnostics. */
export async function fetchPlatformJwks(deps: HttpDeps, jwksUrl: string): Promise<LmsResult<JSONWebKeySet>> {
  const response = await safeFetch(deps, jwksUrl, { method: "GET", headers: { accept: "application/json" } }, "Platform JWKS request");
  if (!response.ok) return response;
  const status = response.value.status;
  if (status < 200 || status >= 300) return errorFromStatus(status, "Platform JWKS request", await bodySnippet(response.value));
  let json: unknown;
  try {
    json = await response.value.json();
  } catch {
    return fail("platform_error", "Platform JWKS response was not valid JSON.", { status });
  }
  if (!isKeySet(json)) return fail("platform_error", "Platform JWKS response is not a JSON Web Key Set.", { status });
  if (json.keys.length === 0) return fail("platform_error", "Platform JWKS contains no keys.", { status });
  return ok(json);
}

/** For diagnostics: can the platform's keys be fetched and parsed? */
export async function checkPlatformKeys(deps: HttpDeps, connection: LmsConnectionConfig): Promise<LmsResult<PlatformKeyCheck>> {
  const keys = await fetchPlatformJwks(deps, connection.jwksUrl);
  return keys.ok ? ok({ keyCount: keys.value.keys.length }) : keys;
}

/** JWKS source with a small TTL cache (platform keys rotate; unknown `kid`s force a refetch). */
export function createPlatformKeySource(deps: HttpDeps & { cacheTtlMs?: number } = {}): PlatformKeySource {
  const ttl = deps.cacheTtlMs ?? 10 * 60_000;
  const now = deps.now ?? systemClock;
  const cache = new Map<string, { keys: JSONWebKeySet; fetchedAt: number }>();
  return {
    async getKeySet(jwksUrl, options = {}) {
      const hit = cache.get(jwksUrl);
      if (hit && !options.forceRefresh && now().getTime() - hit.fetchedAt < ttl) return ok(hit.keys);
      const fetched = await fetchPlatformJwks(deps, jwksUrl);
      if (fetched.ok) cache.set(jwksUrl, { keys: fetched.value, fetchedAt: now().getTime() });
      return fetched;
    },
  };
}

// ──────────────────────────────── Form parsing ──────────────────────────────

type ParamSource = URLSearchParams | FormData | Record<string, string | null | undefined>;

function readParam(source: ParamSource, name: string): string | null {
  const raw = source instanceof URLSearchParams || source instanceof FormData ? source.get(name) : source[name];
  return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
}

/** Extract `id_token` and `state` from the platform's form POST. */
export function parseLaunchForm(source: ParamSource): LmsResult<{ idToken: string; state: string }> {
  const error = readParam(source, "error");
  if (error) {
    // OIDC error response (e.g. `login_required`); the description is platform-authored text.
    return fail("invalid_token", `The LMS did not authenticate the launch (${error.slice(0, 80)}).`, { reason: "malformed" });
  }
  const idToken = readParam(source, "id_token");
  const state = readParam(source, "state");
  if (!idToken || !state) return fail("invalid_token", "Launch is missing id_token or state.", { reason: "malformed" });
  return ok({ idToken, state });
}

// ───────────────────────────────── Validation ───────────────────────────────

export interface ValidateLaunchInput {
  idToken: string;
  state: string;
  connections: ConnectionSource;
  keys: PlatformKeySource;
  nonceStore: NonceStore;
  secret?: StateSecret | null;
  now?: Clock;
  clockToleranceSeconds?: number;
}

function invalid(reason: InvalidTokenReason, message: string): { ok: false; error: LmsError } {
  return fail("invalid_token", message, { reason });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function mapVerifyError(cause: unknown): { ok: false; error: LmsError } {
  if (cause instanceof errors.JWTExpired) return invalid("expired", "The launch token has expired.");
  if (cause instanceof errors.JWTClaimValidationFailed) {
    if (cause.claim === "iss") return invalid("wrong_issuer", "The launch token was issued by an unexpected platform.");
    if (cause.claim === "aud") return invalid("wrong_audience", "The launch token is not addressed to this tool.");
    if (cause.claim === "iat") return invalid("issued_in_future", "The launch token has an invalid issue time.");
    return invalid("missing_claim", `The launch token has a missing or invalid "${cause.claim}" claim.`);
  }
  if (cause instanceof errors.JWSSignatureVerificationFailed || cause instanceof errors.JWKSNoMatchingKey || cause instanceof errors.JOSEAlgNotAllowed) {
    return invalid("bad_signature", "The launch token signature could not be verified against the platform's keys.");
  }
  return invalid("malformed", "The launch token is malformed.");
}

async function verifySignature(
  input: ValidateLaunchInput,
  jwksUrl: string,
  expected: { issuer: string; clientId: string },
): Promise<LmsResult<JWTPayload>> {
  const options = {
    issuer: expected.issuer,
    audience: expected.clientId,
    algorithms: ["RS256"],
    clockTolerance: input.clockToleranceSeconds ?? DEFAULT_CLOCK_TOLERANCE_SECONDS,
    currentDate: (input.now ?? systemClock)(),
    requiredClaims: ["exp", "iat"],
  };
  for (const forceRefresh of [false, true]) {
    const keySet = await input.keys.getKeySet(jwksUrl, { forceRefresh });
    if (!keySet.ok) return keySet;
    try {
      const { payload } = await jwtVerify(input.idToken, createLocalJWKSet(keySet.value), options);
      return ok(payload);
    } catch (cause) {
      // An unknown `kid` may mean the platform rotated keys: refetch once.
      if (cause instanceof errors.JWKSNoMatchingKey && !forceRefresh) continue;
      return mapVerifyError(cause);
    }
  }
  return invalid("bad_signature", "The launch token signature could not be verified against the platform's keys.");
}

function parseAgs(value: unknown): AgsEndpointClaim | null {
  const claim = asRecord(value);
  if (!claim) return null;
  return { scopes: asStringArray(claim.scope), lineItemsUrl: asString(claim.lineitems), lineItemUrl: asString(claim.lineitem) };
}

function parseNrps(value: unknown): NrpsEndpointClaim | null {
  const claim = asRecord(value);
  const url = asString(claim?.context_memberships_url);
  return claim && url ? { contextMembershipsUrl: url, serviceVersions: asStringArray(claim.service_versions) } : null;
}

function parseDeepLinking(value: unknown): DeepLinkingSettings | null {
  const claim = asRecord(value);
  const returnUrl = asString(claim?.deep_link_return_url);
  if (!claim || !returnUrl) return null;
  return {
    deepLinkReturnUrl: returnUrl,
    acceptTypes: asStringArray(claim.accept_types),
    acceptPresentationDocumentTargets: asStringArray(claim.accept_presentation_document_targets),
    acceptMultiple: claim.accept_multiple === true,
    acceptLineItem: claim.accept_lineitem === true,
    autoCreate: claim.auto_create === true,
    data: asString(claim.data),
    title: asString(claim.title),
    text: asString(claim.text),
  };
}

function parseCustom(value: unknown): Record<string, string> {
  const claim = asRecord(value) ?? {};
  return Object.fromEntries(Object.entries(claim).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

/** Validate a launch end to end. See the checklist at the top of this file. */
export async function validateLaunch(input: ValidateLaunchInput): Promise<LmsResult<LaunchContext>> {
  const now = input.now ?? systemClock;
  const tolerance = input.clockToleranceSeconds ?? DEFAULT_CLOCK_TOLERANCE_SECONDS;

  // 1. State token.
  const secret = resolveStateSecret(input.secret);
  if (!secret.ok) return secret;
  const state = verifyStateToken(input.state, secret.value, now);
  if (!state.ok) return state;

  // Candidate connections for the issuer + client the login was started for.
  const candidates = await resolveConnections(input.connections, state.value.issuer, state.value.clientId);
  if (candidates.length === 0) return fail("not_configured", "No LMS connection is configured for this issuer and client id.");

  let unverified: JWTPayload;
  try {
    unverified = decodeJwt(input.idToken);
  } catch {
    return invalid("malformed", "The launch token is malformed.");
  }
  const claimedDeployment = asString(unverified[CLAIM.deploymentId]);
  const keyOwner = candidates.find((c) => c.deploymentId === claimedDeployment) ?? candidates[0];

  // 2–5. Signature, issuer, audience, expiry.
  const verified = await verifySignature(input, keyOwner.jwksUrl, { issuer: state.value.issuer, clientId: state.value.clientId });
  if (!verified.ok) return verified;
  const claims = verified.value;

  if (typeof claims.iat !== "number" || claims.iat > Math.floor(now().getTime() / 1000) + tolerance) {
    return invalid("issued_in_future", "The launch token has an invalid issue time.");
  }
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  const azp = claims.azp;
  if (audiences.length > 1 && azp === undefined) return invalid("wrong_audience", "The launch token has several audiences but no authorized party.");
  if (azp !== undefined && azp !== state.value.clientId) return invalid("wrong_audience", "The launch token names a different authorized party.");

  // 6a. Nonce must match the one bound to the state.
  const nonce = asString(claims.nonce);
  if (!nonce) return invalid("missing_claim", "The launch token has no nonce.");
  if (!constantTimeEqual(nonce, state.value.nonce)) return invalid("nonce_mismatch", "The launch token does not belong to this login attempt.");

  // 7. Deployment.
  const deploymentId = asString(claims[CLAIM.deploymentId]);
  if (!deploymentId) return invalid("missing_claim", "The launch token has no deployment id.");
  const connection = candidates.find((c) => c.deploymentId === deploymentId);
  if (!connection || (state.value.deploymentId !== null && state.value.deploymentId !== deploymentId)) {
    return invalid("unknown_deployment", "This deployment of the tool is not registered with AceAP.");
  }

  // 8. LTI message.
  if (claims[CLAIM.version] !== LTI_VERSION) return invalid("unsupported_version", `Only LTI version ${LTI_VERSION} is supported.`);
  const messageType = SUPPORTED_MESSAGE_TYPES.find((t) => t === claims[CLAIM.messageType]);
  if (!messageType) return invalid("unsupported_message_type", "This kind of LTI launch is not supported.");

  const targetLinkUri = asString(claims[CLAIM.targetLinkUri]);
  if (!targetLinkUri) return invalid("missing_claim", "The launch token has no target link URI.");
  if (targetLinkUri !== state.value.targetLinkUri) return invalid("target_link_uri_mismatch", "The launch target does not match the login request.");
  if (!Array.isArray(claims[CLAIM.roles])) return invalid("missing_claim", "The launch token has no roles claim.");

  const resourceLinkClaim = asRecord(claims[CLAIM.resourceLink]);
  const resourceLinkId = asString(resourceLinkClaim?.id);
  const deepLinking = parseDeepLinking(claims[CLAIM.deepLinkingSettings]);
  if (messageType === "LtiResourceLinkRequest" && !resourceLinkId) return invalid("missing_claim", "The launch token has no resource link id.");
  if (messageType === "LtiDeepLinkingRequest" && !deepLinking) return invalid("missing_claim", "The launch token has no deep linking settings.");

  // 6b. Single use. Done last so only otherwise-valid launches consume a nonce.
  const exp = typeof claims.exp === "number" ? claims.exp : state.value.exp;
  const expiresAt = new Date((Math.max(exp, state.value.exp) + tolerance) * 1000);
  const firstUse = await input.nonceStore.consume(`${state.value.issuer}|${nonce}`, expiresAt);
  if (!firstUse) return invalid("nonce_replayed", "This launch has already been used.");

  const contextClaim = asRecord(claims[CLAIM.context]);
  const contextId = asString(contextClaim?.id);
  return ok({
    connectionId: connection.id,
    organizationId: connection.organizationId,
    messageType,
    issuer: connection.issuer,
    clientId: connection.clientId,
    deploymentId,
    userSub: asString(claims.sub),
    roles: asStringArray(claims[CLAIM.roles]),
    userName: asString(claims.name),
    userEmail: asString(claims.email),
    context: contextId ? { id: contextId, title: asString(contextClaim?.title), label: asString(contextClaim?.label) } : null,
    resourceLink: resourceLinkId ? { id: resourceLinkId, title: asString(resourceLinkClaim?.title) } : null,
    targetLinkUri,
    custom: parseCustom(claims[CLAIM.custom]),
    ags: parseAgs(claims[CLAIM.agsEndpoint]),
    nrps: parseNrps(claims[CLAIM.nrpsService]),
    deepLinking,
  });
}

// ─────────────────────────────────── Roles ──────────────────────────────────

const MEMBERSHIP = "http://purl.imsglobal.org/vocab/lis/v2/membership";
export const ROLE = {
  instructor: `${MEMBERSHIP}#Instructor`,
  learner: `${MEMBERSHIP}#Learner`,
  contentDeveloper: `${MEMBERSHIP}#ContentDeveloper`,
  mentor: `${MEMBERSHIP}#Mentor`,
  contextAdministrator: `${MEMBERSHIP}#Administrator`,
  teachingAssistant: `${MEMBERSHIP}/Instructor#TeachingAssistant`,
  institutionAdministrator: "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator",
  systemAdministrator: "http://purl.imsglobal.org/vocab/lis/v2/system/person#Administrator",
} as const;

/** Full URI, or the deprecated short context-role name (e.g. "Instructor"). */
function hasContextRole(roles: readonly string[], uri: string): boolean {
  const short = uri.slice(uri.indexOf("#") + 1);
  return roles.some((role) => role === uri || role === short);
}

/** Principal Instructor role in the launch context. Sub-roles such as TeachingAssistant do not count. */
export function isInstructor(roles: readonly string[]): boolean {
  return hasContextRole(roles, ROLE.instructor);
}

export function isLearner(roles: readonly string[]): boolean {
  return hasContextRole(roles, ROLE.learner);
}

export function isTeachingAssistant(roles: readonly string[]): boolean {
  return roles.includes(ROLE.teachingAssistant);
}

/** Context, institution or system administrator. */
export function isAdministrator(roles: readonly string[]): boolean {
  return hasContextRole(roles, ROLE.contextAdministrator) || roles.includes(ROLE.institutionAdministrator) || roles.includes(ROLE.systemAdministrator);
}
