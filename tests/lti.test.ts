/**
 * Canvas / LTI 1.3 integration layer.
 *
 * Everything here runs against the in-repo MOCK platform
 * (src/modules/integrations/lms/mockPlatform.ts) and an in-memory database.
 * These tests prove the tool-side protocol and state handling; they prove
 * nothing about a real Canvas instance.
 */
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { createLocalJWKSet, decodeJwt, decodeProtectedHeader, jwtVerify } from "jose";
import { getDb } from "@/db/client";
import {
  assignments,
  auditLogs,
  classEnrollments,
  classes,
  courseVersions,
  courses,
  lmsConnections,
  organizationMemberships,
  organizations,
  syncJobs,
  syncLogs,
  users,
} from "@/db/schema";
import { GET as jwksGet } from "@/app/api/lti/jwks/route";
import { GET as loginGet, POST as loginPost } from "@/app/api/lti/login/route";
import { CANVAS_PRODUCTION_ISSUER, canvasEndpointDefaults, createCanvasAdapter } from "@/modules/integrations/lms/canvasAdapter";
import { AGS_MEDIA, AGS_SCOPE, AgsClient, scoresUrl } from "@/modules/integrations/lms/lti/ags";
import { buildDeepLinkingResponse, DEEP_LINK_CLAIM, renderDeepLinkingForm } from "@/modules/integrations/lms/lti/deepLinking";
import { generateDevKeyPem, getPublicJwks, getToolKeyStatus, signToolJwt } from "@/modules/integrations/lms/lti/keys";
import {
  CLAIM,
  createPlatformKeySource,
  InMemoryNonceStore,
  isAdministrator,
  isInstructor,
  isLearner,
  isTeachingAssistant,
  parseLaunchForm,
  ROLE,
  validateLaunch,
  type ValidateLaunchInput,
} from "@/modules/integrations/lms/lti/launch";
import { NRPS_SCOPE, NrpsClient, parseNextLink } from "@/modules/integrations/lms/lti/nrps";
import { buildLoginRedirect, createStateToken, parseLoginInitiation, stateCookieName, verifyStateToken, type StatePayload } from "@/modules/integrations/lms/lti/oidc";
import { AccessTokenClient, CLIENT_ASSERTION_TYPE } from "@/modules/integrations/lms/lti/token";
import { MockLtiPlatform } from "@/modules/integrations/lms/mockPlatform";
import {
  enqueueGradeSync,
  getIntegrationOverview,
  getLinkedUserId,
  getSyncStatusForGrades,
  gradeIdempotencyKey,
  linkIdentity,
  listSyncJobs,
  mapAssignment,
  mapCourse,
  processPendingJobs,
  processSyncJob,
  retrySyncJob,
  runDiagnostics,
  saveConnection,
} from "@/modules/integrations/lms/service";
import type { FetchLike, InvalidTokenReason, LineItem, LmsAdapter, LmsConnectionConfig, LmsErrorCode, LmsResult } from "@/modules/integrations/lms/types";

// ───────────────────────────────── Test rig ─────────────────────────────────

const APP_BASE_URL = "https://aceap.example.test";
const LAUNCH_URL = `${APP_BASE_URL}/api/lti/launch`;
const TARGET = `${APP_BASE_URL}/lti/launch-target`;
const SECRET = "unit-test-state-secret";
const COURSE = "course-1";

/** Wall clock plus an adjustable offset, shared by the tool code and the mock platform. */
let clockOffsetMs = 0;
const clock = (): Date => new Date(Date.now() + clockOffsetMs);

let mock: MockLtiPlatform;
let staticConnection: LmsConnectionConfig;
let adapter: LmsAdapter;

let orgId: string;
let otherOrgId: string;
let teacherId: string;
let outsiderId: string;
let seq = 0;

type AnyResult<T> = { ok: true; value: T } | { ok: false; error: { code: string; message: string } };

function unwrap<T>(result: AnyResult<T>): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}: ${result.error.message}`);
  return result.value;
}

function expectFailure<T>(result: LmsResult<T>, code: LmsErrorCode, reason?: InvalidTokenReason): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
  if (reason) expect(result.error.reason).toBe(reason);
  expect(result.error.retryable).toBe(code === "platform_error");
}

async function withoutToolKey<T>(fn: () => Promise<T>): Promise<T> {
  const saved = process.env.LTI_TOOL_PRIVATE_KEY;
  process.env.LTI_TOOL_PRIVATE_KEY = "";
  try {
    return await fn();
  } finally {
    process.env.LTI_TOOL_PRIVATE_KEY = saved;
  }
}

const failingFetch: FetchLike = async () => {
  throw new TypeError("fetch failed");
};

beforeAll(async () => {
  process.env.LTI_TOOL_PRIVATE_KEY = generateDevKeyPem();
  process.env.LTI_TOOL_KEY_ID = "test-tool-key";
  process.env.APP_BASE_URL = APP_BASE_URL;
  // The mock platform lives on *.example.test; production defaults (*.instructure.com, *.canvaslms.com) are tested in lti-passback.test.ts.
  process.env.LTI_ALLOWED_HOSTS = "*.example.test";

  mock = await MockLtiPlatform.create({ toolJwks: () => getPublicJwks(), now: clock });
  mock.addMembers(COURSE, [
    { user_id: "u-1", roles: [ROLE.instructor], name: "Ada Teacher", email: "ada@example.test" },
    { user_id: "u-2", roles: [ROLE.learner], name: "Ben Learner", given_name: "Ben", family_name: "Learner" },
    { user_id: "u-3", roles: [ROLE.learner] },
    { user_id: "u-4", roles: [ROLE.learner], status: "Inactive" },
    { user_id: "u-5", roles: [ROLE.learner], email: "eve@example.test" },
  ]);
  staticConnection = { id: "static-connection", organizationId: "static-org", ...mock.connectionInput() };
  adapter = createCanvasAdapter({ fetch: mock.fetch, now: clock, stateSecret: SECRET, nonceStore: new InMemoryNonceStore(clock) });

  const db = await getDb();
  const [org] = await db.insert(organizations).values({ name: "Test High", slug: "test-high" }).returning();
  const [other] = await db.insert(organizations).values({ name: "Other School", slug: "other-school" }).returning();
  orgId = org.id;
  otherOrgId = other.id;
  const [teacher] = await db.insert(users).values({ email: "teacher@example.test", name: "Tess Teacher", passwordHash: "x", role: "teacher" }).returning();
  const [outsider] = await db.insert(users).values({ email: "outsider@example.test", name: "Olly Outsider", passwordHash: "x", role: "teacher" }).returning();
  teacherId = teacher.id;
  outsiderId = outsider.id;
  await db.insert(organizationMemberships).values({ organizationId: orgId, userId: teacherId, role: "teacher" });
  await db.insert(courses).values({ id: "test-course", name: "Test Course", category: "Test", description: "Fixture", sourceUrl: "https://example.test/course" });
  await db.insert(courseVersions).values({ id: "test-course.v1", courseId: "test-course", label: "v1", alignmentSourceUrl: "https://example.test/ced" });
});

afterEach(() => {
  clockOffsetMs = 0;
  mock.grantableScopes = null;
  mock.tokenFailureStatus = null;
  mock.jwksFailureStatus = null;
  mock.clearScoreFailures();
});

// ── Database fixtures ──

async function newClass(organizationId = orgId): Promise<string> {
  seq += 1;
  const db = await getDb();
  const [row] = await db
    .insert(classes)
    .values({ organizationId, teacherId, courseId: "test-course", courseVersionId: "test-course.v1", name: `Class ${seq}`, joinCode: `JOIN${seq}` })
    .returning();
  return row.id;
}

async function newAssignment(classId: string): Promise<string> {
  seq += 1;
  const db = await getDb();
  const [row] = await db.insert(assignments).values({ classId, createdBy: teacherId, title: `Assignment ${seq}`, kind: "skill_practice" }).returning();
  return row.id;
}

async function newStudent(classId: string | null, name?: string): Promise<string> {
  seq += 1;
  const db = await getDb();
  const [row] = await db
    .insert(users)
    .values({ email: `student${seq}@example.test`, name: name ?? `Student ${seq}`, passwordHash: "x", role: "student" })
    .returning();
  if (classId) await db.insert(classEnrollments).values({ classId, studentId: row.id });
  return row.id;
}

async function newConnection(): Promise<LmsConnectionConfig> {
  seq += 1;
  return unwrap(await saveConnection(orgId, teacherId, { ...mock.connectionInput(), deploymentId: `deployment-${seq}` }));
}

interface GradeFixture {
  connection: LmsConnectionConfig;
  classId: string;
  assignmentId: string;
  lineItem: LineItem;
  students: { id: string; externalId: string }[];
}

/** A connection with one class, one mapped assignment (with line item) and linked students. */
async function gradeFixture(options: { students?: number; mapAssignment?: boolean; linkStudents?: boolean } = {}): Promise<GradeFixture> {
  const connection = await newConnection();
  const classId = await newClass();
  const assignmentId = await newAssignment(classId);
  seq += 1;
  const resourceLinkId = `resource-link-${seq}`;
  const lineItem = mock.addLineItem(COURSE, { label: `Line item ${seq}`, scoreMaximum: 100, resourceLinkId });
  if (options.mapAssignment !== false) unwrap(await mapAssignment({ connectionId: connection.id, assignmentId, resourceLinkId, lineItemUrl: lineItem.id }));
  const students: GradeFixture["students"] = [];
  for (let i = 0; i < (options.students ?? 1); i += 1) {
    const id = await newStudent(classId);
    const externalId = `lms-user-${seq}-${i}`;
    if (options.linkStudents !== false) unwrap(await linkIdentity(connection.id, externalId, id, "admin_confirmed"));
    students.push({ id, externalId });
  }
  return { connection, classId, assignmentId, lineItem, students };
}

const scoresFor = (lineItem: LineItem) => mock.receivedScores.filter((s) => s.lineItemUrl === lineItem.id).map((s) => s.score);

async function jobRow(jobId: string) {
  const db = await getDb();
  const [row] = await db.select().from(syncJobs).where(eq(syncJobs.id, jobId));
  return row;
}

async function logsFor(jobId: string) {
  const db = await getDb();
  return db.select().from(syncLogs).where(eq(syncLogs.jobId, jobId)).orderBy(asc(syncLogs.createdAt));
}

// ── Launch helpers ──

function loginRequest(overrides: Partial<Parameters<typeof buildLoginRedirect>[0]["request"]> = {}) {
  return { issuer: mock.issuer, loginHint: "login-hint-1", targetLinkUri: TARGET, clientId: mock.clientId, ltiMessageHint: "message-hint-1", ltiDeploymentId: mock.deploymentId, ...overrides };
}

function startLogin() {
  return unwrap(buildLoginRedirect({ request: loginRequest(), connections: [staticConnection], redirectUri: LAUNCH_URL, secret: SECRET, now: clock, toolBaseUrl: APP_BASE_URL }));
}

function launchInput(idToken: string, state: string, overrides: Partial<ValidateLaunchInput> = {}): ValidateLaunchInput {
  return {
    idToken,
    state,
    connections: [staticConnection],
    keys: createPlatformKeySource({ fetch: mock.fetch, now: clock }),
    nonceStore: new InMemoryNonceStore(clock),
    secret: SECRET,
    now: clock,
    ...overrides,
  };
}

/** A launch whose claims were altered before signing. */
async function launchWith(mutate: (claims: Record<string, unknown>) => void, sign: Parameters<MockLtiPlatform["signIdToken"]>[1] = {}) {
  const login = startLogin();
  const claims = mock.launchClaims({ nonce: login.nonce, targetLinkUri: TARGET });
  mutate(claims);
  return validateLaunch(launchInput(await mock.signIdToken(claims, sign), login.state));
}

// ─────────────────────────────────── Keys ───────────────────────────────────

describe("tool key", () => {
  it("reports not configured, serves an empty JWKS and refuses to sign when no key is set", async () => {
    const env = { LTI_TOOL_PRIVATE_KEY: "", LTI_TOOL_KEY_ID: "kid-x" };
    expect(getToolKeyStatus(env)).toEqual({ configured: false, kid: "kid-x", reason: "LTI_TOOL_PRIVATE_KEY is not set." });
    expect(getPublicJwks(env)).toEqual({ keys: [] });
    expectFailure(await signToolJwt({ sub: "x" }, { expiresInSeconds: 60, env }), "not_configured");
  });

  it("rejects a malformed key without echoing it", () => {
    const status = getToolKeyStatus({ LTI_TOOL_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nsecret-material\n-----END PRIVATE KEY-----" });
    expect(status.configured).toBe(false);
    expect(status.reason).not.toContain("secret-material");
  });

  it("publishes only the public half and signs verifiable RS256 JWTs", async () => {
    expect(getToolKeyStatus()).toEqual({ configured: true, kid: "test-tool-key" });
    const jwks = getPublicJwks();
    expect(jwks.keys).toHaveLength(1);
    expect(Object.keys(jwks.keys[0]).sort()).toEqual(["alg", "e", "kid", "kty", "n", "use"]);

    const jwt = unwrap(await signToolJwt({ sub: "abc" }, { expiresInSeconds: 60 }));
    expect(decodeProtectedHeader(jwt)).toMatchObject({ alg: "RS256", kid: "test-tool-key", typ: "JWT" });
    const { payload } = await jwtVerify(jwt, createLocalJWKSet(jwks));
    expect(payload.sub).toBe("abc");
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(60);
  });

  it("accepts a PEM pasted with literal \\n sequences", () => {
    const pem = generateDevKeyPem().trim().replace(/\n/g, "\\n");
    expect(getToolKeyStatus({ LTI_TOOL_PRIVATE_KEY: `"${pem}"` }).configured).toBe(true);
  });
});

// ─────────────────────────────────── OIDC ───────────────────────────────────

describe("OIDC third-party-initiated login", () => {
  it("validates the login initiation parameters", () => {
    expectFailure(parseLoginInitiation(new URLSearchParams({ iss: mock.issuer })), "bad_request");
    expectFailure(parseLoginInitiation({ iss: mock.issuer, login_hint: "h", target_link_uri: "not-a-url" }), "bad_request");
    const parsed = unwrap(parseLoginInitiation({ iss: mock.issuer, login_hint: "h", target_link_uri: TARGET, client_id: "c", lti_message_hint: "m", deployment_id: "d" }));
    expect(parsed).toEqual({ issuer: mock.issuer, loginHint: "h", targetLinkUri: TARGET, clientId: "c", ltiMessageHint: "m", ltiDeploymentId: "d" });
  });

  it("builds the platform authorization redirect", () => {
    const login = startLogin();
    const url = new URL(login.redirectUrl);
    expect(`${url.origin}${url.pathname}`).toBe(mock.authLoginUrl);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      scope: "openid",
      response_type: "id_token",
      response_mode: "form_post",
      prompt: "none",
      client_id: mock.clientId,
      redirect_uri: LAUNCH_URL,
      login_hint: "login-hint-1",
      lti_message_hint: "message-hint-1",
      state: login.state,
      nonce: login.nonce,
    });
    const state = unwrap(verifyStateToken(login.state, SECRET, clock));
    expect(state).toMatchObject({ nonce: login.nonce, issuer: mock.issuer, clientId: mock.clientId, deploymentId: mock.deploymentId, targetLinkUri: TARGET });
    expect(startLogin().nonce).not.toBe(login.nonce);
  });

  it("rejects unknown issuers, clients and deployments", () => {
    const build = (request: ReturnType<typeof loginRequest>) => buildLoginRedirect({ request, connections: [staticConnection], redirectUri: LAUNCH_URL, secret: SECRET });
    expectFailure(build(loginRequest({ issuer: "https://evil.example.test" })), "not_configured");
    expectFailure(build(loginRequest({ clientId: "someone-else" })), "not_configured");
    expectFailure(build(loginRequest({ ltiDeploymentId: "unknown-deployment" })), "not_configured");
    expectFailure(buildLoginRedirect({ request: loginRequest(), connections: [], redirectUri: LAUNCH_URL, secret: SECRET }), "not_configured");
  });

  it("refuses a target_link_uri on another origin", () => {
    const result = buildLoginRedirect({
      request: loginRequest({ targetLinkUri: "https://phish.example.test/x" }),
      connections: [staticConnection],
      redirectUri: LAUNCH_URL,
      secret: SECRET,
      toolBaseUrl: APP_BASE_URL,
    });
    expectFailure(result, "bad_request");
  });

  it("cannot start a login without a tool key or injected secret", async () => {
    const result = await withoutToolKey(async () => buildLoginRedirect({ request: loginRequest(), connections: [staticConnection], redirectUri: LAUNCH_URL }));
    expectFailure(result, "not_configured");
  });

  it("rejects tampered state tokens", () => {
    const payload: StatePayload = { nonce: "n", issuer: mock.issuer, clientId: mock.clientId, deploymentId: null, targetLinkUri: TARGET, exp: Math.floor(Date.now() / 1000) + 60 };
    const token = createStateToken(payload, SECRET);
    expect(unwrap(verifyStateToken(token, SECRET))).toEqual(payload);

    const [version, body, signature] = token.split(".");
    const forgedBody = Buffer.from(JSON.stringify({ ...payload, clientId: "attacker" })).toString("base64url");
    expectFailure(verifyStateToken(`${version}.${forgedBody}.${signature}`, SECRET), "invalid_token", "invalid_state");
    expectFailure(verifyStateToken(`${version}.${body}.${signature.slice(0, -2)}AA`, SECRET), "invalid_token", "invalid_state");
    expectFailure(verifyStateToken(`${version}.${body}`, SECRET), "invalid_token", "invalid_state");
    expectFailure(verifyStateToken(token, "a-different-secret"), "invalid_token", "invalid_state");
    expectFailure(verifyStateToken("garbage", SECRET), "invalid_token", "invalid_state");
  });

  it("rejects expired state tokens", () => {
    const login = startLogin();
    expect(verifyStateToken(login.state, SECRET, clock).ok).toBe(true);
    expectFailure(verifyStateToken(login.state, SECRET, () => new Date(Date.now() + 11 * 60_000)), "invalid_token", "state_expired");
  });
});

// ────────────────────────────────── Launch ──────────────────────────────────

describe("launch validation", () => {
  it("accepts a resource link launch from the mock platform", async () => {
    const login = startLogin();
    const response = await mock.authorize(
      login.redirectUrl,
      { targetLinkUri: TARGET, sub: "lms-user-42", roles: [ROLE.learner], resourceLinkId: "rl-9", lineItemId: "77", custom: { aceap_assignment_id: "abc" }, name: "Pat Student", email: "pat@example.test" },
      { loginHint: "login-hint-1", registeredRedirectUris: [LAUNCH_URL] },
    );
    expect(response.redirectUri).toBe(LAUNCH_URL);
    const form = unwrap(parseLaunchForm(response.form));
    const launch = unwrap(await validateLaunch(launchInput(form.idToken, form.state)));

    expect(launch).toMatchObject({
      connectionId: "static-connection",
      organizationId: "static-org",
      messageType: "LtiResourceLinkRequest",
      issuer: mock.issuer,
      clientId: mock.clientId,
      deploymentId: mock.deploymentId,
      userSub: "lms-user-42",
      userName: "Pat Student",
      userEmail: "pat@example.test",
      roles: [ROLE.learner],
      context: { id: COURSE, title: "Mock Course", label: "MOCK-101" },
      resourceLink: { id: "rl-9", title: "Mock activity" },
      targetLinkUri: TARGET,
      custom: { aceap_assignment_id: "abc" },
      deepLinking: null,
    });
    expect(launch.ags).toEqual({ scopes: [AGS_SCOPE.lineItem, AGS_SCOPE.score], lineItemsUrl: mock.lineItemsUrl(COURSE), lineItemUrl: mock.lineItemUrl(COURSE, "77") });
    expect(launch.nrps).toEqual({ contextMembershipsUrl: mock.membershipsUrl(COURSE), serviceVersions: ["2.0"] });
  });

  it("accepts a deep linking request and an anonymous launch", async () => {
    const login = startLogin();
    const claims = mock.launchClaims({ nonce: login.nonce, targetLinkUri: TARGET, messageType: "LtiDeepLinkingRequest", deepLinkData: "opaque-123", sub: null });
    const launch = unwrap(await validateLaunch(launchInput(await mock.signIdToken(claims), login.state)));
    expect(launch.messageType).toBe("LtiDeepLinkingRequest");
    expect(launch.userSub).toBeNull();
    expect(launch.resourceLink).toBeNull();
    expect(launch.deepLinking).toMatchObject({ acceptTypes: ["ltiResourceLink"], acceptMultiple: true, acceptLineItem: true, data: "opaque-123" });
    expect(launch.deepLinking?.deepLinkReturnUrl).toContain("/deep_linking_response");
  });

  it("works through the adapter with a connection lookup", async () => {
    const lookup = async () => [staticConnection];
    const login = unwrap(await adapter.buildLoginRedirect({ request: loginRequest(), connections: lookup, redirectUri: LAUNCH_URL, toolBaseUrl: APP_BASE_URL }));
    const idToken = await mock.signIdToken(mock.launchClaims({ nonce: login.nonce, targetLinkUri: TARGET }));
    const launch = unwrap(await adapter.validateLaunch({ idToken, state: login.state, connections: lookup }));
    expect(isInstructor(launch.roles)).toBe(true);
    // The adapter's nonce store makes the same id_token single-use.
    expectFailure(await adapter.validateLaunch({ idToken, state: login.state, connections: lookup }), "invalid_token", "nonce_replayed");
  });

  it("rejects a token signed by a key that is not in the platform JWKS", async () => {
    expectFailure(await launchWith(() => undefined, { rogue: true }), "invalid_token", "bad_signature");
    expectFailure(await launchWith(() => undefined, { kid: "unknown-kid" }), "invalid_token", "bad_signature");
  });

  it("rejects a token whose payload was altered after signing", async () => {
    const login = startLogin();
    const token = await mock.signIdToken(mock.launchClaims({ nonce: login.nonce, targetLinkUri: TARGET, roles: [ROLE.learner] }));
    const [header, payload, signature] = token.split(".");
    const forged = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
    forged[CLAIM.roles] = [ROLE.instructor];
    const tampered = `${header}.${Buffer.from(JSON.stringify(forged)).toString("base64url")}.${signature}`;
    expectFailure(await validateLaunch(launchInput(tampered, login.state)), "invalid_token", "bad_signature");
    expectFailure(await validateLaunch(launchInput("not-a-jwt", login.state)), "invalid_token", "malformed");
  });

  it("rejects the wrong audience and authorized party", async () => {
    expectFailure(
      await launchWith((c) => {
        c.aud = "another-client";
      }),
      "invalid_token",
      "wrong_audience",
    );
    expectFailure(
      await launchWith((c) => {
        c.aud = [mock.clientId, "another-client"];
      }),
      "invalid_token",
      "wrong_audience",
    );
    expectFailure(
      await launchWith((c) => {
        c.aud = [mock.clientId, "another-client"];
        c.azp = "another-client";
      }),
      "invalid_token",
      "wrong_audience",
    );
    const ok = await launchWith((c) => {
      c.aud = [mock.clientId, "another-client"];
      c.azp = mock.clientId;
    });
    expect(ok.ok).toBe(true);
  });

  it("rejects the wrong issuer", async () => {
    expectFailure(
      await launchWith((c) => {
        c.iss = "https://evil.example.test";
      }),
      "invalid_token",
      "wrong_issuer",
    );
  });

  it("rejects expired tokens and tokens issued in the future", async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600_000);
    expectFailure(await launchWith(() => undefined, { issuedAt: twoHoursAgo, expiresInSeconds: 3600 }), "invalid_token", "expired");
    expectFailure(await launchWith(() => undefined, { issuedAt: new Date(Date.now() + 10 * 60_000) }), "invalid_token", "issued_in_future");
    // Small clock skew is tolerated.
    const skewed = await launchWith(() => undefined, { issuedAt: new Date(Date.now() + 20_000) });
    expect(skewed.ok).toBe(true);
  });

  it("rejects a wrong, missing or replayed nonce", async () => {
    expectFailure(
      await launchWith((c) => {
        c.nonce = "some-other-nonce";
      }),
      "invalid_token",
      "nonce_mismatch",
    );
    expectFailure(
      await launchWith((c) => {
        delete c.nonce;
      }),
      "invalid_token",
      "missing_claim",
    );

    const login = startLogin();
    const idToken = await mock.signIdToken(mock.launchClaims({ nonce: login.nonce, targetLinkUri: TARGET }));
    const nonceStore = new InMemoryNonceStore(clock);
    expect((await validateLaunch(launchInput(idToken, login.state, { nonceStore }))).ok).toBe(true);
    expectFailure(await validateLaunch(launchInput(idToken, login.state, { nonceStore })), "invalid_token", "nonce_replayed");

    // A token minted for one login attempt cannot be paired with another attempt's state.
    const otherLogin = startLogin();
    expectFailure(await validateLaunch(launchInput(idToken, otherLogin.state, { nonceStore })), "invalid_token", "nonce_mismatch");
  });

  it("forgets nonces only after they expire", async () => {
    let now = 1_000_000;
    const store = new InMemoryNonceStore(() => new Date(now));
    expect(await store.consume("n-1", new Date(now + 1000))).toBe(true);
    expect(await store.consume("n-1", new Date(now + 1000))).toBe(false);
    now += 2000;
    expect(await store.consume("n-2", new Date(now + 1000))).toBe(true);
    expect(store.size).toBe(1);
  });

  it("rejects an unknown deployment", async () => {
    expectFailure(
      await launchWith((c) => {
        c[CLAIM.deploymentId] = "some-other-deployment";
      }),
      "invalid_token",
      "unknown_deployment",
    );
    expectFailure(
      await launchWith((c) => {
        delete c[CLAIM.deploymentId];
      }),
      "invalid_token",
      "missing_claim",
    );
  });

  it("rejects the wrong LTI version and unsupported message types", async () => {
    expectFailure(
      await launchWith((c) => {
        c[CLAIM.version] = "1.1";
      }),
      "invalid_token",
      "unsupported_version",
    );
    expectFailure(
      await launchWith((c) => {
        c[CLAIM.messageType] = "LtiSubmissionReviewRequest";
      }),
      "invalid_token",
      "unsupported_message_type",
    );
  });

  it("rejects missing required claims and a mismatched target", async () => {
    expectFailure(
      await launchWith((c) => {
        delete c[CLAIM.resourceLink];
      }),
      "invalid_token",
      "missing_claim",
    );
    expectFailure(
      await launchWith((c) => {
        delete c[CLAIM.roles];
      }),
      "invalid_token",
      "missing_claim",
    );
    expectFailure(
      await launchWith((c) => {
        c[CLAIM.targetLinkUri] = `${APP_BASE_URL}/somewhere-else`;
      }),
      "invalid_token",
      "target_link_uri_mismatch",
    );
  });

  it("rejects a forged or expired state and unconfigured connections at launch time", async () => {
    const login = startLogin();
    const idToken = await mock.signIdToken(mock.launchClaims({ nonce: login.nonce, targetLinkUri: TARGET }));
    expectFailure(await validateLaunch(launchInput(idToken, `${login.state}x`)), "invalid_token", "invalid_state");
    expectFailure(await validateLaunch(launchInput(idToken, login.state, { now: () => new Date(Date.now() + 11 * 60_000) })), "invalid_token", "state_expired");
    expectFailure(await validateLaunch(launchInput(idToken, login.state, { connections: [] })), "not_configured");
    expectFailure(parseLaunchForm({ state: login.state }), "invalid_token", "malformed");
    expectFailure(parseLaunchForm({ error: "login_required", state: login.state }), "invalid_token");
  });

  it("reports a platform error when the platform keys cannot be fetched", async () => {
    const login = startLogin();
    const idToken = await mock.signIdToken(mock.launchClaims({ nonce: login.nonce, targetLinkUri: TARGET }));
    mock.jwksFailureStatus = 503;
    expectFailure(await validateLaunch(launchInput(idToken, login.state)), "platform_error");
    expectFailure(await validateLaunch(launchInput(idToken, login.state, { keys: createPlatformKeySource({ fetch: failingFetch }) })), "platform_error");
  });

  it("classifies roles from the roles claim", () => {
    expect(isInstructor([ROLE.instructor])).toBe(true);
    expect(isInstructor(["Instructor"])).toBe(true);
    expect(isInstructor([ROLE.learner])).toBe(false);
    expect(isInstructor([ROLE.teachingAssistant])).toBe(false);
    expect(isTeachingAssistant([ROLE.teachingAssistant])).toBe(true);
    expect(isLearner([ROLE.learner, "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Student"])).toBe(true);
    expect(isLearner([ROLE.instructor])).toBe(false);
    expect(isLearner([])).toBe(false);
    expect(isAdministrator([ROLE.institutionAdministrator])).toBe(true);
    expect(isAdministrator([ROLE.contextAdministrator])).toBe(true);
    expect(isAdministrator([ROLE.instructor])).toBe(false);
  });
});

// ──────────────────────────────── Deep linking ──────────────────────────────

describe("deep linking response", () => {
  const settings = {
    deepLinkReturnUrl: "https://mock-lms.example.test/courses/1/deep_linking_response?x=1&y=\"2\"",
    acceptTypes: ["ltiResourceLink"],
    acceptPresentationDocumentTargets: ["iframe"],
    acceptMultiple: false,
    acceptLineItem: true,
    autoCreate: false,
    data: "opaque-csrf-value",
    title: null,
    text: null,
  };

  it("is signed by the tool key and carries the content item", async () => {
    const response = unwrap(
      await buildDeepLinkingResponse({
        connection: staticConnection,
        settings,
        items: [
          {
            title: "Chain rule practice",
            url: `${APP_BASE_URL}/lti/launch-target`,
            custom: { aceap_assignment_id: "assignment-123" },
            lineItem: { scoreMaximum: 100, label: "Chain rule practice", resourceId: "assignment-123" },
          },
        ],
        message: "1 activity added",
      }),
    );
    expect(response.returnUrl).toBe(settings.deepLinkReturnUrl);

    const { payload, protectedHeader } = await jwtVerify(response.jwt, createLocalJWKSet(getPublicJwks()), { issuer: mock.clientId, audience: mock.issuer });
    expect(protectedHeader).toMatchObject({ alg: "RS256", kid: "test-tool-key" });
    expect(payload[CLAIM.messageType]).toBe("LtiDeepLinkingResponse");
    expect(payload[CLAIM.version]).toBe("1.3.0");
    expect(payload[CLAIM.deploymentId]).toBe(mock.deploymentId);
    expect(payload[DEEP_LINK_CLAIM.data]).toBe("opaque-csrf-value");
    expect(payload[DEEP_LINK_CLAIM.message]).toBe("1 activity added");
    expect(typeof payload.nonce).toBe("string");
    expect(payload[DEEP_LINK_CLAIM.contentItems]).toEqual([
      {
        type: "ltiResourceLink",
        title: "Chain rule practice",
        url: `${APP_BASE_URL}/lti/launch-target`,
        custom: { aceap_assignment_id: "assignment-123" },
        lineItem: { scoreMaximum: 100, label: "Chain rule practice", resourceId: "assignment-123" },
      },
    ]);

    const html = renderDeepLinkingForm(response);
    expect(html).toContain('name="JWT"');
    expect(html).toContain("deep_linking_response?x=1&amp;y=&quot;2&quot;");
  });

  it("refuses what the platform did not ask for and cannot be built without a key", async () => {
    const item = { title: "A", url: `${APP_BASE_URL}/a` };
    expectFailure(await buildDeepLinkingResponse({ connection: staticConnection, settings, items: [item, item] }), "bad_request");
    expectFailure(await buildDeepLinkingResponse({ connection: staticConnection, settings: { ...settings, acceptTypes: ["link"] }, items: [item] }), "bad_request");
    expectFailure(await buildDeepLinkingResponse({ connection: staticConnection, settings, items: [{ ...item, lineItem: { scoreMaximum: 0 } }] }), "bad_request");
    expectFailure(await withoutToolKey(() => buildDeepLinkingResponse({ connection: staticConnection, settings, items: [item] })), "not_configured");
  });
});

// ─────────────────────────────── Access tokens ──────────────────────────────

describe("OAuth2 client-credentials token", () => {
  it("sends a valid signed client assertion and caches the token until it expires", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const recordingFetch: FetchLike = (input, init) => {
      calls.push({ url: String(input), init });
      return mock.fetch(input, init);
    };
    const tokens = new AccessTokenClient({ fetch: recordingFetch, now: clock });
    const before = mock.tokenRequests.length;

    const first = unwrap(await tokens.getToken(staticConnection, [AGS_SCOPE.score]));
    expect(first.scopes).toEqual([AGS_SCOPE.score]);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(mock.authTokenUrl);
    const form = new URLSearchParams(String(calls[0].init?.body));
    expect(form.get("grant_type")).toBe("client_credentials");
    expect(form.get("client_assertion_type")).toBe(CLIENT_ASSERTION_TYPE);
    expect(form.get("scope")).toBe(AGS_SCOPE.score);

    // The mock verified the assertion's signature against the tool JWKS; check its claims too.
    const request = mock.tokenRequests[before];
    expect(request.assertionHeader).toMatchObject({ alg: "RS256", kid: "test-tool-key" });
    expect(request.assertionClaims).toMatchObject({ iss: mock.clientId, sub: mock.clientId, aud: mock.authTokenUrl });
    expect(typeof request.assertionClaims.jti).toBe("string");
    const assertion = decodeJwt(form.get("client_assertion") ?? "");
    expect((assertion.exp ?? 0) - (assertion.iat ?? 0)).toBe(300);

    // Cached: no second token request, in any scope order.
    const second = unwrap(await tokens.getToken(staticConnection, [AGS_SCOPE.score]));
    expect(second.accessToken).toBe(first.accessToken);
    expect(calls).toHaveLength(1);

    // Different scopes are a different cache entry.
    unwrap(await tokens.getToken(staticConnection, [NRPS_SCOPE]));
    expect(calls).toHaveLength(2);

    // After expires_in the token is requested again.
    clockOffsetMs += 3601_000;
    const third = unwrap(await tokens.getToken(staticConnection, [AGS_SCOPE.score]));
    expect(third.accessToken).not.toBe(first.accessToken);
    expect(calls).toHaveLength(3);
  });

  it("reports permission_denied when a requested scope is not granted", async () => {
    const tokens = new AccessTokenClient({ fetch: mock.fetch, now: clock });
    mock.grantableScopes = [AGS_SCOPE.lineItem];
    expectFailure(await tokens.getToken(staticConnection, [AGS_SCOPE.lineItem, AGS_SCOPE.score]), "permission_denied");
    expectFailure(await tokens.getToken(staticConnection, [AGS_SCOPE.score]), "permission_denied");
    expect(unwrap(await tokens.getToken(staticConnection, [AGS_SCOPE.lineItem])).scopes).toEqual([AGS_SCOPE.lineItem]);
  });

  it("maps token endpoint failures to typed errors", async () => {
    const tokens = new AccessTokenClient({ fetch: mock.fetch, now: clock });
    mock.tokenFailureStatus = 500;
    expectFailure(await tokens.getToken(staticConnection, [AGS_SCOPE.score]), "platform_error");
    mock.tokenFailureStatus = null;

    expectFailure(await new AccessTokenClient({ fetch: failingFetch }).getToken(staticConnection, [AGS_SCOPE.score]), "platform_error");
    expectFailure(await tokens.getToken({ ...staticConnection, authTokenUrl: "http://insecure.example.test/token" }, [AGS_SCOPE.score]), "bad_request");

    // An assertion for a client the platform does not know is refused (invalid_client).
    expectFailure(await tokens.getToken({ ...staticConnection, id: "other", clientId: "unknown-client" }, [AGS_SCOPE.score]), "permission_denied");
    expectFailure(await withoutToolKey(() => new AccessTokenClient({ fetch: mock.fetch }).getToken(staticConnection, [AGS_SCOPE.score])), "not_configured");
  });
});

// ─────────────────────────────────── AGS ────────────────────────────────────

describe("AGS line items and scores", () => {
  const client = () => new AgsClient(new AccessTokenClient({ fetch: mock.fetch, now: clock }), { now: clock });

  it("derives the scores URL from the line item URL", () => {
    expect(scoresUrl("https://lms.example.test/api/lti/courses/1/line_items/5")).toBe("https://lms.example.test/api/lti/courses/1/line_items/5/scores");
    expect(scoresUrl("https://lms.example.test/line_items/5/?type=x")).toBe("https://lms.example.test/line_items/5/scores?type=x");
  });

  it("publishes a score that the platform records exactly once", async () => {
    const lineItem = mock.addLineItem(COURSE, { label: "Quiz", scoreMaximum: 10 });
    const calls: RequestInit[] = [];
    const recordingFetch: FetchLike = (input, init) => {
      if (String(input).endsWith("/scores") && init) calls.push(init);
      return mock.fetch(input, init);
    };
    const ags = new AgsClient(new AccessTokenClient({ fetch: recordingFetch, now: clock }), { now: clock });

    const receipt = unwrap(await ags.publishScore(staticConnection, lineItem.id, { userId: "lms-user-1", scoreGiven: 8, scoreMaximum: 10, comment: "Well done" }));
    expect(receipt.status).toBe(200);
    expect(receipt.resultUrl).toContain("/results/lms-user-1");
    expect(new Headers(calls[0].headers).get("content-type")).toBe(AGS_MEDIA.score);
    expect(new Headers(calls[0].headers).get("authorization")).toMatch(/^Bearer mock-token-/);

    const scores = scoresFor(lineItem);
    expect(scores).toHaveLength(1);
    expect(scores[0]).toEqual({
      userId: "lms-user-1",
      scoreGiven: 8,
      scoreMaximum: 10,
      activityProgress: "Completed",
      gradingProgress: "FullyGraded",
      timestamp: receipt.timestamp,
      comment: "Well done",
    });
    expect(scores[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("issues strictly increasing timestamps even within the same millisecond", async () => {
    const lineItem = mock.addLineItem(COURSE, { label: "Rapid", scoreMaximum: 10 });
    const frozen = new Date();
    const ags = new AgsClient(new AccessTokenClient({ fetch: mock.fetch, now: clock }), { now: () => frozen });
    for (const scoreGiven of [1, 2, 3]) unwrap(await ags.publishScore(staticConnection, lineItem.id, { userId: "lms-user-1", scoreGiven, scoreMaximum: 10 }));
    const stamps = scoresFor(lineItem).map((s) => Date.parse(s.timestamp));
    expect(stamps).toEqual([frozen.getTime(), frozen.getTime() + 1, frozen.getTime() + 2]);
  });

  it("maps platform responses to typed errors and records nothing on failure", async () => {
    const lineItem = mock.addLineItem(COURSE, { label: "Errors", scoreMaximum: 10 });
    const score = { userId: "lms-user-1", scoreGiven: 5, scoreMaximum: 10 };
    const ags = client();

    for (const [status, code] of [
      [401, "permission_denied"],
      [403, "permission_denied"],
      [500, "platform_error"],
      [503, "platform_error"],
      [429, "platform_error"],
      [422, "bad_request"],
    ] as const) {
      mock.failScores(status);
      const result = await ags.publishScore(staticConnection, lineItem.id, score);
      expectFailure(result, code);
      if (!result.ok) expect(result.error.status).toBe(status);
    }
    mock.clearScoreFailures();

    expectFailure(await ags.publishScore(staticConnection, `${mock.lineItemsUrl(COURSE)}/999999`, score), "bad_request");
    expectFailure(await ags.publishScore(staticConnection, lineItem.id, { ...score, scoreGiven: Number.NaN }), "bad_request");
    expectFailure(await ags.publishScore(staticConnection, lineItem.id, { ...score, scoreMaximum: 0 }), "bad_request");
    expectFailure(await ags.publishScore(staticConnection, "http://insecure.example.test/line_items/1", score), "bad_request");
    expectFailure(await new AgsClient(new AccessTokenClient({ fetch: failingFetch })).publishScore(staticConnection, lineItem.id, score), "platform_error");

    mock.grantableScopes = [AGS_SCOPE.lineItem];
    expectFailure(await client().publishScore(staticConnection, lineItem.id, score), "permission_denied");
    expect(scoresFor(lineItem)).toHaveLength(0);
  });

  it("refreshes a token the platform no longer accepts and retries once", async () => {
    const lineItem = mock.addLineItem(COURSE, { label: "Revoked", scoreMaximum: 10 });
    const ags = client();
    unwrap(await ags.publishScore(staticConnection, lineItem.id, { userId: "lms-user-1", scoreGiven: 1, scoreMaximum: 10 }));
    mock.revokeTokens();
    unwrap(await ags.publishScore(staticConnection, lineItem.id, { userId: "lms-user-1", scoreGiven: 2, scoreMaximum: 10 }));
    expect(scoresFor(lineItem).map((s) => s.scoreGiven)).toEqual([1, 2]);
  });

  it("finds and creates line items", async () => {
    const ags = client();
    const url = mock.lineItemsUrl("course-li");
    expect(unwrap(await ags.findLineItem(staticConnection, url, { resourceLinkId: "rl-x" }))).toBeNull();
    const created = unwrap(await ags.createLineItem(staticConnection, url, { label: "Unit 1 test", scoreMaximum: 50, resourceLinkId: "rl-x", resourceId: "aceap-1" }));
    expect(created).toMatchObject({ label: "Unit 1 test", scoreMaximum: 50, resourceLinkId: "rl-x", resourceId: "aceap-1" });
    expect(created.id.startsWith(url)).toBe(true);
    expect(unwrap(await ags.findLineItem(staticConnection, url, { resourceLinkId: "rl-x" }))).toEqual(created);
    expect(unwrap(await ags.findLineItem(staticConnection, url, { resourceId: "nope" }))).toBeNull();
    expectFailure(await ags.createLineItem(staticConnection, url, { label: " ", scoreMaximum: 50 }), "bad_request");
  });
});

// ─────────────────────────────────── NRPS ───────────────────────────────────

describe("NRPS roster", () => {
  it("parses Link headers", () => {
    const current = "https://lms.example.test/api/lti/courses/1/names_and_roles?page=1";
    expect(parseNextLink(null, current)).toBeNull();
    expect(parseNextLink('<https://lms.example.test/a?page=1>; rel="current"', current)).toBeNull();
    expect(parseNextLink('<https://lms.example.test/a?page=1>; rel="current", <https://lms.example.test/a?page=2&x=1,2>; rel="next"', current)).toBe("https://lms.example.test/a?page=2&x=1,2");
    expect(parseNextLink("</api/lti/courses/1/names_and_roles?page=2>; rel=next", current)).toBe("https://lms.example.test/api/lti/courses/1/names_and_roles?page=2");
    expect(parseNextLink('<https://lms.example.test/a?page=9>; rel="last"; title="next"', current)).toBeNull();
  });

  it("follows rel=next pagination and only passes on names and e-mails the platform provided", async () => {
    const before = mock.requests.length;
    const nrps = new NrpsClient(new AccessTokenClient({ fetch: mock.fetch, now: clock }));
    const roster = unwrap(await nrps.fetchRoster(staticConnection, mock.membershipsUrl(COURSE), { limit: 2 }));

    expect(roster.pages).toBe(3);
    expect(roster.contextId).toBe(COURSE);
    expect(mock.requests.slice(before).filter((r) => r.url.includes("names_and_roles"))).toHaveLength(3);
    expect(roster.members).toEqual([
      { userId: "u-1", roles: [ROLE.instructor], status: "Active", name: "Ada Teacher", email: "ada@example.test" },
      { userId: "u-2", roles: [ROLE.learner], status: "Active", name: "Ben Learner", givenName: "Ben", familyName: "Learner" },
      { userId: "u-3", roles: [ROLE.learner], status: "Active" },
      { userId: "u-4", roles: [ROLE.learner], status: "Inactive" },
      { userId: "u-5", roles: [ROLE.learner], status: "Active", email: "eve@example.test" },
    ]);

    const learners = unwrap(await adapter.fetchRoster(staticConnection, mock.membershipsUrl(COURSE), { role: ROLE.learner }));
    expect(learners.members.map((m) => m.userId)).toEqual(["u-2", "u-3", "u-4", "u-5"]);
    expect(learners.pages).toBe(1);
  });

  it("stops on runaway pagination and reports missing scope", async () => {
    const nrps = new NrpsClient(new AccessTokenClient({ fetch: mock.fetch, now: clock }));
    expectFailure(await nrps.fetchRoster(staticConnection, mock.membershipsUrl(COURSE), { limit: 1, maxPages: 2 }), "platform_error");
    mock.grantableScopes = [AGS_SCOPE.score];
    expectFailure(await new NrpsClient(new AccessTokenClient({ fetch: mock.fetch, now: clock })).fetchRoster(staticConnection, mock.membershipsUrl(COURSE)), "permission_denied");
  });
});

// ────────────────────────────── Canvas defaults ─────────────────────────────

describe("Canvas endpoint defaults", () => {
  it("suggests documented endpoints but only as a pre-fill", () => {
    expect(canvasEndpointDefaults(CANVAS_PRODUCTION_ISSUER)).toEqual({
      authLoginUrl: "https://sso.canvaslms.com/api/lti/authorize_redirect",
      authTokenUrl: "https://canvas.instructure.com/login/oauth2/token",
      jwksUrl: "https://sso.canvaslms.com/api/lti/security/jwks",
      instructureHosted: true,
    });
    expect(canvasEndpointDefaults("https://canvas.myschool.example")).toEqual({
      authLoginUrl: "https://canvas.myschool.example/api/lti/authorize_redirect",
      authTokenUrl: "https://canvas.myschool.example/login/oauth2/token",
      jwksUrl: "https://canvas.myschool.example/api/lti/security/jwks",
      instructureHosted: false,
    });
    expect(canvasEndpointDefaults("nonsense")).toBeNull();
  });
});

// ─────────────────────────── Service: configuration ─────────────────────────

describe("integration service: configuration and honesty", () => {
  it("reports not_configured when nothing is set up", async () => {
    const overview = await getIntegrationOverview(otherOrgId);
    expect(overview.status).toBe("not_configured");
    expect(overview.statusLabel).toMatch(/not configured/i);
    expect(overview.connections).toEqual([]);
    expect(overview.jobCounts).toEqual({ pending: 0, synced: 0, failed: 0, blocked: 0, superseded: 0, total: 0 });
    expect(overview.toolKey).toEqual({ configured: true, kid: "test-tool-key" });
    expect(overview.toolEndpoints).toEqual({ loginUrl: `${APP_BASE_URL}/api/lti/login`, launchUrl: LAUNCH_URL, jwksUrl: `${APP_BASE_URL}/api/lti/jwks` });

    const withoutKey = await withoutToolKey(() => getIntegrationOverview(otherOrgId));
    expect(withoutKey.status).toBe("not_configured");
    expect(withoutKey.toolKey.configured).toBe(false);
    expect(withoutKey.warnings.map((w) => w.kind)).toContain("tool_key_missing");
    expect((await getIntegrationOverview("not-a-uuid")).status).toBe("not_configured");
  });

  it("validates connection settings", async () => {
    const result = await saveConnection(orgId, teacherId, { ...mock.connectionInput(), deploymentId: "", jwksUrl: "http://lms.example.test/jwks", authLoginUrl: "nope" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("validation");
    expect(result.error.issues?.map((i) => i.path).sort()).toEqual(["authLoginUrl", "deploymentId", "jwksUrl"]);

    const local = await saveConnection(orgId, teacherId, {
      issuer: "http://localhost:3001",
      clientId: "local-client",
      deploymentId: "local-deployment",
      authLoginUrl: "http://localhost:3001/auth",
      authTokenUrl: "http://localhost:3001/token",
      jwksUrl: "http://127.0.0.1:3001/jwks",
    });
    expect(local.ok).toBe(true);
  });

  it("stores a connection as configured_unverified, audits it and enforces ownership", async () => {
    const input = { ...mock.connectionInput(), deploymentId: "ownership-deployment" };
    const forbidden = await saveConnection(orgId, outsiderId, input);
    expect(forbidden.ok ? "ok" : forbidden.error.code).toBe("forbidden");

    const saved = unwrap(await saveConnection(orgId, teacherId, input));
    expect(saved.status).toBe("configured_unverified");
    expect(saved.lastVerifiedAt).toBeNull();
    expect(saved.organizationId).toBe(orgId);

    const db = await getDb();
    const audit = await db.select().from(auditLogs).where(eq(auditLogs.entityId, saved.id));
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ actorId: teacherId, action: "lms_connection.created", entityType: "lms_connection", organizationId: orgId });
    expect(JSON.stringify(audit[0].metadata)).not.toMatch(/PRIVATE KEY/);

    // Saving the same triple again updates in place (no duplicate row).
    const again = unwrap(await saveConnection(orgId, teacherId, input));
    expect(again.id).toBe(saved.id);

    // Another organisation cannot claim the same deployment.
    await db.insert(organizationMemberships).values({ organizationId: otherOrgId, userId: outsiderId, role: "school_admin" });
    const conflict = await saveConnection(otherOrgId, outsiderId, input);
    expect(conflict.ok ? "ok" : conflict.error.code).toBe("conflict");
    const stillNone = await getIntegrationOverview(otherOrgId);
    expect(stillNone.status).toBe("not_configured");
  });

  it("never reports an unreachable or unconfigured integration as verified", async () => {
    const connection = await newConnection();

    const unreachable = unwrap(await runDiagnostics(connection.id, { fetch: failingFetch }));
    expect(unreachable.status).toBe("error");
    expect(unreachable.checks.map((c) => [c.check, c.ok])).toEqual([
      ["tool_key", true],
      ["platform_jwks", false],
      ["token_grant", false],
    ]);

    const db = await getDb();
    const [row] = await db.select().from(lmsConnections).where(eq(lmsConnections.id, connection.id));
    expect(row.status).toBe("error");
    expect(row.lastVerifiedAt).toBeNull();
    expect(row.lastError).toContain("platform_jwks");

    const noKey = unwrap(await withoutToolKey(() => runDiagnostics(connection.id, { fetch: mock.fetch, now: clock })));
    expect(noKey.status).toBe("error");
    expect(noKey.checks.find((c) => c.check === "tool_key")?.ok).toBe(false);
    expect(noKey.checks.find((c) => c.check === "token_grant")?.detail).toMatch(/Not attempted/);

    mock.grantableScopes = [AGS_SCOPE.lineItem];
    const noScope = unwrap(await runDiagnostics(connection.id, { fetch: mock.fetch, now: clock }));
    expect(noScope.status).toBe("error");
    expect(noScope.checks.find((c) => c.check === "token_grant")?.ok).toBe(false);

    const overview = await getIntegrationOverview(orgId);
    expect(overview.status).toBe("error");
    expect(overview.connections.find((c) => c.id === connection.id)?.status).toBe("error");
    expect((await runDiagnostics("00000000-0000-4000-8000-000000000000")).ok).toBe(false);
  });

  it("marks a connection verified only after every diagnostic passed, and resets it when settings change", async () => {
    const connection = await newConnection();
    const report = unwrap(await runDiagnostics(connection.id, { fetch: mock.fetch, now: clock }));
    expect(report.checks.every((c) => c.ok)).toBe(true);
    expect(report.status).toBe("verified");

    const db = await getDb();
    const [row] = await db.select().from(lmsConnections).where(eq(lmsConnections.id, connection.id));
    expect(row.status).toBe("verified");
    expect(row.lastVerifiedAt).toBeInstanceOf(Date);
    expect(row.lastError).toBeNull();

    // If the tool key disappears, the overview stops calling the connection verified.
    const withoutKey = await withoutToolKey(() => getIntegrationOverview(orgId));
    const downgraded = withoutKey.connections.find((c) => c.id === connection.id);
    expect(downgraded?.status).toBe("configured_unverified");
    expect(downgraded?.statusNote).toMatch(/Run diagnostics again/);

    const changed = unwrap(await saveConnection(orgId, teacherId, { ...connection, jwksUrl: `${mock.jwksUrl}?rotated=1` }));
    expect(changed.id).toBe(connection.id);
    expect(changed.status).toBe("configured_unverified");
    expect(changed.lastVerifiedAt).toBeNull();
  });
});

// ────────────────────────────── Service: mappings ───────────────────────────

describe("integration service: mappings", () => {
  it("links identities only explicitly and refuses conflicting remaps", async () => {
    const connection = await newConnection();
    const alice = await newStudent(null, "Alice Smith");
    const namesake = await newStudent(null, "Alice Smith");

    const first = unwrap(await linkIdentity(connection.id, "lms-alice", alice, "lti_launch_signed_in"));
    expect(first).toMatchObject({ created: true, linkedVia: "lti_launch_signed_in", userId: alice });

    // Idempotent for the same pair.
    expect(unwrap(await linkIdentity(connection.id, "lms-alice", alice, "admin_confirmed"))).toMatchObject({ created: false, linkedVia: "lti_launch_signed_in" });

    // Same LMS user → different AceAP user: refused, even though the names match.
    const remap = await linkIdentity(connection.id, "lms-alice", namesake, "admin_confirmed");
    expect(remap.ok ? "ok" : remap.error.code).toBe("conflict");

    // Same AceAP user → second LMS identity on the same connection: refused.
    const second = await linkIdentity(connection.id, "lms-alice-2", alice, "admin_confirmed");
    expect(second.ok ? "ok" : second.error.code).toBe("conflict");

    // The namesake is still unlinked: nothing was inferred from the matching name.
    expect(await getLinkedUserId(connection.id, "lms-alice")).toBe(alice);
    expect(await getLinkedUserId(connection.id, "lms-namesake")).toBeNull();
    const status = await linkIdentity(connection.id, "lms-namesake", namesake, "admin_confirmed");
    expect(unwrap(status).created).toBe(true);
    expect(await getLinkedUserId(connection.id, "lms-namesake")).toBe(namesake);

    const missing = await linkIdentity(connection.id, "lms-ghost", "00000000-0000-4000-8000-000000000000", "admin_confirmed");
    expect(missing.ok ? "ok" : missing.error.code).toBe("not_found");
    const blank = await linkIdentity(connection.id, "  ", alice, "admin_confirmed");
    expect(blank.ok ? "ok" : blank.error.code).toBe("validation");
  });

  it("maps courses and assignments within the connection's organisation only", async () => {
    const connection = await newConnection();
    const classId = await newClass();
    const assignmentId = await newAssignment(classId);
    const foreignClass = await newClass(otherOrgId);
    const foreignAssignment = await newAssignment(foreignClass);

    const course = unwrap(await mapCourse({ connectionId: connection.id, externalCourseId: COURSE, classId, membershipsUrl: mock.membershipsUrl(COURSE) }));
    expect(course).toEqual({ connectionId: connection.id, externalCourseId: COURSE, classId, membershipsUrl: mock.membershipsUrl(COURSE) });
    const foreignCourse = await mapCourse({ connectionId: connection.id, externalCourseId: "c-2", classId: foreignClass });
    expect(foreignCourse.ok ? "ok" : foreignCourse.error.code).toBe("forbidden");

    const mapped = unwrap(await mapAssignment({ connectionId: connection.id, assignmentId, resourceLinkId: "rl-1" }));
    expect(mapped.lineItemUrl).toBeNull();
    // Adding the line item later keeps the resource link; omitting it later keeps the line item.
    const withLineItem = unwrap(await mapAssignment({ connectionId: connection.id, assignmentId, resourceLinkId: "rl-1", lineItemUrl: mock.lineItemUrl(COURSE, "1") }));
    expect(withLineItem.lineItemUrl).toBe(mock.lineItemUrl(COURSE, "1"));
    expect(unwrap(await mapAssignment({ connectionId: connection.id, assignmentId, resourceLinkId: "rl-1" })).lineItemUrl).toBe(mock.lineItemUrl(COURSE, "1"));

    const foreign = await mapAssignment({ connectionId: connection.id, assignmentId: foreignAssignment, resourceLinkId: "rl-2" });
    expect(foreign.ok ? "ok" : foreign.error.code).toBe("forbidden");
    const insecure = await mapAssignment({ connectionId: connection.id, assignmentId, resourceLinkId: "rl-1", lineItemUrl: "http://lms.example.test/li/1" });
    expect(insecure.ok ? "ok" : insecure.error.code).toBe("validation");

    // The overview warns about what is still unmapped in the mapped class.
    await newAssignment(classId);
    await newStudent(classId);
    const overview = await getIntegrationOverview(orgId);
    const mine = overview.warnings.filter((w) => w.connectionId === connection.id && w.classId === classId);
    expect(mine.map((w) => [w.kind, w.count]).sort()).toEqual([
      ["assignments_unmapped", 1],
      ["students_unlinked", 1],
    ]);
  });
});

// ───────────────────────────── Service: grade sync ──────────────────────────

describe("integration service: grade passback", () => {
  it("syncs a grade only after the platform accepted it, exactly once", async () => {
    const f = await gradeFixture();
    const [student] = f.students;
    const queued = unwrap(await enqueueGradeSync({ connectionId: f.connection.id, assignmentId: f.assignmentId, studentId: student.id, scoreGiven: 85, scoreMaximum: 100, comment: "Nice work" }));
    expect(queued.created).toBe(true);
    expect(queued.job).toMatchObject({ status: "pending", attempts: 0, syncedAt: null, scoreGiven: 85, scoreMaximum: 100, comment: "Nice work" });
    expect(scoresFor(f.lineItem)).toHaveLength(0);

    const outcome = unwrap(await processSyncJob(queued.job.id, adapter));
    expect(outcome).toMatchObject({ status: "synced", attempted: true, attempts: 1, error: null });

    const row = await jobRow(queued.job.id);
    expect(row.status).toBe("synced");
    expect(row.syncedAt).toBeInstanceOf(Date);
    expect(row.lastError).toBeNull();
    expect(scoresFor(f.lineItem)).toEqual([expect.objectContaining({ userId: student.externalId, scoreGiven: 85, scoreMaximum: 100, comment: "Nice work", gradingProgress: "FullyGraded" })]);

    // A synced job is never re-sent.
    const again = unwrap(await processSyncJob(queued.job.id, adapter));
    expect(again).toMatchObject({ status: "synced", attempted: false });
    expect(unwrap(await processPendingJobs(f.connection.id, adapter)).processed).toBe(0);
    expect(scoresFor(f.lineItem)).toHaveLength(1);

    const logs = await logsFor(queued.job.id);
    expect(logs.map((l) => l.level)).toEqual(["info", "info"]);
    expect(logs[0].message).toBe("Queued grade 85/100.");
    expect(logs[1].message).toMatch(/accepted by the LMS \(HTTP 200\)/);
  });

  it("does not duplicate a job or a score when the same grade is enqueued again", async () => {
    const f = await gradeFixture();
    const input = { connectionId: f.connection.id, assignmentId: f.assignmentId, studentId: f.students[0].id, scoreGiven: 70, scoreMaximum: 100 };
    const first = unwrap(await enqueueGradeSync(input));
    const duplicate = unwrap(await enqueueGradeSync({ ...input, scoreGiven: 70.0 }));
    expect(duplicate).toMatchObject({ created: false, requeued: false });
    expect(duplicate.job.id).toBe(first.job.id);
    expect(gradeIdempotencyKey(input)).toBe(gradeIdempotencyKey({ ...input, connectionId: input.connectionId.toUpperCase() }));

    unwrap(await processPendingJobs(f.connection.id, adapter));
    // Enqueueing the already-synced grade again is still a no-op.
    const afterSync = unwrap(await enqueueGradeSync(input));
    expect(afterSync).toMatchObject({ created: false, requeued: false });
    expect(afterSync.job.status).toBe("synced");
    expect(unwrap(await processPendingJobs(f.connection.id, adapter)).processed).toBe(0);

    const db = await getDb();
    expect(await db.select().from(syncJobs).where(eq(syncJobs.connectionId, f.connection.id))).toHaveLength(1);
    expect(scoresFor(f.lineItem)).toHaveLength(1);
  });

  it("creates a new job for a changed grade and never delivers the stale one", async () => {
    const f = await gradeFixture();
    const base = { connectionId: f.connection.id, assignmentId: f.assignmentId, studentId: f.students[0].id, scoreMaximum: 100 };
    const first = unwrap(await enqueueGradeSync({ ...base, scoreGiven: 60 }));
    const second = unwrap(await enqueueGradeSync({ ...base, scoreGiven: 90 }));
    expect(second.created).toBe(true);
    expect(second.job.id).not.toBe(first.job.id);

    // The undelivered older grade is superseded, not sent later.
    const stale = await jobRow(first.job.id);
    expect(stale.status).toBe("failed");
    expect(stale.lastError).toMatch(/^superseded:/);
    const retry = await retrySyncJob(first.job.id, teacherId);
    expect(retry.ok ? "ok" : retry.error.code).toBe("conflict");

    const summary = unwrap(await processPendingJobs(f.connection.id, adapter));
    expect(summary).toMatchObject({ processed: 1, synced: 1 });
    expect(scoresFor(f.lineItem).map((s) => s.scoreGiven)).toEqual([90]);

    // Going back to an earlier value queues that grade again instead of leaving the LMS on 90.
    const reverted = unwrap(await enqueueGradeSync({ ...base, scoreGiven: 60 }));
    expect(reverted).toMatchObject({ created: false, requeued: true });
    expect(reverted.job.id).toBe(first.job.id);
    expect(reverted.job.status).toBe("pending");
    unwrap(await processPendingJobs(f.connection.id, adapter));
    expect(scoresFor(f.lineItem).map((s) => s.scoreGiven)).toEqual([90, 60]);

    const counts = (await getIntegrationOverview(orgId)).jobCounts;
    expect(counts.total).toBe(counts.pending + counts.synced + counts.failed + counts.blocked + counts.superseded);
  });

  it("blocks grades for unmapped assignments and unlinked students instead of dropping or syncing them", async () => {
    const f = await gradeFixture({ mapAssignment: false, linkStudents: false });
    const student = f.students[0];
    const input = { connectionId: f.connection.id, assignmentId: f.assignmentId, studentId: student.id, scoreGiven: 50, scoreMaximum: 100 };

    const queued = unwrap(await enqueueGradeSync(input));
    expect(queued.created).toBe(true);
    expect(queued.job.status).toBe("blocked");
    expect(queued.job.lastError).toMatch(/^missing_mapping: the assignment is not linked to an LMS assignment; the student has not linked an LMS account\.$/);
    expect(queued.job.syncedAt).toBeNull();

    // Blocked jobs are not picked up, and nothing reaches the platform.
    expect(unwrap(await processPendingJobs(f.connection.id, adapter)).processed).toBe(0);
    expect(unwrap(await processSyncJob(queued.job.id, adapter))).toMatchObject({ status: "blocked", attempted: false });
    expect(scoresFor(f.lineItem)).toHaveLength(0);
    expect((await logsFor(queued.job.id)).at(-1)?.level).toBe("error");

    // Mapping the assignment without a line item is still not enough.
    unwrap(await mapAssignment({ connectionId: f.connection.id, assignmentId: f.assignmentId, resourceLinkId: "rl-blocked" }));
    unwrap(await retrySyncJob(queued.job.id, teacherId));
    const stillBlocked = unwrap(await processSyncJob(queued.job.id, adapter));
    expect(stillBlocked).toMatchObject({ status: "blocked", attempted: false });
    expect(stillBlocked.error).toMatch(/line item.*not known yet.*has not linked an LMS account/);

    // Completing both mappings re-queues the job automatically; then it syncs.
    const mapped = unwrap(await mapAssignment({ connectionId: f.connection.id, assignmentId: f.assignmentId, resourceLinkId: "rl-blocked", lineItemUrl: f.lineItem.id }));
    expect(mapped.requeuedJobs).toBe(1);
    expect(unwrap(await processSyncJob(queued.job.id, adapter))).toMatchObject({ status: "blocked", attempted: false });
    unwrap(await linkIdentity(f.connection.id, student.externalId, student.id, "admin_confirmed"));
    expect((await jobRow(queued.job.id)).status).toBe("pending");
    expect(unwrap(await processSyncJob(queued.job.id, adapter))).toMatchObject({ status: "synced", attempted: true });
    expect(scoresFor(f.lineItem).map((s) => [s.userId, s.scoreGiven])).toEqual([[student.externalId, 50]]);

    const bad = await enqueueGradeSync({ ...input, scoreGiven: -1 });
    expect(bad.ok ? "ok" : bad.error.code).toBe("validation");
    const ghost = await enqueueGradeSync({ ...input, assignmentId: "00000000-0000-4000-8000-000000000000" });
    expect(ghost.ok ? "ok" : ghost.error.code).toBe("not_found");
  });

  it.each([401, 403])("blocks the job when the platform answers %i", async (status) => {
    const f = await gradeFixture();
    const queued = unwrap(await enqueueGradeSync({ connectionId: f.connection.id, assignmentId: f.assignmentId, studentId: f.students[0].id, scoreGiven: 40, scoreMaximum: 100 }));
    mock.failScores(status);
    const outcome = unwrap(await processSyncJob(queued.job.id, adapter));
    expect(outcome).toMatchObject({ status: "blocked", attempted: true, attempts: 1 });
    expect(outcome.error).toMatch(new RegExp(`^permission_denied: .*HTTP ${status}`));

    const row = await jobRow(queued.job.id);
    expect(row.status).toBe("blocked");
    expect(row.syncedAt).toBeNull();
    // Blocked jobs are not retried automatically.
    mock.clearScoreFailures();
    expect(unwrap(await processPendingJobs(f.connection.id, adapter)).processed).toBe(0);
    expect(scoresFor(f.lineItem)).toHaveLength(0);
    const logs = await logsFor(queued.job.id);
    expect(logs.at(-1)).toMatchObject({ level: "error" });
    expect(logs.at(-1)?.message).toMatch(/^Blocked on attempt 1/);
  });

  it("blocks the job when the score scope is not granted", async () => {
    const f = await gradeFixture();
    const queued = unwrap(await enqueueGradeSync({ connectionId: f.connection.id, assignmentId: f.assignmentId, studentId: f.students[0].id, scoreGiven: 40, scoreMaximum: 100 }));
    mock.grantableScopes = [NRPS_SCOPE];
    const outcome = unwrap(await processSyncJob(queued.job.id, adapter));
    expect(outcome.status).toBe("blocked");
    expect(outcome.error).toMatch(/^permission_denied/);
    expect(scoresFor(f.lineItem)).toHaveLength(0);
  });

  it("retries a 500 and fails after the maximum number of attempts, logging every attempt", async () => {
    const f = await gradeFixture();
    const queued = unwrap(await enqueueGradeSync({ connectionId: f.connection.id, assignmentId: f.assignmentId, studentId: f.students[0].id, scoreGiven: 30, scoreMaximum: 100 }));
    mock.failScores(500);

    const first = unwrap(await processPendingJobs(f.connection.id, adapter, { maxAttempts: 3 }));
    expect(first).toMatchObject({ processed: 1, pending: 1, failed: 0, synced: 0 });
    expect(await jobRow(queued.job.id)).toMatchObject({ status: "pending", attempts: 1 });

    const second = unwrap(await processPendingJobs(f.connection.id, adapter, { maxAttempts: 3 }));
    expect(second.outcomes[0]).toMatchObject({ status: "pending", attempts: 2, attempted: true });

    const third = unwrap(await processPendingJobs(f.connection.id, adapter, { maxAttempts: 3 }));
    expect(third).toMatchObject({ processed: 1, failed: 1, pending: 0 });
    const row = await jobRow(queued.job.id);
    expect(row).toMatchObject({ status: "failed", attempts: 3, syncedAt: null });
    expect(row.lastError).toMatch(/^platform_error: .*HTTP 500/);

    // Failed jobs are left alone until someone retries them.
    expect(unwrap(await processPendingJobs(f.connection.id, adapter, { maxAttempts: 3 })).processed).toBe(0);
    expect(scoresFor(f.lineItem)).toHaveLength(0);

    const logs = await logsFor(queued.job.id);
    expect(logs.map((l) => l.level)).toEqual(["info", "error", "error", "error"]);
    expect(logs[1].message).toMatch(/^Attempt 1 of 3 failed/);
    expect(logs[2].message).toMatch(/^Attempt 2 of 3 failed/);
    expect(logs[3].message).toMatch(/^Giving up after 3 attempts/);
  });

  it("uses five attempts by default and recovers when the platform comes back", async () => {
    const f = await gradeFixture();
    const queued = unwrap(await enqueueGradeSync({ connectionId: f.connection.id, assignmentId: f.assignmentId, studentId: f.students[0].id, scoreGiven: 20, scoreMaximum: 100 }));
    mock.failScores(503, 4);
    for (let i = 0; i < 4; i += 1) expect(unwrap(await processPendingJobs(f.connection.id, adapter)).pending).toBe(1);
    expect(await jobRow(queued.job.id)).toMatchObject({ status: "pending", attempts: 4 });
    expect(unwrap(await processPendingJobs(f.connection.id, adapter))).toMatchObject({ synced: 1 });
    expect(await jobRow(queued.job.id)).toMatchObject({ status: "synced", attempts: 5 });
    expect(scoresFor(f.lineItem)).toHaveLength(1);
  });

  it("fails immediately on a non-retryable rejection and treats a throwing adapter as transient", async () => {
    const f = await gradeFixture();
    const queued = unwrap(await enqueueGradeSync({ connectionId: f.connection.id, assignmentId: f.assignmentId, studentId: f.students[0].id, scoreGiven: 10, scoreMaximum: 100 }));
    const throwing: LmsAdapter = {
      ...adapter,
      platform: "canvas",
      publishScore: async () => {
        throw new Error("boom: secret internal detail");
      },
    };
    const transient = unwrap(await processSyncJob(queued.job.id, throwing));
    expect(transient).toMatchObject({ status: "pending", attempted: true, attempts: 1 });
    expect(transient.error).not.toContain("secret internal detail");

    mock.failScores(422);
    const rejected = unwrap(await processSyncJob(queued.job.id, adapter));
    expect(rejected).toMatchObject({ status: "failed", attempts: 2 });
    expect(rejected.error).toMatch(/^bad_request/);
    expect((await logsFor(queued.job.id)).at(-1)?.message).toMatch(/not retryable/);
    expect(scoresFor(f.lineItem)).toHaveLength(0);
  });

  it("never marks grades synced while the platform is unreachable", async () => {
    const f = await gradeFixture();
    const queued = unwrap(await enqueueGradeSync({ connectionId: f.connection.id, assignmentId: f.assignmentId, studentId: f.students[0].id, scoreGiven: 99, scoreMaximum: 100 }));
    const offline = createCanvasAdapter({ fetch: failingFetch });
    for (let i = 0; i < 6; i += 1) unwrap(await processPendingJobs(f.connection.id, offline));
    const row = await jobRow(queued.job.id);
    expect(row).toMatchObject({ status: "failed", attempts: 5, syncedAt: null });

    const view = unwrap(await getSyncStatusForGrades(f.connection.id, f.assignmentId));
    expect(view.students.map((s) => s.status)).toEqual(["failed"]);
    expect(view.students.some((s) => s.syncedAt !== null)).toBe(false);
    const overview = await getIntegrationOverview(orgId);
    expect(overview.connections.find((c) => c.id === f.connection.id)?.status).toBe("configured_unverified");
  });

  it("lets staff retry a failed job manually", async () => {
    const f = await gradeFixture();
    const queued = unwrap(await enqueueGradeSync({ connectionId: f.connection.id, assignmentId: f.assignmentId, studentId: f.students[0].id, scoreGiven: 75, scoreMaximum: 100 }));
    mock.failScores(500);
    unwrap(await processSyncJob(queued.job.id, adapter, { maxAttempts: 1 }));
    expect((await jobRow(queued.job.id)).status).toBe("failed");
    mock.clearScoreFailures();

    const denied = await retrySyncJob(queued.job.id, outsiderId);
    expect(denied.ok ? "ok" : denied.error.code).toBe("forbidden");
    expect((await jobRow(queued.job.id)).status).toBe("failed");

    const retried = unwrap(await retrySyncJob(queued.job.id, teacherId));
    expect(retried).toMatchObject({ status: "pending", attempts: 0, lastError: null });
    const logs = await logsFor(queued.job.id);
    expect(logs.at(-1)?.message).toBe(`Manual retry requested by user ${teacherId} (was failed).`);
    const db = await getDb();
    const audit = await db.select().from(auditLogs).where(eq(auditLogs.entityId, queued.job.id));
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ actorId: teacherId, action: "sync_job.retry_requested", organizationId: orgId });

    expect(unwrap(await processSyncJob(queued.job.id, adapter))).toMatchObject({ status: "synced", attempts: 1 });
    expect(scoresFor(f.lineItem)).toHaveLength(1);

    // Synced and pending jobs cannot be "retried".
    const synced = await retrySyncJob(queued.job.id, teacherId);
    expect(synced.ok ? "ok" : synced.error.code).toBe("conflict");
    const unknown = await retrySyncJob("00000000-0000-4000-8000-000000000000", teacherId);
    expect(unknown.ok ? "ok" : unknown.error.code).toBe("not_found");
  });

  it("reports per-student status, with not_queued for students that have no job", async () => {
    const f = await gradeFixture({ students: 3 });
    const [a, b, c] = f.students;
    const base = { connectionId: f.connection.id, assignmentId: f.assignmentId, scoreMaximum: 100 };
    const synced = unwrap(await enqueueGradeSync({ ...base, studentId: a.id, scoreGiven: 91 }));
    unwrap(await processSyncJob(synced.job.id, adapter));
    const pending = unwrap(await enqueueGradeSync({ ...base, studentId: b.id, scoreGiven: 82 }));

    const status = unwrap(await getSyncStatusForGrades(f.connection.id, f.assignmentId));
    expect(status).toMatchObject({ assignmentMapped: true, lineItemKnown: true });
    const byStudent = new Map(status.students.map((s) => [s.studentId, s]));
    expect(byStudent.size).toBe(3);
    expect(byStudent.get(a.id)).toMatchObject({ status: "synced", jobId: synced.job.id, scoreGiven: 91, identityLinked: true });
    expect(byStudent.get(a.id)?.syncedAt).toBeInstanceOf(Date);
    expect(byStudent.get(b.id)).toMatchObject({ status: "pending", jobId: pending.job.id, scoreGiven: 82, syncedAt: null });
    expect(byStudent.get(c.id)).toEqual({
      studentId: c.id,
      studentName: expect.stringMatching(/^Student /),
      status: "not_queued",
      identityLinked: true,
      jobId: null,
      scoreGiven: null,
      scoreMaximum: null,
      attempts: 0,
      lastError: null,
      syncedAt: null,
      updatedAt: null,
    });

    // An unmapped assignment on the same connection shows everyone as not_queued — never synced.
    const other = await newAssignment(f.classId);
    const unmapped = unwrap(await getSyncStatusForGrades(f.connection.id, other));
    expect(unmapped).toMatchObject({ assignmentMapped: false, lineItemKnown: false });
    expect(unmapped.students.map((s) => s.status)).toEqual(["not_queued", "not_queued", "not_queued"]);
    expect((await getSyncStatusForGrades(f.connection.id, "00000000-0000-4000-8000-000000000000")).ok).toBe(false);
  });

  it("lists jobs with recent log lines for reconciliation", async () => {
    const f = await gradeFixture({ students: 2 });
    const base = { connectionId: f.connection.id, assignmentId: f.assignmentId, scoreMaximum: 100 };
    const good = unwrap(await enqueueGradeSync({ ...base, studentId: f.students[0].id, scoreGiven: 88 }));
    const bad = unwrap(await enqueueGradeSync({ ...base, studentId: f.students[1].id, scoreGiven: 44 }));
    unwrap(await processSyncJob(good.job.id, adapter));
    mock.failScores(500);
    unwrap(await processSyncJob(bad.job.id, adapter, { maxAttempts: 1 }));

    const failed = (await listSyncJobs(orgId, { status: "failed", limit: 200 })).filter((j) => j.connectionId === f.connection.id);
    expect(failed).toHaveLength(1);
    expect(failed[0]).toMatchObject({ id: bad.job.id, status: "failed", superseded: false, scoreGiven: 44, studentName: expect.stringMatching(/^Student /), assignmentTitle: expect.stringMatching(/^Assignment /) });
    expect(failed[0].recentLogs.map((l) => l.level)).toEqual(["error", "info"]);
    expect(failed[0].recentLogs[0].message).toMatch(/^Giving up after 1 attempts/);

    const all = (await listSyncJobs(orgId, { limit: 200, logLines: 1 })).filter((j) => j.connectionId === f.connection.id);
    expect(all.map((j) => j.status).sort()).toEqual(["failed", "synced"]);
    expect(all.every((j) => j.recentLogs.length === 1)).toBe(true);
    expect(await listSyncJobs(otherOrgId)).toEqual([]);

    const counts = (await getIntegrationOverview(orgId)).jobCounts;
    expect(counts.synced).toBeGreaterThanOrEqual(1);
    expect(counts.failed).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────── Routes ─────────────────────────────────

describe("LTI route handlers", () => {
  it("serves the public JWKS with cache headers", async () => {
    const response = jwksGet();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("max-age=300");
    const body = (await response.json()) as { keys: Record<string, unknown>[] };
    expect(body.keys).toHaveLength(1);
    expect(body.keys[0]).toMatchObject({ kty: "RSA", kid: "test-tool-key", alg: "RS256", use: "sig" });
    expect(body.keys[0]).not.toHaveProperty("d");

    const empty = await withoutToolKey(async () => jwksGet());
    expect(await empty.json()).toEqual({ keys: [] });
  });

  it("redirects a configured issuer to the platform (GET and POST)", async () => {
    const connection = await newConnection();
    const params = new URLSearchParams({
      iss: connection.issuer,
      login_hint: "hint-77",
      target_link_uri: TARGET,
      client_id: connection.clientId,
      lti_message_hint: "msg-77",
      lti_deployment_id: connection.deploymentId,
    });

    const viaGet = await loginGet(new Request(`${APP_BASE_URL}/api/lti/login?${params.toString()}`));
    expect(viaGet.status).toBe(302);
    const location = new URL(viaGet.headers.get("location") ?? "");
    expect(`${location.origin}${location.pathname}`).toBe(mock.authLoginUrl);
    expect(location.searchParams.get("redirect_uri")).toBe(LAUNCH_URL);
    expect(location.searchParams.get("login_hint")).toBe("hint-77");
    expect(location.searchParams.get("lti_message_hint")).toBe("msg-77");
    expect(location.searchParams.get("response_mode")).toBe("form_post");
    const state = location.searchParams.get("state") ?? "";
    expect(viaGet.headers.get("set-cookie")).toContain(`${stateCookieName(state)}=1`);
    expect(viaGet.headers.get("set-cookie")).toMatch(/HttpOnly; Secure; SameSite=None/);
    expect(viaGet.headers.get("cache-control")).toBe("no-store");

    const viaPost = await loginPost(
      new Request(`${APP_BASE_URL}/api/lti/login`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: params.toString() }),
    );
    expect(viaPost.status).toBe(302);
    expect(new URL(viaPost.headers.get("location") ?? "").searchParams.get("client_id")).toBe(connection.clientId);
  });

  it("answers 400 JSON for unknown issuers and malformed requests", async () => {
    const unknown = await loginGet(new Request(`${APP_BASE_URL}/api/lti/login?iss=${encodeURIComponent("https://unknown-lms.example.test")}&login_hint=h&target_link_uri=${encodeURIComponent(TARGET)}&client_id=abc`));
    expect(unknown.status).toBe(400);
    expect(unknown.headers.get("location")).toBeNull();
    const body = (await unknown.json()) as { error: string; message: string };
    expect(body.error).toBe("not_configured");
    expect(body.message).toMatch(/No LMS connection is configured/);

    const malformed = await loginGet(new Request(`${APP_BASE_URL}/api/lti/login?iss=${encodeURIComponent(mock.issuer)}`));
    expect(malformed.status).toBe(400);
    expect(((await malformed.json()) as { error: string }).error).toBe("bad_request");
  });

  it("answers 503 when the connection exists but the tool key is missing", async () => {
    const connection = await newConnection();
    const params = new URLSearchParams({ iss: connection.issuer, login_hint: "h", target_link_uri: TARGET, client_id: connection.clientId, lti_deployment_id: connection.deploymentId });
    const response = await withoutToolKey(() => loginGet(new Request(`${APP_BASE_URL}/api/lti/login?${params.toString()}`)));
    expect(response.status).toBe(503);
    expect(((await response.json()) as { error: string }).error).toBe("not_configured");
  });
});
