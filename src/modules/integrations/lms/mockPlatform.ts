/**
 * ─────────────────────────────  TESTS ONLY  ─────────────────────────────────
 * An in-memory mock LTI 1.3 platform. It is NOT Canvas and proves nothing
 * about a real Canvas instance; it exists so the tool-side protocol code can
 * be unit-tested deterministically without network access or credentials.
 *
 * Never import this from application code (routes, services, UI). Anything
 * "verified" or "synced" against this mock is a test artefact, not a real
 * integration result.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * What it does:
 *  - generates its own RSA key and serves it as a JWKS;
 *  - plays the OIDC authorization endpoint and signs id_tokens for launches;
 *  - serves, through a `fetch` implementation:
 *      · the OAuth2 token endpoint (validates the client assertion signature
 *        against the tool's public JWKS, issuer/subject/audience and `jti`),
 *      · AGS line items and scores (records every accepted score; can be told
 *        to answer 401/403/500 or to withhold scopes),
 *      · paginated NRPS memberships (`Link: rel="next"`).
 */
import { randomUUID } from "node:crypto";
import { createLocalJWKSet, exportJWK, generateKeyPair, jwtVerify, SignJWT, type JSONWebKeySet, type JWK } from "jose";
import { systemClock, type Clock, type FetchLike, type LineItem, type ScorePayload } from "./types";

const LTI_CLAIM = "https://purl.imsglobal.org/spec/lti/claim";
const AGS_CLAIM = "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint";
const NRPS_CLAIM = "https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice";
const DL_CLAIM = "https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings";
const SCORE_SCOPE = "https://purl.imsglobal.org/spec/lti-ags/scope/score";
const LINEITEM_SCOPE = "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem";
const LINEITEM_READ_SCOPE = "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly";
const NRPS_SCOPE = "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly";
const SCORE_MEDIA = "application/vnd.ims.lis.v1.score+json";
const INSTRUCTOR = "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor";

type SigningKey = Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];

export interface MockPlatformOptions {
  issuer?: string;
  clientId?: string;
  deploymentId?: string;
  /** The tool's public keys, used to verify client assertions. */
  toolJwks: () => { keys: JWK[] };
  now?: Clock;
}

export interface MockMember {
  user_id: string;
  roles: string[];
  status?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
}

export interface MockLaunchOptions {
  nonce: string;
  targetLinkUri: string;
  messageType?: string;
  sub?: string | null;
  roles?: string[];
  courseId?: string;
  courseTitle?: string;
  resourceLinkId?: string;
  /** Adds the single-line-item URL to the AGS claim. */
  lineItemId?: string;
  custom?: Record<string, string>;
  deepLinkReturnUrl?: string;
  deepLinkData?: string;
  name?: string;
  email?: string;
}

export interface RecordedScore {
  courseId: string;
  lineItemId: string;
  lineItemUrl: string;
  score: ScorePayload;
}

export interface RecordedTokenRequest {
  requestedScopes: string[];
  grantedScopes: string[];
  assertionClaims: Record<string, unknown>;
  assertionHeader: Record<string, unknown>;
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

export class MockLtiPlatform {
  readonly issuer: string;
  readonly clientId: string;
  readonly deploymentId: string;
  readonly kid = "mock-platform-key-1";

  // ── Behaviour switches ──
  /** Scopes the token endpoint will grant; null grants whatever is requested. */
  grantableScopes: string[] | null = null;
  /** When set, the token endpoint answers with this status. */
  tokenFailureStatus: number | null = null;
  /** When set, the JWKS endpoint answers with this status. */
  jwksFailureStatus: number | null = null;
  tokenExpiresInSeconds = 3600;
  rosterPageSize = 50;

  // ── Recordings ──
  readonly receivedScores: RecordedScore[] = [];
  readonly tokenRequests: RecordedTokenRequest[] = [];
  readonly requests: { method: string; url: string }[] = [];

  private scoreFailure: { status: number; remaining: number } | null = null;
  private readonly now: Clock;
  private readonly toolJwks: () => { keys: JWK[] };
  private readonly issuedTokens = new Map<string, { scopes: string[]; expiresAt: number }>();
  private readonly usedJtis = new Set<string>();
  private readonly lineItems = new Map<string, Map<string, LineItem>>();
  private readonly members = new Map<string, MockMember[]>();
  private readonly lastScoreTimestamp = new Map<string, number>();
  private lineItemSeq = 0;

  private constructor(
    options: MockPlatformOptions,
    private readonly privateKey: SigningKey,
    private readonly rogueKey: SigningKey,
    private readonly publicJwk: JWK,
  ) {
    this.issuer = options.issuer ?? "https://mock-lms.example.test";
    this.clientId = options.clientId ?? "10000000000001";
    this.deploymentId = options.deploymentId ?? "1:mock-deployment";
    this.toolJwks = options.toolJwks;
    this.now = options.now ?? systemClock;
  }

  static async create(options: MockPlatformOptions): Promise<MockLtiPlatform> {
    const platform = await generateKeyPair("RS256", { extractable: true });
    const rogue = await generateKeyPair("RS256", { extractable: true });
    const publicJwk = await exportJWK(platform.publicKey);
    return new MockLtiPlatform(options, platform.privateKey, rogue.privateKey, publicJwk);
  }

  // ───────────────────────────────── Endpoints ───────────────────────────────

  get authLoginUrl(): string {
    return `${this.issuer}/api/lti/authorize_redirect`;
  }
  get authTokenUrl(): string {
    return `${this.issuer}/login/oauth2/token`;
  }
  get jwksUrl(): string {
    return `${this.issuer}/api/lti/security/jwks`;
  }
  lineItemsUrl(courseId: string): string {
    return `${this.issuer}/api/lti/courses/${courseId}/line_items`;
  }
  lineItemUrl(courseId: string, lineItemId: string): string {
    return `${this.lineItemsUrl(courseId)}/${lineItemId}`;
  }
  membershipsUrl(courseId: string): string {
    return `${this.issuer}/api/lti/courses/${courseId}/names_and_roles`;
  }

  /** Connection fields as an administrator would enter them. */
  connectionInput(): { platform: "canvas"; issuer: string; clientId: string; deploymentId: string; authLoginUrl: string; authTokenUrl: string; jwksUrl: string } {
    return {
      platform: "canvas",
      issuer: this.issuer,
      clientId: this.clientId,
      deploymentId: this.deploymentId,
      authLoginUrl: this.authLoginUrl,
      authTokenUrl: this.authTokenUrl,
      jwksUrl: this.jwksUrl,
    };
  }

  jwks(): JSONWebKeySet {
    return { keys: [{ ...this.publicJwk, kid: this.kid, alg: "RS256", use: "sig" }] };
  }

  // ───────────────────────────────── Test setup ──────────────────────────────

  addLineItem(courseId: string, spec: { label: string; scoreMaximum: number; resourceLinkId?: string; resourceId?: string; tag?: string }): LineItem {
    this.lineItemSeq += 1;
    const id = String(this.lineItemSeq);
    const item: LineItem = { id: this.lineItemUrl(courseId, id), ...spec };
    const course = this.lineItems.get(courseId) ?? new Map<string, LineItem>();
    course.set(id, item);
    this.lineItems.set(courseId, course);
    return item;
  }

  addMembers(courseId: string, members: MockMember[]): void {
    this.members.set(courseId, [...(this.members.get(courseId) ?? []), ...members]);
  }

  /** Make the next `times` score POSTs answer with `status` (and record nothing). */
  failScores(status: number, times = Number.POSITIVE_INFINITY): void {
    this.scoreFailure = { status, remaining: times };
  }

  clearScoreFailures(): void {
    this.scoreFailure = null;
  }

  /** Invalidate every access token issued so far (simulates server-side expiry/revocation). */
  revokeTokens(): void {
    this.issuedTokens.clear();
  }

  // ─────────────────────────────────── Launch ────────────────────────────────

  /** Claims of a well-formed launch; tests mutate the result to build invalid tokens. */
  launchClaims(options: MockLaunchOptions): Record<string, unknown> {
    const courseId = options.courseId ?? "course-1";
    const messageType = options.messageType ?? "LtiResourceLinkRequest";
    const claims: Record<string, unknown> = {
      iss: this.issuer,
      aud: this.clientId,
      nonce: options.nonce,
      [`${LTI_CLAIM}/message_type`]: messageType,
      [`${LTI_CLAIM}/version`]: "1.3.0",
      [`${LTI_CLAIM}/deployment_id`]: this.deploymentId,
      [`${LTI_CLAIM}/target_link_uri`]: options.targetLinkUri,
      [`${LTI_CLAIM}/roles`]: options.roles ?? [INSTRUCTOR],
      [`${LTI_CLAIM}/context`]: { id: courseId, title: options.courseTitle ?? "Mock Course", label: "MOCK-101" },
      [`${LTI_CLAIM}/custom`]: options.custom ?? {},
      [AGS_CLAIM]: {
        scope: [LINEITEM_SCOPE, SCORE_SCOPE],
        lineitems: this.lineItemsUrl(courseId),
        ...(options.lineItemId ? { lineitem: this.lineItemUrl(courseId, options.lineItemId) } : {}),
      },
      [NRPS_CLAIM]: { context_memberships_url: this.membershipsUrl(courseId), service_versions: ["2.0"] },
    };
    if (options.sub !== null) claims.sub = options.sub ?? "mock-user-1";
    if (options.name) claims.name = options.name;
    if (options.email) claims.email = options.email;
    if (messageType === "LtiDeepLinkingRequest") {
      claims[DL_CLAIM] = {
        deep_link_return_url: options.deepLinkReturnUrl ?? `${this.issuer}/courses/${courseId}/deep_linking_response`,
        accept_types: ["ltiResourceLink"],
        accept_presentation_document_targets: ["iframe", "window"],
        accept_multiple: true,
        accept_lineitem: true,
        ...(options.deepLinkData ? { data: options.deepLinkData } : {}),
      };
    } else {
      claims[`${LTI_CLAIM}/resource_link`] = { id: options.resourceLinkId ?? "resource-link-1", title: "Mock activity" };
    }
    return claims;
  }

  /** Sign an id_token. `rogue: true` signs with a key that is NOT in the platform JWKS. */
  async signIdToken(
    claims: Record<string, unknown>,
    options: { rogue?: boolean; kid?: string; issuedAt?: Date; expiresInSeconds?: number } = {},
  ): Promise<string> {
    const issuedAt = Math.floor((options.issuedAt ?? this.now()).getTime() / 1000);
    return new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: options.kid ?? this.kid, typ: "JWT" })
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + (options.expiresInSeconds ?? 3600))
      .sign(options.rogue ? this.rogueKey : this.privateKey);
  }

  /**
   * Play the platform's OIDC authorization endpoint for the tool's redirect
   * URL: check the request the way a platform would and return the form
   * fields it would POST to `redirect_uri`.
   */
  async authorize(
    redirectUrl: string,
    launch: Omit<MockLaunchOptions, "nonce">,
    expectations: { loginHint: string; registeredRedirectUris: string[] },
  ): Promise<{ redirectUri: string; form: { id_token: string; state: string } }> {
    const url = new URL(redirectUrl);
    const p = url.searchParams;
    const problems: string[] = [];
    if (`${url.origin}${url.pathname}` !== this.authLoginUrl) problems.push("wrong authorization endpoint");
    if (p.get("scope") !== "openid") problems.push("scope must be openid");
    if (p.get("response_type") !== "id_token") problems.push("response_type must be id_token");
    if (p.get("response_mode") !== "form_post") problems.push("response_mode must be form_post");
    if (p.get("prompt") !== "none") problems.push("prompt must be none");
    if (p.get("client_id") !== this.clientId) problems.push("unknown client_id");
    if (p.get("login_hint") !== expectations.loginHint) problems.push("login_hint does not match");
    const redirectUri = p.get("redirect_uri") ?? "";
    if (!expectations.registeredRedirectUris.includes(redirectUri)) problems.push("redirect_uri is not registered");
    const state = p.get("state");
    const nonce = p.get("nonce");
    if (!state) problems.push("state missing");
    if (!nonce) problems.push("nonce missing");
    if (problems.length > 0 || !state || !nonce) throw new Error(`Mock platform rejected the authentication request: ${problems.join("; ")}`);
    const idToken = await this.signIdToken(this.launchClaims({ ...launch, nonce }));
    return { redirectUri, form: { id_token: idToken, state } };
  }

  // ─────────────────────────────────── fetch ─────────────────────────────────

  /** `fetch` implementation serving this platform's endpoints. Unknown URLs get a 404. */
  readonly fetch: FetchLike = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input.toString());
    const method = (init?.method ?? "GET").toUpperCase();
    this.requests.push({ method, url: url.toString() });
    if (url.origin !== new URL(this.issuer).origin) return json(404, { error: "not_found" });

    if (url.pathname === "/api/lti/security/jwks" && method === "GET") {
      return this.jwksFailureStatus ? json(this.jwksFailureStatus, { error: "unavailable" }) : json(200, this.jwks());
    }
    if (url.pathname === "/login/oauth2/token" && method === "POST") return this.handleToken(init);

    const course = /^\/api\/lti\/courses\/([^/]+)\/(line_items|names_and_roles)(?:\/([^/]+))?(\/scores)?$/.exec(url.pathname);
    if (!course) return json(404, { error: "not_found" });
    const [, courseId, resource, lineItemId, scores] = course;
    const headers = new Headers(init?.headers);

    if (resource === "names_and_roles" && method === "GET") {
      return this.authorized(headers, [NRPS_SCOPE]) ?? this.handleRoster(url, courseId);
    }
    if (scores && lineItemId && method === "POST") {
      return this.authorized(headers, [SCORE_SCOPE]) ?? this.handleScore(headers, init, courseId, lineItemId);
    }
    if (!lineItemId && method === "GET") {
      return this.authorized(headers, [LINEITEM_SCOPE, LINEITEM_READ_SCOPE]) ?? this.handleLineItemList(url, courseId);
    }
    if (!lineItemId && method === "POST") {
      return this.authorized(headers, [LINEITEM_SCOPE]) ?? this.handleLineItemCreate(init, courseId);
    }
    return json(404, { error: "not_found" });
  };

  /** Null when the bearer token is valid and has one of `anyOf`; otherwise the 401/403 to return. */
  private authorized(headers: Headers, anyOf: string[]): Response | null {
    const bearer = /^Bearer (.+)$/.exec(headers.get("authorization") ?? "")?.[1];
    const token = bearer ? this.issuedTokens.get(bearer) : undefined;
    if (!token || token.expiresAt <= this.now().getTime()) return json(401, { errors: [{ message: "Invalid access token." }] });
    if (!anyOf.some((scope) => token.scopes.includes(scope))) return json(403, { errors: [{ message: "Insufficient scope." }] });
    return null;
  }

  private async handleToken(init: RequestInit | undefined): Promise<Response> {
    if (this.tokenFailureStatus) return json(this.tokenFailureStatus, { error: "temporarily_unavailable" });
    const form = new URLSearchParams(typeof init?.body === "string" ? init.body : "");
    if (form.get("grant_type") !== "client_credentials") return json(400, { error: "unsupported_grant_type" });
    if (form.get("client_assertion_type") !== "urn:ietf:params:oauth:client-assertion-type:jwt-bearer") return json(400, { error: "invalid_request" });

    let claims: Record<string, unknown>;
    let header: Record<string, unknown>;
    try {
      const verified = await jwtVerify(form.get("client_assertion") ?? "", createLocalJWKSet(this.toolJwks()), {
        issuer: this.clientId,
        subject: this.clientId,
        audience: this.authTokenUrl,
        algorithms: ["RS256"],
        currentDate: this.now(),
        requiredClaims: ["exp", "iat", "jti"],
      });
      claims = verified.payload;
      header = verified.protectedHeader as Record<string, unknown>;
    } catch {
      return json(401, { error: "invalid_client" });
    }
    const jti = String(claims.jti);
    if (this.usedJtis.has(jti)) return json(401, { error: "invalid_client" });
    this.usedJtis.add(jti);

    const requested = (form.get("scope") ?? "").split(/\s+/).filter(Boolean);
    const granted = this.grantableScopes === null ? requested : requested.filter((scope) => this.grantableScopes?.includes(scope));
    this.tokenRequests.push({ requestedScopes: requested, grantedScopes: granted, assertionClaims: claims, assertionHeader: header });
    if (granted.length === 0) return json(400, { error: "invalid_scope" });

    const accessToken = `mock-token-${randomUUID()}`;
    this.issuedTokens.set(accessToken, { scopes: granted, expiresAt: this.now().getTime() + this.tokenExpiresInSeconds * 1000 });
    return json(200, { access_token: accessToken, token_type: "Bearer", expires_in: this.tokenExpiresInSeconds, scope: granted.join(" ") });
  }

  private handleRoster(url: URL, courseId: string): Response {
    const all = this.members.get(courseId) ?? [];
    const limit = Number(url.searchParams.get("limit")) || this.rosterPageSize;
    const page = Number(url.searchParams.get("page")) || 1;
    const role = url.searchParams.get("role");
    const filtered = role ? all.filter((m) => m.roles.includes(role)) : all;
    const slice = filtered.slice((page - 1) * limit, page * limit);
    const headers: Record<string, string> = { "content-type": "application/vnd.ims.lti-nrps.v2.membershipcontainer+json" };
    if (page * limit < filtered.length) {
      const next = new URL(url.toString());
      next.searchParams.set("page", String(page + 1));
      next.searchParams.set("limit", String(limit));
      headers.link = `<${url.toString()}>; rel="current", <${next.toString()}>; rel="next"`;
    }
    return json(200, { id: url.toString(), context: { id: courseId, label: "MOCK-101", title: "Mock Course" }, members: slice }, headers);
  }

  private handleLineItemList(url: URL, courseId: string): Response {
    const p = url.searchParams;
    const items = [...(this.lineItems.get(courseId)?.values() ?? [])].filter(
      (item) =>
        (!p.get("resource_link_id") || item.resourceLinkId === p.get("resource_link_id")) &&
        (!p.get("resource_id") || item.resourceId === p.get("resource_id")) &&
        (!p.get("tag") || item.tag === p.get("tag")),
    );
    return json(200, items, { "content-type": "application/vnd.ims.lis.v2.lineitemcontainer+json" });
  }

  private handleLineItemCreate(init: RequestInit | undefined, courseId: string): Response {
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(typeof init?.body === "string" ? init.body : "") as Record<string, unknown>;
    } catch {
      return json(400, { errors: [{ message: "Invalid JSON." }] });
    }
    if (typeof body.label !== "string" || typeof body.scoreMaximum !== "number") return json(422, { errors: [{ message: "label and scoreMaximum are required." }] });
    const item = this.addLineItem(courseId, {
      label: body.label,
      scoreMaximum: body.scoreMaximum,
      resourceLinkId: typeof body.resourceLinkId === "string" ? body.resourceLinkId : undefined,
      resourceId: typeof body.resourceId === "string" ? body.resourceId : undefined,
      tag: typeof body.tag === "string" ? body.tag : undefined,
    });
    return json(201, item, { "content-type": "application/vnd.ims.lis.v2.lineitem+json" });
  }

  private handleScore(headers: Headers, init: RequestInit | undefined, courseId: string, lineItemId: string): Response {
    if (this.scoreFailure && this.scoreFailure.remaining > 0) {
      this.scoreFailure.remaining -= 1;
      return json(this.scoreFailure.status, { errors: [{ message: `Configured failure ${this.scoreFailure.status}.` }] });
    }
    if (!this.lineItems.get(courseId)?.has(lineItemId)) return json(404, { errors: [{ message: "Line item not found." }] });
    if (headers.get("content-type") !== SCORE_MEDIA) return json(415, { errors: [{ message: "Unsupported media type." }] });
    let score: ScorePayload;
    try {
      score = JSON.parse(typeof init?.body === "string" ? init.body : "") as ScorePayload;
    } catch {
      return json(400, { errors: [{ message: "Invalid JSON." }] });
    }
    const timestamp = Date.parse(score.timestamp ?? "");
    if (!score.userId || !score.activityProgress || !score.gradingProgress || Number.isNaN(timestamp)) {
      return json(422, { errors: [{ message: "userId, activityProgress, gradingProgress and timestamp are required." }] });
    }
    if (score.scoreGiven !== undefined && typeof score.scoreMaximum !== "number") return json(422, { errors: [{ message: "scoreMaximum is required with scoreGiven." }] });
    const key = `${courseId}/${lineItemId}/${score.userId}`;
    if (timestamp <= (this.lastScoreTimestamp.get(key) ?? -Infinity)) return json(400, { errors: [{ message: "timestamp must be later than the previous score." }] });
    this.lastScoreTimestamp.set(key, timestamp);

    const lineItemUrl = this.lineItemUrl(courseId, lineItemId);
    this.receivedScores.push({ courseId, lineItemId, lineItemUrl, score });
    return json(200, { resultUrl: `${lineItemUrl}/results/${encodeURIComponent(score.userId)}` });
  }
}
