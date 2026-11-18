/**
 * OAuth2 access tokens for LTI Advantage services (AGS, NRPS).
 *
 * Client-credentials grant authenticated with a signed JWT client assertion
 * (RFC 7523, `private_key_jwt`), as required by the 1EdTech Security Framework
 * and Canvas (`POST /login/oauth2/token`).
 *
 * Also hosts the small HTTP helpers shared by the service clients: every
 * platform response is mapped onto the typed `LmsError` codes here.
 */
import { randomUUID } from "node:crypto";
import type { JWTPayload } from "jose";
import { fail, ok, systemClock, type AccessToken, type Clock, type FetchLike, type LmsConnectionConfig, type LmsError, type LmsResult } from "../types";
import { guardOutbound, type HostResolver } from "./dnsGuard";
import { signToolJwt } from "./keys";
import { checkLmsUrl, type UrlPolicy } from "./urlPolicy";

export const CLIENT_ASSERTION_TYPE = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer";
const CLIENT_ASSERTION_TTL_SECONDS = 300;
/** Stop using a cached token this long before it expires. */
const EXPIRY_MARGIN_MS = 30_000;
const DEFAULT_TIMEOUT_MS = 15_000;
const SNIPPET_LENGTH = 200;

export type SignJwt = (claims: JWTPayload, options: { expiresInSeconds: number; now?: Clock }) => Promise<LmsResult<string>>;

export interface HttpDeps {
  fetch?: FetchLike;
  now?: Clock;
  timeoutMs?: number;
  /** Outbound URL allow-list; defaults to `urlPolicyFromEnv()` read at call time. */
  urlPolicy?: UrlPolicy;
  /**
   * DNS resolver for the rebinding check (dnsGuard.ts); defaults to
   * `dns.lookup`. Tests inject one to simulate what a hostname resolves to.
   */
  resolveHost?: HostResolver;
}

// ─────────────────────────────── HTTP helpers ───────────────────────────────

/**
 * Service URLs must pass the LMS URL policy (https, allow-listed host, no
 * private IP literals; localhost only outside production). See urlPolicy.ts.
 */
export function isAllowedServiceUrl(value: string, policy?: UrlPolicy): boolean {
  return checkLmsUrl(value, policy).ok;
}

/** A short, single-line excerpt of a platform error body for staff-facing diagnostics. */
export async function bodySnippet(response: Response): Promise<string> {
  try {
    const text = (await response.text()).replace(/\s+/g, " ").trim();
    return text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text;
  } catch {
    return "";
  }
}

/** Map a non-2xx platform status onto a typed error. */
export function errorFromStatus(status: number, what: string, snippet = ""): { ok: false; error: LmsError } {
  const detail = snippet ? ` — ${snippet}` : "";
  // Canvas has historically answered throttled requests with 403 "Rate Limit Exceeded".
  const throttled = status === 429 || (status === 403 && /rate limit exceeded/i.test(snippet));
  if (throttled) return fail("platform_error", `${what} was throttled by the platform (HTTP ${status}).`, { status });
  if (status === 401 || status === 403) return fail("permission_denied", `${what} was refused by the platform (HTTP ${status})${detail}`, { status });
  // Redirects are never followed (SSRF: a redirect could leave the allow-list).
  if (status >= 300 && status < 400) return fail("bad_request", `${what} was redirected by the platform (HTTP ${status}); redirects are not followed.`, { status });
  if (status >= 500) return fail("platform_error", `${what} failed on the platform (HTTP ${status})${detail}`, { status });
  if (status >= 400) return fail("bad_request", `${what} was rejected by the platform (HTTP ${status})${detail}`, { status });
  return fail("platform_error", `${what} returned an unexpected HTTP ${status}.`, { status });
}

/** `fetch` that never throws: network failures and timeouts become `platform_error`. */
export async function safeFetch(deps: HttpDeps, url: string, init: RequestInit, what: string): Promise<LmsResult<Response>> {
  // Enforced before EVERY outbound request (token, JWKS, AGS, NRPS).
  const allowed = checkLmsUrl(url, deps.urlPolicy);
  if (!allowed.ok) return fail("bad_request", `${what}: the URL ${allowed.reason}`);
  // DNS-rebinding defence: resolve, refuse non-public addresses, pin the socket to the checked address.
  const transport = await guardOutbound(allowed.url, deps, what);
  if (!transport.ok) return transport;
  const fetchImpl: FetchLike = transport.value;
  try {
    return ok(await fetchImpl(url, { ...init, redirect: "manual", signal: AbortSignal.timeout(deps.timeoutMs ?? DEFAULT_TIMEOUT_MS) }));
  } catch (cause) {
    const name = cause instanceof Error ? cause.name : "Error";
    const kind = name === "TimeoutError" || name === "AbortError" ? "timed out" : "could not reach the platform";
    return fail("platform_error", `${what} ${kind}.`);
  }
}

// ──────────────────────────────── Token client ──────────────────────────────

export interface TokenClientDeps extends HttpDeps {
  signJwt?: SignJwt;
  randomId?: () => string;
}

interface TokenResponse {
  access_token?: unknown;
  token_type?: unknown;
  expires_in?: unknown;
  scope?: unknown;
  error?: unknown;
}

const OAUTH_PERMISSION_ERRORS = new Set(["invalid_client", "unauthorized_client", "invalid_scope", "access_denied"]);

function cacheKey(connection: LmsConnectionConfig, scopes: string[]): string {
  return `${connection.id}|${[...new Set(scopes)].sort().join(" ")}`;
}

function parseJson(text: string): TokenResponse | null {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null ? (value as TokenResponse) : null;
  } catch {
    return null;
  }
}

export class AccessTokenClient {
  private readonly cache = new Map<string, AccessToken>();
  private readonly now: Clock;
  private readonly signJwt: SignJwt;
  private readonly randomId: () => string;

  constructor(private readonly deps: TokenClientDeps = {}) {
    this.now = deps.now ?? systemClock;
    this.signJwt = deps.signJwt ?? signToolJwt;
    this.randomId = deps.randomId ?? randomUUID;
  }

  /** Forget a cached token (e.g. after the platform answered 401). */
  invalidate(connection: LmsConnectionConfig, scopes: string[]): void {
    this.cache.delete(cacheKey(connection, scopes));
  }

  /**
   * A token covering `scopes`, from the cache when still valid. Fails with
   * `permission_denied` when the platform does not grant every requested scope.
   */
  async getToken(connection: LmsConnectionConfig, scopes: string[], options: { forceRefresh?: boolean } = {}): Promise<LmsResult<AccessToken>> {
    if (scopes.length === 0) return fail("bad_request", "At least one scope is required.");
    const key = cacheKey(connection, scopes);
    const cached = this.cache.get(key);
    if (cached && !options.forceRefresh && cached.expiresAt.getTime() - EXPIRY_MARGIN_MS > this.now().getTime()) return ok(cached);
    this.cache.delete(key);

    const assertion = await this.signJwt(
      { iss: connection.clientId, sub: connection.clientId, aud: connection.authTokenUrl, jti: this.randomId() },
      { expiresInSeconds: CLIENT_ASSERTION_TTL_SECONDS, now: this.now },
    );
    if (!assertion.ok) return assertion;

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_assertion_type: CLIENT_ASSERTION_TYPE,
      client_assertion: assertion.value,
      scope: [...new Set(scopes)].join(" "),
    });
    const response = await safeFetch(
      this.deps,
      connection.authTokenUrl,
      { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" }, body: body.toString() },
      "Access token request",
    );
    if (!response.ok) return response;

    const text = await response.value.text().catch(() => "");
    const json = parseJson(text);
    const status = response.value.status;
    if (status < 200 || status >= 300) {
      const oauthError = typeof json?.error === "string" ? json.error : "";
      if (OAUTH_PERMISSION_ERRORS.has(oauthError)) {
        return fail("permission_denied", `Access token request was refused by the platform (${oauthError}, HTTP ${status}).`, { status });
      }
      return errorFromStatus(status, "Access token request", oauthError);
    }
    if (!json || typeof json.access_token !== "string" || json.access_token === "") {
      return fail("platform_error", "Access token response did not contain an access token.", { status });
    }

    // RFC 6749 §5.1: an omitted `scope` means "as requested".
    const granted = typeof json.scope === "string" ? json.scope.split(/\s+/).filter(Boolean) : [...scopes];
    const missing = scopes.filter((scope) => !granted.includes(scope));
    if (missing.length > 0) {
      return fail("permission_denied", `The platform did not grant the required scope(s): ${missing.join(", ")}. Enable them on the LTI key.`, { status });
    }

    const expiresIn = typeof json.expires_in === "number" && json.expires_in > 0 ? json.expires_in : 0;
    const token: AccessToken = { accessToken: json.access_token, scopes: granted, expiresAt: new Date(this.now().getTime() + expiresIn * 1000) };
    if (expiresIn > 0) this.cache.set(key, token);
    return ok(token);
  }

  /**
   * Perform an authorized service call. Resolves `ok` only for a 2xx response.
   * A 401 on a cached token triggers exactly one retry with a fresh token.
   */
  async authorizedFetch(connection: LmsConnectionConfig, scopes: string[], url: string, init: RequestInit, what: string): Promise<LmsResult<Response>> {
    for (const attempt of [0, 1]) {
      const token = await this.getToken(connection, scopes, { forceRefresh: attempt === 1 });
      if (!token.ok) return token;
      const headers = new Headers(init.headers);
      headers.set("authorization", `Bearer ${token.value.accessToken}`);
      const response = await safeFetch(this.deps, url, { ...init, headers }, what);
      if (!response.ok) return response;
      const status = response.value.status;
      if (status >= 200 && status < 300) return response;
      if (status === 401 && attempt === 0) {
        this.invalidate(connection, scopes);
        continue;
      }
      return errorFromStatus(status, what, await bodySnippet(response.value));
    }
    return fail("permission_denied", `${what} was refused by the platform (HTTP 401).`, { status: 401 });
  }
}
