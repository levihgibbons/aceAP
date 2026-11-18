/**
 * Canvas LMS adapter (LTI 1.3 + LTI Advantage), composed from the generic LTI
 * modules. Nothing Canvas-specific leaks into the sync service.
 *
 * STATUS: implemented against the 1EdTech specifications and the public Canvas
 * API documentation, and exercised only against the in-repo mock platform.
 * It has NOT been validated against a real Canvas instance.
 *
 * Canvas endpoints (see docs/CANVAS_INTEGRATION.md):
 *   issuer   https://canvas.instructure.com        (beta/test: canvas.beta… / canvas.test…)
 *   auth     https://sso.canvaslms.com/api/lti/authorize_redirect
 *            (legacy, still accepted: https://canvas.instructure.com/api/lti/authorize_redirect)
 *   JWKS     https://sso.canvaslms.com/api/lti/security/jwks
 *            (legacy: https://canvas.instructure.com/api/lti/security/jwks)
 *   token    https://<canvas domain>/login/oauth2/token
 * Self-hosted, beta and test instances differ, so explicit URLs are always
 * stored per connection; the defaults below only pre-fill the form.
 */
import {
  resolveConnections,
  systemClock,
  type AccessToken,
  type Clock,
  type ConnectionSource,
  type DeepLinkItem,
  type DeepLinkingResponse,
  type DeepLinkingSettings,
  type FetchLike,
  type LaunchContext,
  type LineItem,
  type LineItemSpec,
  type LmsAdapter,
  type LmsConnectionConfig,
  type LmsResult,
  type LoginInitiationRequest,
  type LoginRedirect,
  type PlatformKeyCheck,
  type Roster,
  type ScoreInput,
  type ScoreReceipt,
} from "./types";
import { AgsClient } from "./lti/ags";
import { buildDeepLinkingResponse } from "./lti/deepLinking";
import { checkPlatformKeys, createPlatformKeySource, defaultNonceStore, validateLaunch, type NonceStore, type PlatformKeySource } from "./lti/launch";
import { NrpsClient } from "./lti/nrps";
import { buildLoginRedirect, type StateSecret } from "./lti/oidc";
import { AccessTokenClient, type SignJwt } from "./lti/token";
import type { HostResolver } from "./lti/dnsGuard";
import type { UrlPolicy } from "./lti/urlPolicy";

export const CANVAS_PRODUCTION_ISSUER = "https://canvas.instructure.com";
export const CANVAS_BETA_ISSUER = "https://canvas.beta.instructure.com";
export const CANVAS_TEST_ISSUER = "https://canvas.test.instructure.com";

const CANVAS_CLOUD_SSO: Record<string, string> = {
  [CANVAS_PRODUCTION_ISSUER]: "https://sso.canvaslms.com",
  [CANVAS_BETA_ISSUER]: "https://sso.beta.canvaslms.com",
  [CANVAS_TEST_ISSUER]: "https://sso.test.canvaslms.com",
};

export interface CanvasEndpointDefaults {
  authLoginUrl: string;
  authTokenUrl: string;
  jwksUrl: string;
  /** True for Instructure-hosted issuers; false when derived from a self-hosted issuer URL. */
  instructureHosted: boolean;
}

/**
 * Suggested endpoint URLs for a Canvas issuer — a convenience for pre-filling
 * the connection form, never a substitute for the stored explicit URLs.
 * Returns null when `issuer` is not a valid URL.
 */
export function canvasEndpointDefaults(issuer: string): CanvasEndpointDefaults | null {
  let origin: string;
  try {
    origin = new URL(issuer).origin;
  } catch {
    return null;
  }
  const sso = CANVAS_CLOUD_SSO[origin];
  const authHost = sso ?? origin;
  return {
    authLoginUrl: `${authHost}/api/lti/authorize_redirect`,
    authTokenUrl: `${origin}/login/oauth2/token`,
    jwksUrl: `${authHost}/api/lti/security/jwks`,
    instructureHosted: sso !== undefined,
  };
}

export interface CanvasAdapterDeps {
  fetch?: FetchLike;
  now?: Clock;
  nonceStore?: NonceStore;
  /** HMAC secret for OIDC state tokens; defaults to one derived from the tool key. */
  stateSecret?: StateSecret | null;
  /** Signer for client assertions and deep-linking responses; defaults to the tool key. */
  signJwt?: SignJwt;
  keySource?: PlatformKeySource;
  clockToleranceSeconds?: number;
  timeoutMs?: number;
  /** Outbound URL allow-list; defaults to LTI_ALLOWED_HOSTS read at call time. */
  urlPolicy?: UrlPolicy;
  /** DNS resolver for the rebinding check; defaults to `dns.lookup` (see lti/dnsGuard.ts). */
  resolveHost?: HostResolver;
}

export class CanvasLtiAdapter implements LmsAdapter {
  readonly platform = "canvas" as const;

  private readonly now: Clock;
  private readonly tokens: AccessTokenClient;
  private readonly ags: AgsClient;
  private readonly nrps: NrpsClient;
  private readonly keys: PlatformKeySource;
  private readonly nonceStore: NonceStore;

  constructor(private readonly deps: CanvasAdapterDeps = {}) {
    this.now = deps.now ?? systemClock;
    const http = { fetch: deps.fetch, now: this.now, timeoutMs: deps.timeoutMs, urlPolicy: deps.urlPolicy, resolveHost: deps.resolveHost };
    this.tokens = new AccessTokenClient({ ...http, signJwt: deps.signJwt });
    this.ags = new AgsClient(this.tokens, { now: this.now, urlPolicy: deps.urlPolicy });
    this.nrps = new NrpsClient(this.tokens, { urlPolicy: deps.urlPolicy });
    this.keys = deps.keySource ?? createPlatformKeySource(http);
    this.nonceStore = deps.nonceStore ?? defaultNonceStore;
  }

  async buildLoginRedirect(input: {
    request: LoginInitiationRequest;
    connections: ConnectionSource;
    redirectUri: string;
    toolBaseUrl?: string;
  }): Promise<LmsResult<LoginRedirect>> {
    const connections = await resolveConnections(input.connections, input.request.issuer, input.request.clientId);
    return buildLoginRedirect({
      request: input.request,
      connections,
      redirectUri: input.redirectUri,
      toolBaseUrl: input.toolBaseUrl,
      secret: this.deps.stateSecret,
      now: this.now,
    });
  }

  validateLaunch(input: { idToken: string; state: string; connections: ConnectionSource }): Promise<LmsResult<LaunchContext>> {
    return validateLaunch({
      ...input,
      keys: this.keys,
      nonceStore: this.nonceStore,
      secret: this.deps.stateSecret,
      now: this.now,
      clockToleranceSeconds: this.deps.clockToleranceSeconds,
    });
  }

  buildDeepLinkingResponse(input: {
    connection: LmsConnectionConfig;
    settings: DeepLinkingSettings;
    items: DeepLinkItem[];
    message?: string;
  }): Promise<LmsResult<DeepLinkingResponse>> {
    return buildDeepLinkingResponse({ ...input, now: this.now, signJwt: this.deps.signJwt });
  }

  checkPlatformKeys(connection: LmsConnectionConfig): Promise<LmsResult<PlatformKeyCheck>> {
    return checkPlatformKeys(
      { fetch: this.deps.fetch, now: this.now, timeoutMs: this.deps.timeoutMs, urlPolicy: this.deps.urlPolicy, resolveHost: this.deps.resolveHost },
      connection,
    );
  }

  requestAccessToken(connection: LmsConnectionConfig, scopes: string[]): Promise<LmsResult<AccessToken>> {
    return this.tokens.getToken(connection, scopes);
  }

  findLineItem(
    connection: LmsConnectionConfig,
    lineItemsUrl: string,
    query: { resourceLinkId?: string; resourceId?: string; tag?: string },
  ): Promise<LmsResult<LineItem | null>> {
    return this.ags.findLineItem(connection, lineItemsUrl, query);
  }

  createLineItem(connection: LmsConnectionConfig, lineItemsUrl: string, spec: LineItemSpec): Promise<LmsResult<LineItem>> {
    return this.ags.createLineItem(connection, lineItemsUrl, spec);
  }

  publishScore(connection: LmsConnectionConfig, lineItemUrl: string, score: ScoreInput): Promise<LmsResult<ScoreReceipt>> {
    return this.ags.publishScore(connection, lineItemUrl, score);
  }

  fetchRoster(connection: LmsConnectionConfig, membershipsUrl: string, options?: { role?: string; limit?: number }): Promise<LmsResult<Roster>> {
    return this.nrps.fetchRoster(connection, membershipsUrl, options);
  }
}

/** Convenience factory used by routes and jobs. */
export function createCanvasAdapter(deps: CanvasAdapterDeps = {}): CanvasLtiAdapter {
  return new CanvasLtiAdapter(deps);
}
