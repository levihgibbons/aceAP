/**
 * Platform-agnostic LMS integration types.
 *
 * Nothing in this file knows about Canvas, Next.js or the database. A new LMS
 * is added by implementing `LmsAdapter`; the sync service only talks to that
 * interface.
 *
 * Honesty rule encoded in the types: every network operation returns an
 * `LmsResult`. A grade is only "synced" when `publishScore` resolved with
 * `ok: true`, which adapters may only return after a 2xx from the platform.
 */

// ───────────────────────────────── Results ──────────────────────────────────

export type LmsErrorCode =
  /** Tool key or connection is missing — nothing was attempted. */
  | "not_configured"
  /** A launch/state/access token failed validation. */
  | "invalid_token"
  /** 401/403 from the platform or a scope that was not granted → job "blocked". */
  | "permission_denied"
  /** 5xx, throttling or a network failure → retryable. */
  | "platform_error"
  /** The platform (or our own validation) rejected the request → not retryable. */
  | "bad_request";

/** Machine-readable detail for `invalid_token` so callers/tests can branch. */
export type InvalidTokenReason =
  | "malformed"
  | "invalid_state"
  | "state_expired"
  | "bad_signature"
  | "wrong_issuer"
  | "wrong_audience"
  | "expired"
  | "issued_in_future"
  | "nonce_mismatch"
  | "nonce_replayed"
  | "unknown_deployment"
  | "unsupported_version"
  | "unsupported_message_type"
  | "missing_claim"
  | "target_link_uri_mismatch";

export interface LmsError {
  code: LmsErrorCode;
  /** Safe to show to staff and to store in logs: never contains key material or tokens. */
  message: string;
  /** HTTP status returned by the platform, when there was one. */
  status?: number;
  reason?: InvalidTokenReason;
  /** True only for `platform_error`. */
  retryable: boolean;
}

export type LmsResult<T> = { ok: true; value: T } | { ok: false; error: LmsError };

export function ok<T>(value: T): LmsResult<T> {
  return { ok: true, value };
}

export function fail(code: LmsErrorCode, message: string, extra: { status?: number; reason?: InvalidTokenReason } = {}): { ok: false; error: LmsError } {
  return { ok: false, error: { code, message, retryable: code === "platform_error", ...extra } };
}

// ──────────────────────────────── Injectables ───────────────────────────────

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;
export type Clock = () => Date;

export const systemClock: Clock = () => new Date();

// ──────────────────────────────── Connection ────────────────────────────────

export type LmsPlatform = "canvas";

/** One platform deployment registered with AceAP (a row of `lms_connections`). */
export interface LmsConnectionConfig {
  id: string;
  organizationId: string;
  platform: LmsPlatform;
  /** `iss` of the platform's id_tokens. */
  issuer: string;
  /** OAuth2 client id the platform assigned to AceAP (Canvas: Developer Key id). */
  clientId: string;
  deploymentId: string;
  /** OIDC authorization endpoint. */
  authLoginUrl: string;
  /** OAuth2 token endpoint for the client-credentials grant. */
  authTokenUrl: string;
  /** Platform public key set used to verify id_tokens. */
  jwksUrl: string;
}

/**
 * Where candidate connections come from: a fixed list, or a lookup (normally
 * the database) by issuer and — when known — client id.
 */
export type ConnectionSource = LmsConnectionConfig[] | ((issuer: string, clientId: string | null) => Promise<LmsConnectionConfig[]>);

export async function resolveConnections(source: ConnectionSource, issuer: string, clientId: string | null): Promise<LmsConnectionConfig[]> {
  const all = typeof source === "function" ? await source(issuer, clientId) : source;
  return all.filter((c) => c.issuer === issuer && (clientId === null || c.clientId === clientId));
}

// ────────────────────────────────── Launch ──────────────────────────────────

export type LtiMessageType = "LtiResourceLinkRequest" | "LtiDeepLinkingRequest";

/** `https://purl.imsglobal.org/spec/lti-ags/claim/endpoint` */
export interface AgsEndpointClaim {
  scopes: string[];
  /** Line item container URL (may be absent). */
  lineItemsUrl: string | null;
  /** Present only when the launch maps to exactly one line item. */
  lineItemUrl: string | null;
}

/** `https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice` */
export interface NrpsEndpointClaim {
  contextMembershipsUrl: string;
  serviceVersions: string[];
}

/** `https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings` */
export interface DeepLinkingSettings {
  deepLinkReturnUrl: string;
  acceptTypes: string[];
  acceptPresentationDocumentTargets: string[];
  acceptMultiple: boolean;
  acceptLineItem: boolean;
  autoCreate: boolean;
  /** Opaque value that must be echoed back in the response when present. */
  data: string | null;
  title: string | null;
  text: string | null;
}

/** A validated launch. Only produced after signature, audience, nonce and deployment checks passed. */
export interface LaunchContext {
  connectionId: string;
  organizationId: string;
  messageType: LtiMessageType;
  issuer: string;
  clientId: string;
  deploymentId: string;
  /** Platform user id (`sub`); null for an anonymous launch. Never treated as an AceAP user until explicitly linked. */
  userSub: string | null;
  roles: string[];
  /** Only present when the platform's privacy settings share them. Never used to infer identity links. */
  userName: string | null;
  userEmail: string | null;
  context: { id: string; title: string | null; label: string | null } | null;
  resourceLink: { id: string; title: string | null } | null;
  targetLinkUri: string;
  custom: Record<string, string>;
  ags: AgsEndpointClaim | null;
  nrps: NrpsEndpointClaim | null;
  deepLinking: DeepLinkingSettings | null;
}

/** Third-party-initiated login request (OIDC step 1). */
export interface LoginInitiationRequest {
  issuer: string;
  loginHint: string;
  targetLinkUri: string;
  clientId: string | null;
  ltiMessageHint: string | null;
  ltiDeploymentId: string | null;
}

export interface LoginRedirect {
  /** Where to send the browser (the platform's authorization endpoint + query). */
  redirectUrl: string;
  state: string;
  nonce: string;
}

// ───────────────────────────────── Services ─────────────────────────────────

export interface RosterMember {
  userId: string;
  roles: string[];
  /** "Active" | "Inactive" | "Deleted" (defaults to "Active" when the platform omits it). */
  status: string;
  /** The fields below are only set when the platform actually provided them. */
  name?: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  lisPersonSourcedId?: string;
}

export interface Roster {
  contextId: string | null;
  members: RosterMember[];
  /** Number of pages fetched from the platform. */
  pages: number;
}

export interface LineItem {
  /** The line item URL, as issued by the platform. */
  id: string;
  label: string;
  scoreMaximum: number;
  resourceId?: string;
  resourceLinkId?: string;
  tag?: string;
}

export interface LineItemSpec {
  label: string;
  scoreMaximum: number;
  resourceId?: string;
  resourceLinkId?: string;
  tag?: string;
}

export type ActivityProgress = "Initialized" | "Started" | "InProgress" | "Submitted" | "Completed";
export type GradingProgress = "FullyGraded" | "Pending" | "PendingManual" | "Failed" | "NotReady";

/** Input to a score publish; the adapter adds the timestamp. */
export interface ScoreInput {
  /** Platform user id (never an AceAP id). */
  userId: string;
  scoreGiven: number;
  scoreMaximum: number;
  activityProgress?: ActivityProgress;
  gradingProgress?: GradingProgress;
  comment?: string;
}

/** Wire format: `application/vnd.ims.lis.v1.score+json`. */
export interface ScorePayload {
  userId: string;
  scoreGiven: number;
  scoreMaximum: number;
  activityProgress: ActivityProgress;
  gradingProgress: GradingProgress;
  /** ISO 8601 with sub-second precision; strictly increasing per (line item, user). */
  timestamp: string;
  comment?: string;
}

export interface ScoreReceipt {
  /** The 2xx status the platform answered with. */
  status: number;
  timestamp: string;
  resultUrl: string | null;
}

export interface AccessToken {
  accessToken: string;
  /** Scopes the platform actually granted. */
  scopes: string[];
  expiresAt: Date;
}

export interface PlatformKeyCheck {
  keyCount: number;
}

/** A content item returned to the platform from a deep-linking launch. */
export interface DeepLinkItem {
  title: string;
  url: string;
  text?: string;
  /** e.g. `{ aceap_assignment_id: "…" }` — echoed back in the custom claim on launch. */
  custom?: Record<string, string>;
  lineItem?: { scoreMaximum: number; label?: string; resourceId?: string; tag?: string };
  /**
   * Deep Linking 2.0 §3.2 `window` presentation: open the link in a new
   * window/tab named `targetName` (e.g. "_blank"). All sub-properties optional.
   */
  window?: { targetName?: string; width?: number; height?: number; windowFeatures?: string };
}

export interface DeepLinkingResponse {
  /** Signed JWT to POST as form field `JWT` to `returnUrl`. */
  jwt: string;
  returnUrl: string;
}

/**
 * What the application needs from any LMS. Implementations must be honest:
 * return `ok: true` only when the platform confirmed the operation.
 */
export interface LmsAdapter {
  readonly platform: LmsPlatform;

  /** OIDC step 1 → 2: build the browser redirect to the platform. */
  buildLoginRedirect(input: {
    request: LoginInitiationRequest;
    connections: ConnectionSource;
    redirectUri: string;
    /** When set, `target_link_uri` must share this origin. */
    toolBaseUrl?: string;
  }): Promise<LmsResult<LoginRedirect>>;

  /** OIDC step 3 → 4: validate the id_token the platform posted back. */
  validateLaunch(input: { idToken: string; state: string; connections: ConnectionSource }): Promise<LmsResult<LaunchContext>>;

  buildDeepLinkingResponse(input: {
    connection: LmsConnectionConfig;
    settings: DeepLinkingSettings;
    items: DeepLinkItem[];
    message?: string;
  }): Promise<LmsResult<DeepLinkingResponse>>;

  /** Fetch and parse the platform's public keys. */
  checkPlatformKeys(connection: LmsConnectionConfig): Promise<LmsResult<PlatformKeyCheck>>;

  /** Client-credentials grant; fails with `permission_denied` if a requested scope is not granted. */
  requestAccessToken(connection: LmsConnectionConfig, scopes: string[]): Promise<LmsResult<AccessToken>>;

  findLineItem(connection: LmsConnectionConfig, lineItemsUrl: string, query: { resourceLinkId?: string; resourceId?: string; tag?: string }): Promise<LmsResult<LineItem | null>>;

  createLineItem(connection: LmsConnectionConfig, lineItemsUrl: string, spec: LineItemSpec): Promise<LmsResult<LineItem>>;

  /** Resolves `ok` only after a 2xx from the platform's score endpoint. */
  publishScore(connection: LmsConnectionConfig, lineItemUrl: string, score: ScoreInput): Promise<LmsResult<ScoreReceipt>>;

  fetchRoster(connection: LmsConnectionConfig, membershipsUrl: string, options?: { role?: string; limit?: number }): Promise<LmsResult<Roster>>;
}
