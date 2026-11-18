/**
 * Teacher-approved grade passback, the background sync worker, the deep-link
 * activity picker and the outbound URL policy (SSRF hardening).
 *
 * Runs against the in-repo MOCK LTI platform and an in-memory database. It
 * proves the tool-side behaviour only — nothing here says anything about a
 * real Canvas instance.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { createLocalJWKSet, decodeJwt, jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

import { getDb } from "@/db/client";
import { assignments, auditLogs, classEnrollments, classes, courseVersions, courses, organizationMemberships, organizations, submissions, syncJobs, users } from "@/db/schema";
import { setExcused, setGradeOverride } from "@/modules/gradebook/service";
import { createCanvasAdapter } from "@/modules/integrations/lms/canvasAdapter";
import {
  buildPickerResponse,
  contentItemsFor,
  deepLinkSessionFromLaunch,
  listPickerClasses,
  signDeepLinkSession,
  verifyDeepLinkSession,
  type DeepLinkSession,
} from "@/modules/integrations/lms/deepLinkFlow";
import { verifyPendingLink } from "@/modules/integrations/lms/launchFlow";
import { DEEP_LINK_CLAIM, renderDeepLinkingPage } from "@/modules/integrations/lms/lti/deepLinking";
import { outboundDefaults, pinnedFetch, systemResolver } from "@/modules/integrations/lms/lti/dnsGuard";
import { generateDevKeyPem, getPublicJwks } from "@/modules/integrations/lms/lti/keys";
import { CLAIM, ROLE } from "@/modules/integrations/lms/lti/launch";
import { checkLmsUrl, checkServiceUrl, hostMatches, isPrivateIpLiteral, parseAllowedHosts, urlPolicyFromEnv, type UrlPolicy } from "@/modules/integrations/lms/lti/urlPolicy";
import { MockLtiPlatform } from "@/modules/integrations/lms/mockPlatform";
import {
  getAssignmentPassback,
  getClassPassbackState,
  isDue,
  nextAttemptAt,
  retryDelayMs,
  retryGradeSync,
  runSyncWorker,
  scoreFromPercent,
  sendAssignmentGrades,
  sendClassGrades,
} from "@/modules/integrations/lms/passback";
import { linkIdentity, mapAssignment, runDiagnostics, saveConnection } from "@/modules/integrations/lms/service";
import type { DeepLinkingSettings, FetchLike, LmsAdapter, LmsConnectionConfig } from "@/modules/integrations/lms/types";

// ───────────────────────────────── Test rig ─────────────────────────────────

const APP_BASE_URL = "https://aceap.example.test";
const LAUNCH_URL = `${APP_BASE_URL}/api/lti/launch`;
const COURSE = "course-1";

let clockOffsetMs = 0;
const clock = (): Date => new Date(Date.now() + clockOffsetMs);
const advance = (ms: number) => {
  clockOffsetMs += ms;
};

let mock: MockLtiPlatform;
let adapter: LmsAdapter;
let seq = 0;

beforeAll(async () => {
  process.env.LTI_TOOL_PRIVATE_KEY = generateDevKeyPem();
  process.env.LTI_TOOL_KEY_ID = "passback-test-key";
  process.env.APP_BASE_URL = APP_BASE_URL;
  process.env.LTI_ALLOWED_HOSTS = "*.example.test";
  mock = await MockLtiPlatform.create({ toolJwks: () => getPublicJwks(), now: clock });
  adapter = createCanvasAdapter({ fetch: mock.fetch, now: clock });
  const db = await getDb();
  await db.insert(courses).values({ id: "test-course", name: "Test Course", category: "Test", description: "Fixture", sourceUrl: "https://example.test/course" });
  await db.insert(courseVersions).values({ id: "test-course.v1", courseId: "test-course", label: "v1", alignmentSourceUrl: "https://example.test/ced" });
});

afterEach(() => {
  outboundDefaults.resolver = systemResolver;
  outboundDefaults.transport = (pin) => pinnedFetch(pin);
  clockOffsetMs = 0;
  mock.clearScoreFailures();
  mock.grantableScopes = null;
  vi.unstubAllGlobals();
});

const deps = () => ({ adapter, now: clock });

interface Staff {
  id: string;
  role: "teacher" | "school_admin" | "platform_admin";
}

async function newOrg(): Promise<string> {
  seq += 1;
  const db = await getDb();
  const [org] = await db.insert(organizations).values({ name: `School ${seq}`, slug: `school-${seq}` }).returning();
  return org.id;
}

async function newTeacher(organizationId: string, role: "teacher" | "school_admin" = "teacher"): Promise<Staff> {
  seq += 1;
  const db = await getDb();
  const [u] = await db.insert(users).values({ email: `teacher${seq}@example.test`, name: `Teacher ${seq}`, passwordHash: "x", role: "teacher" }).returning();
  await db.insert(organizationMemberships).values({ organizationId, userId: u.id, role });
  return { id: u.id, role: "teacher" };
}

async function newClass(organizationId: string, teacherId: string): Promise<string> {
  seq += 1;
  const db = await getDb();
  const [row] = await db
    .insert(classes)
    .values({ organizationId, teacherId, courseId: "test-course", courseVersionId: "test-course.v1", name: `Class ${seq}`, joinCode: `PB${seq}` })
    .returning();
  return row.id;
}

async function newAssignment(classId: string, teacherId: string, points = 10): Promise<string> {
  seq += 1;
  const db = await getDb();
  const [row] = await db.insert(assignments).values({ classId, createdBy: teacherId, title: `Quiz ${seq}`, kind: "skill_practice", gradingMethod: "score", points }).returning();
  return row.id;
}

async function newStudent(classId: string, name: string): Promise<string> {
  seq += 1;
  const db = await getDb();
  const [row] = await db.insert(users).values({ email: `s${seq}@example.test`, name, passwordHash: "x", role: "student" }).returning();
  await db.insert(classEnrollments).values({ classId, studentId: row.id });
  return row.id;
}

async function submit(assignmentId: string, studentId: string, score: number, maxScore = 10): Promise<void> {
  const db = await getDb();
  await db.insert(submissions).values({ assignmentId, studentId, status: "submitted", score, maxScore });
}

async function newConnection(organizationId: string, actorId: string, verify = true): Promise<LmsConnectionConfig> {
  seq += 1;
  const saved = await saveConnection(organizationId, actorId, { ...mock.connectionInput(), deploymentId: `deployment-${seq}` });
  if (!saved.ok) throw new Error(saved.error.message);
  if (verify) {
    const report = await runDiagnostics(saved.value.id, { fetch: mock.fetch, now: clock });
    if (!report.ok || report.value.status !== "verified") throw new Error("diagnostics did not pass against the mock");
  }
  return saved.value;
}

/** A verified connection, one class with a mapped score assignment (10 pts) and a mixed roster. */
async function world(options: { map?: boolean; verify?: boolean } = {}) {
  const orgId = await newOrg();
  const teacher = await newTeacher(orgId);
  const classId = await newClass(orgId, teacher.id);
  const assignmentId = await newAssignment(classId, teacher.id);
  const connection = await newConnection(orgId, teacher.id, options.verify !== false);
  seq += 1;
  const lineItem = mock.addLineItem(COURSE, { label: `Quiz line item ${seq}`, scoreMaximum: 10, resourceLinkId: `rl-${seq}` });
  if (options.map !== false) {
    const mapped = await mapAssignment({ connectionId: connection.id, assignmentId, resourceLinkId: `rl-${seq}`, lineItemUrl: lineItem.id });
    if (!mapped.ok) throw new Error(mapped.error.message);
  }
  const ada = await newStudent(classId, "Ada"); // 8/10 → 80%
  const ben = await newStudent(classId, "Ben"); // 6/10 → 60%
  const cal = await newStudent(classId, "Cal"); // nothing submitted → ungraded
  const dee = await newStudent(classId, "Dee"); // 9/10 but excused
  const eli = await newStudent(classId, "Eli"); // 5/10 overridden to 95%
  const fay = await newStudent(classId, "Fay"); // 7/10, never linked her LMS account
  await submit(assignmentId, ada, 8);
  await submit(assignmentId, ben, 6);
  await submit(assignmentId, dee, 9);
  await submit(assignmentId, eli, 5);
  await submit(assignmentId, fay, 7);
  await setExcused(teacher, { assignmentId, studentId: dee, excused: true });
  await setGradeOverride(teacher, { assignmentId, studentId: eli, grade: 95, reason: "Re-assessed orally" });
  const external: Record<string, string> = {};
  for (const [name, id] of Object.entries({ ada, ben, cal, dee, eli })) {
    external[name] = `lms-${name}-${seq}`;
    const linked = await linkIdentity(connection.id, external[name], id, "admin_confirmed");
    if (!linked.ok) throw new Error(linked.error.message);
  }
  return { orgId, teacher, classId, assignmentId, connection, lineItem, students: { ada, ben, cal, dee, eli, fay }, external };
}

const scoresFor = (lineItemUrl: string) => mock.receivedScores.filter((s) => s.lineItemUrl === lineItemUrl).map((s) => s.score);

async function jobsFor(assignmentId: string) {
  const db = await getDb();
  return db.select().from(syncJobs).where(eq(syncJobs.assignmentId, assignmentId));
}

// ──────────────────────────────── URL policy ────────────────────────────────

describe("LMS URL policy (SSRF hardening)", () => {
  const prod: UrlPolicy = urlPolicyFromEnv({ NODE_ENV: "production" });
  const dev: UrlPolicy = urlPolicyFromEnv({ NODE_ENV: "development" });

  it("defaults to Instructure/Canvas cloud hosts and accepts them over https", () => {
    expect(prod.allowedHosts).toEqual(["*.instructure.com", "*.canvaslms.com"]);
    expect(prod.allowLocalDev).toBe(false);
    for (const url of [
      "https://canvas.instructure.com/api/lti/authorize_redirect",
      "https://school.instructure.com/login/oauth2/token",
      "https://sso.canvaslms.com/api/lti/security/jwks",
      "https://sso.beta.canvaslms.com/api/lti/security/jwks",
      "https://school.instructure.com:443/api/lti/courses/1/line_items/2?x=1",
    ]) {
      expect(checkLmsUrl(url, prod).ok, url).toBe(true);
    }
  });

  it("rejects disallowed hosts, plain http, credentials and private / link-local / loopback IP literals", () => {
    for (const url of [
      "https://evil.example.com/token",
      "https://instructure.com/token", // the wildcard matches subdomains only
      "https://instructure.com.evil.example/token",
      "https://evilinstructure.com/token",
      "http://school.instructure.com/token",
      "https://user:pw@school.instructure.com/token",
      "https://10.0.0.5/token",
      "https://172.16.3.4/token",
      "https://192.168.1.1/token",
      "https://169.254.169.254/latest/meta-data",
      "https://100.64.0.1/token",
      "https://0.0.0.0/token",
      "https://0x7f.0.0.1/token", // normalised to 127.0.0.1 by the URL parser
      "https://2130706433/token", // ditto
      "https://[fd00::1]/token",
      "https://[fe80::1]/token",
      "https://[::ffff:127.0.0.1]/token",
      "https://[::ffff:169.254.169.254]/token",
      "https://localhost/token",
      "http://127.0.0.1:3001/token",
      "ftp://school.instructure.com/x",
      "not a url",
    ]) {
      expect(checkLmsUrl(url, prod).ok, url).toBe(false);
    }
    expect(checkLmsUrl("https://169.254.169.254/x", { allowedHosts: ["169.254.169.254"], allowLocalDev: true }).ok).toBe(false);
  });

  it("allows localhost only outside production", () => {
    expect(checkLmsUrl("http://localhost:3001/token", dev).ok).toBe(true);
    expect(checkLmsUrl("http://127.0.0.1:3001/jwks", dev).ok).toBe(true);
    expect(checkLmsUrl("http://[::1]:3001/jwks", dev).ok).toBe(true);
    expect(checkLmsUrl("http://localhost:3001/token", prod).ok).toBe(false);
    // Private ranges stay blocked in development too.
    expect(checkLmsUrl("https://10.1.2.3/token", dev).ok).toBe(false);
  });

  it("parses LTI_ALLOWED_HOSTS with exact hosts and suffix wildcards", () => {
    expect(parseAllowedHosts(" *.Instructure.com , canvas.school.edu., ,")).toEqual(["*.instructure.com", "canvas.school.edu"]);
    const policy = urlPolicyFromEnv({ NODE_ENV: "production", LTI_ALLOWED_HOSTS: "canvas.school.edu,*.lms.example.org" });
    expect(checkLmsUrl("https://canvas.school.edu/login/oauth2/token", policy).ok).toBe(true);
    expect(checkLmsUrl("https://other.school.edu/login/oauth2/token", policy).ok).toBe(false);
    expect(checkLmsUrl("https://a.b.lms.example.org/x", policy).ok).toBe(true);
    expect(checkLmsUrl("https://school.instructure.com/x", policy).ok).toBe(false); // replaced, not extended
    expect(hostMatches("x.instructure.com", "*.instructure.com")).toBe(true);
    expect(hostMatches("instructure.com", "*.instructure.com")).toBe(false);
    expect(isPrivateIpLiteral("8.8.8.8")).toBe(false);
    expect(isPrivateIpLiteral("[2001:4860:4860::8888]")).toBe(false);
  });

  it("requires service URLs to share the connection's token endpoint origin", () => {
    const connection = { authTokenUrl: "https://school.instructure.com/login/oauth2/token" };
    expect(checkServiceUrl("https://school.instructure.com/api/lti/courses/1/line_items/2", connection, prod).ok).toBe(true);
    expect(checkServiceUrl("https://other.instructure.com/api/lti/courses/1/line_items/2", connection, prod).ok).toBe(false);
  });

  it("saveConnection rejects hosts outside the allow-list and private addresses", async () => {
    const orgId = await newOrg();
    const teacher = await newTeacher(orgId);
    const saved = process.env.LTI_ALLOWED_HOSTS;
    try {
      delete process.env.LTI_ALLOWED_HOSTS; // production default list
      const mockHost = await saveConnection(orgId, teacher.id, mock.connectionInput());
      expect(mockHost.ok).toBe(false);
      if (!mockHost.ok) expect(mockHost.error.issues?.map((i) => i.path).sort()).toEqual(["authLoginUrl", "authTokenUrl", "jwksUrl"]);
      const canvas = await saveConnection(orgId, teacher.id, {
        issuer: "https://canvas.instructure.com",
        clientId: "1",
        deploymentId: "d",
        authLoginUrl: "https://sso.canvaslms.com/api/lti/authorize_redirect",
        authTokenUrl: "https://school.instructure.com/login/oauth2/token",
        jwksUrl: "https://sso.canvaslms.com/api/lti/security/jwks",
      });
      expect(canvas.ok).toBe(true);
    } finally {
      process.env.LTI_ALLOWED_HOSTS = saved;
    }
    const metadata = await saveConnection(orgId, teacher.id, { ...mock.connectionInput(), deploymentId: "x", jwksUrl: "https://169.254.169.254/latest/meta-data" });
    expect(metadata.ok).toBe(false);
    if (!metadata.ok) expect(metadata.error.issues?.[0]?.message).toMatch(/private, loopback or link-local/);
  });

  it("checks the policy before every outbound request and never follows redirects", async () => {
    const spy = vi.fn<FetchLike>(async () => new Response("{}", { status: 200 }));
    const guarded = createCanvasAdapter({ fetch: spy, now: clock });
    const base: LmsConnectionConfig = { id: "c", organizationId: "o", ...mock.connectionInput() };

    const token = await guarded.requestAccessToken({ ...base, authTokenUrl: "https://169.254.169.254/token" }, ["https://purl.imsglobal.org/spec/lti-ags/scope/score"]);
    expect(token.ok).toBe(false);
    const jwks = await guarded.checkPlatformKeys({ ...base, jwksUrl: "https://intranet.corp.example/jwks" });
    expect(jwks.ok).toBe(false);
    const roster = await guarded.fetchRoster(base, "https://other-lms.example.test/api/lti/courses/1/names_and_roles");
    expect(roster.ok).toBe(false);
    const score = await guarded.publishScore(base, "https://other-lms.example.test/api/lti/courses/1/line_items/1", { userId: "u", scoreGiven: 1, scoreMaximum: 2 });
    expect(score.ok).toBe(false);
    if (!score.ok) expect(score.error.message).toMatch(/same host as the connection's token endpoint/);
    expect(spy).not.toHaveBeenCalled();

    const redirecting = createCanvasAdapter({ fetch: async () => new Response(null, { status: 302, headers: { location: "http://169.254.169.254/" } }), now: clock });
    const redirected = await redirecting.checkPlatformKeys(base);
    expect(redirected.ok).toBe(false);
    if (!redirected.ok) {
      expect(redirected.error.code).toBe("bad_request");
      expect(redirected.error.message).toMatch(/redirects are not followed/);
    }
  });

  it("mapAssignment rejects a line item URL on another host than the connection", async () => {
    const w = await world({ map: false });
    const other = await mapAssignment({ connectionId: w.connection.id, assignmentId: w.assignmentId, resourceLinkId: "rl", lineItemUrl: "https://other-lms.example.test/api/lti/courses/1/line_items/1" });
    expect(other.ok).toBe(false);
    if (!other.ok) expect(other.error.code).toBe("validation");
  });
});

// ─────────────────────────────── Grade passback ─────────────────────────────

describe("teacher-approved grade passback", () => {
  it("sends current gradebook grades: overrides honoured, excused and ungraded skipped, unlinked students blocked", async () => {
    const w = await world();
    expect(scoreFromPercent(95, 10)).toBe(9.5);

    const state = await getClassPassbackState(w.teacher, w.classId);
    expect(state.connection?.verified).toBe(true);
    expect(state.assignments[w.assignmentId]).toMatchObject({ canSend: true, reason: null, assignedStudents: 6, linkedStudents: 5 });
    expect(state.assignments[w.assignmentId].message).toMatch(/1 of 6 students haven't linked/);

    const result = await sendAssignmentGrades(w.teacher, { classId: w.classId, assignmentId: w.assignmentId }, deps());
    const summary = result.assignments[0];
    expect(summary).toMatchObject({ queued: 4, skipped: 2, unchanged: 0, requeued: 0 });
    const byName = Object.fromEntries(summary.outcomes.map((o) => [o.studentName, o]));
    expect(byName.Cal).toMatchObject({ action: "skipped", skipReason: "ungraded" });
    expect(byName.Dee).toMatchObject({ action: "skipped", skipReason: "excused" });
    expect(byName.Eli).toMatchObject({ action: "queued", scoreGiven: 9.5, scoreMaximum: 10 });
    expect(result.delivery).toMatchObject({ synced: 3 });

    // Exactly what the platform received: gradebook percent / 100 × points, for linked students only.
    const received = scoresFor(w.lineItem.id).map((s) => [s.userId, s.scoreGiven, s.scoreMaximum, s.activityProgress, s.gradingProgress]);
    expect(received.sort()).toEqual(
      [
        [w.external.ada, 8, 10, "Completed", "FullyGraded"],
        [w.external.ben, 6, 10, "Completed", "FullyGraded"],
        [w.external.eli, 9.5, 10, "Completed", "FullyGraded"],
      ].sort(),
    );
    expect(scoresFor(w.lineItem.id).some((s) => s.userId === w.external.dee || s.userId === w.external.cal)).toBe(false);

    const view = await getAssignmentPassback(w.teacher, w.assignmentId);
    const rows = Object.fromEntries(view.rows.map((r) => [r.studentName, r]));
    expect(rows.Ada).toMatchObject({ status: "synced", scoreGiven: 8, currentScore: 8, outOfDate: false });
    expect(rows.Fay.status).toBe("blocked");
    expect(rows.Fay.lastError).toMatch(/student has not linked an LMS account/);
    expect(rows.Fay.syncedAt).toBeNull();
    expect(rows.Cal).toMatchObject({ status: "not_queued", skipReason: "ungraded" });
    expect(rows.Dee).toMatchObject({ status: "not_queued", skipReason: "excused" });
    expect(result.statusCounts).toMatchObject({ synced: 3, blocked: 1, not_queued: 2 });

    const db = await getDb();
    const [log] = await db.select().from(auditLogs).where(and(eq(auditLogs.action, "lms.grades_sent"), eq(auditLogs.entityId, w.assignmentId)));
    expect(log.actorId).toBe(w.teacher.id);
    expect(log.metadata).toMatchObject({ queued: 4, skipped: 2, delivered: 3, blocked: 0 });
  });

  it("re-sending identical grades creates no new jobs and no new scores", async () => {
    const w = await world();
    await sendAssignmentGrades(w.teacher, { classId: w.classId, assignmentId: w.assignmentId }, deps());
    const jobsBefore = await jobsFor(w.assignmentId);
    const scoresBefore = scoresFor(w.lineItem.id).length;
    const again = await sendAssignmentGrades(w.teacher, { classId: w.classId, assignmentId: w.assignmentId }, deps());
    expect(again.assignments[0]).toMatchObject({ queued: 0, requeued: 0, unchanged: 4, skipped: 2 });
    expect(again.delivery.synced).toBe(0);
    expect((await jobsFor(w.assignmentId)).length).toBe(jobsBefore.length);
    expect(scoresFor(w.lineItem.id).length).toBe(scoresBefore);
  });

  it("a changed grade is sent again, and an undelivered older grade is superseded", async () => {
    const w = await world();
    await sendAssignmentGrades(w.teacher, { classId: w.classId, assignmentId: w.assignmentId }, deps());

    // Delivered grade changes → a new job; the synced one stays synced.
    await setGradeOverride(w.teacher, { assignmentId: w.assignmentId, studentId: w.students.ada, grade: 100, reason: "Regrade" });
    const changed = await sendAssignmentGrades(w.teacher, { classId: w.classId, assignmentId: w.assignmentId }, deps());
    expect(changed.assignments[0]).toMatchObject({ queued: 1, unchanged: 3 });
    expect(scoresFor(w.lineItem.id).filter((s) => s.userId === w.external.ada).map((s) => s.scoreGiven)).toEqual([8, 10]);

    // Platform outage: Ben's new grade stays pending …
    mock.failScores(503);
    await setGradeOverride(w.teacher, { assignmentId: w.assignmentId, studentId: w.students.ben, grade: 70, reason: "Regrade" });
    const outage = await sendAssignmentGrades(w.teacher, { classId: w.classId, assignmentId: w.assignmentId }, deps());
    expect(outage.delivery.pending).toBe(1);
    mock.clearScoreFailures();
    // … and is replaced by an even newer grade before it was delivered.
    await setGradeOverride(w.teacher, { assignmentId: w.assignmentId, studentId: w.students.ben, grade: 75, reason: "Regrade again" });
    await sendAssignmentGrades(w.teacher, { classId: w.classId, assignmentId: w.assignmentId }, deps());
    const benScores = scoresFor(w.lineItem.id).filter((s) => s.userId === w.external.ben).map((s) => s.scoreGiven);
    expect(benScores).toEqual([6, 7.5]); // 7 (70%) was never sent
    const benRow = (await getAssignmentPassback(w.teacher, w.assignmentId)).rows.find((r) => r.studentId === w.students.ben);
    expect(benRow).toMatchObject({ status: "synced", scoreGiven: 7.5 });
    const benJobs = (await jobsFor(w.assignmentId)).filter((j) => j.studentId === w.students.ben);
    expect(benJobs.filter((j) => (j.lastError ?? "").startsWith("superseded:"))).toHaveLength(1);
  });

  it("an unmapped assignment produces blocked jobs with a reason and nothing is synced until it is linked", async () => {
    const w = await world({ map: false });
    const state = await getClassPassbackState(w.teacher, w.classId);
    expect(state.assignments[w.assignmentId]).toMatchObject({ canSend: false, reason: "assignment_not_linked" });
    await expect(sendClassGrades(w.teacher, { classId: w.classId }, deps())).rejects.toMatchObject({ code: "conflict" });

    const sent = await sendAssignmentGrades(w.teacher, { classId: w.classId, assignmentId: w.assignmentId }, deps());
    expect(sent.delivery.synced).toBe(0);
    const jobs = await jobsFor(w.assignmentId);
    expect(jobs).toHaveLength(4);
    expect(jobs.every((j) => j.status === "blocked" && /not linked to an LMS assignment/.test(j.lastError ?? ""))).toBe(true);
    expect(scoresFor(w.lineItem.id)).toHaveLength(0);

    // Linking re-queues them; the background worker delivers.
    const mapped = await mapAssignment({ connectionId: w.connection.id, assignmentId: w.assignmentId, resourceLinkId: "rl-late", lineItemUrl: w.lineItem.id });
    // All four are re-queued; Fay's is blocked again on the next attempt because she is still unlinked.
    expect(mapped.ok && mapped.value.requeuedJobs).toBe(4);
    const [report] = await runSyncWorker({ apply: true, connectionId: w.connection.id, ...deps() });
    expect(report.summary).toMatchObject({ synced: 3, blocked: 1 });
    expect(scoresFor(w.lineItem.id)).toHaveLength(3);
  });

  it("refuses to send without a connection or when diagnostics have not passed", async () => {
    const lonelyOrg = await newOrg();
    const lonely = await newTeacher(lonelyOrg);
    const lonelyClass = await newClass(lonelyOrg, lonely.id);
    const lonelyAssignment = await newAssignment(lonelyClass, lonely.id);
    const none = await getClassPassbackState(lonely, lonelyClass);
    expect(none).toMatchObject({ connection: null, reason: "no_connection" });
    expect(none.assignments[lonelyAssignment]).toMatchObject({ canSend: false, reason: "no_connection" });
    await expect(sendAssignmentGrades(lonely, { classId: lonelyClass, assignmentId: lonelyAssignment }, deps())).rejects.toMatchObject({ code: "conflict" });

    const w = await world({ verify: false });
    const unverified = await getClassPassbackState(w.teacher, w.classId);
    expect(unverified.reason).toBe("connection_unverified");
    expect(unverified.assignments[w.assignmentId].canSend).toBe(false);
    await expect(sendAssignmentGrades(w.teacher, { classId: w.classId, assignmentId: w.assignmentId }, deps())).rejects.toThrow(/hasn't passed diagnostics/);
    expect(await jobsFor(w.assignmentId)).toHaveLength(0);
    // The worker skips unverified connections even with --apply.
    const [report] = await runSyncWorker({ apply: true, connectionId: w.connection.id, ...deps() });
    expect(report.skipped).toBe(true);
  });

  it("only staff of the class can send, read status or retry", async () => {
    const w = await world();
    const colleague = await newTeacher(w.orgId); // same school, not this class's teacher
    const otherOrg = await newOrg();
    const stranger = await newTeacher(otherOrg);
    const schoolAdmin = await newTeacher(w.orgId, "school_admin");

    for (const user of [colleague, stranger]) {
      await expect(sendAssignmentGrades(user, { classId: w.classId, assignmentId: w.assignmentId }, deps())).rejects.toMatchObject({ code: "not_found" });
      await expect(sendClassGrades(user, { classId: w.classId }, deps())).rejects.toMatchObject({ code: "not_found" });
      await expect(getAssignmentPassback(user, w.assignmentId)).rejects.toMatchObject({ code: "not_found" });
      await expect(getClassPassbackState(user, w.classId)).rejects.toMatchObject({ code: "not_found" });
    }
    expect(await jobsFor(w.assignmentId)).toHaveLength(0);

    // A teacher can't smuggle another class's assignment through their own class.
    const ownClass = await newClass(w.orgId, colleague.id);
    await expect(sendAssignmentGrades(colleague, { classId: ownClass, assignmentId: w.assignmentId }, deps())).rejects.toMatchObject({ code: "not_found" });

    // A school admin of the organisation counts as staff of the class.
    const byAdmin = await sendAssignmentGrades(schoolAdmin, { classId: w.classId, assignmentId: w.assignmentId }, deps());
    expect(byAdmin.delivery.synced).toBe(3);
    const blocked = (await jobsFor(w.assignmentId)).find((j) => j.status === "blocked")!;
    await expect(retryGradeSync(stranger, blocked.id, deps())).rejects.toMatchObject({ code: "not_found" });
    await expect(retryGradeSync(colleague, blocked.id, deps())).rejects.toMatchObject({ code: "not_found" });
  });

  it("retry from the gradebook re-queues a blocked job and delivers it once the cause is fixed", async () => {
    const w = await world();
    mock.grantableScopes = ["https://purl.imsglobal.org/spec/lti-ags/scope/lineitem"]; // score scope withheld
    const fresh = createCanvasAdapter({ fetch: mock.fetch, now: clock }); // no cached token
    const sent = await sendAssignmentGrades(w.teacher, { classId: w.classId, assignmentId: w.assignmentId }, { adapter: fresh, now: clock });
    expect(sent.delivery.blocked).toBe(3);
    expect(scoresFor(w.lineItem.id)).toHaveLength(0);
    const ada = (await getAssignmentPassback(w.teacher, w.assignmentId)).rows.find((r) => r.studentId === w.students.ada)!;
    expect(ada.status).toBe("blocked");
    expect(ada.lastError).toMatch(/permission_denied/);

    mock.grantableScopes = null;
    const outcome = await retryGradeSync(w.teacher, ada.jobId!, { adapter: fresh, now: clock });
    expect(outcome).toMatchObject({ status: "synced", attempted: true });
    expect(scoresFor(w.lineItem.id).map((s) => s.userId)).toEqual([w.external.ada]);
    const db = await getDb();
    const audits = await db.select().from(auditLogs).where(and(eq(auditLogs.action, "sync_job.retry_requested"), eq(auditLogs.entityId, ada.jobId!)));
    expect(audits).toHaveLength(1);
  });
});

// ───────────────────────────── Background worker ────────────────────────────

describe("background sync worker", () => {
  it("uses an exponential back-off schedule", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 20].map((n) => retryDelayMs(n) / 60_000)).toEqual([0, 1, 2, 4, 8, 16, 32, 60, 60]);
    const t0 = new Date("2026-11-17T10:00:00Z");
    expect(nextAttemptAt({ attempts: 3, updatedAt: t0 }).toISOString()).toBe("2026-11-17T10:04:00.000Z");
    expect(isDue({ attempts: 3, updatedAt: t0 }, new Date("2026-11-17T10:03:59Z"))).toBe(false);
    expect(isDue({ attempts: 3, updatedAt: t0 }, new Date("2026-11-17T10:04:00Z"))).toBe(true);
    expect(isDue({ attempts: 0, updatedAt: t0 }, t0)).toBe(true);
  });

  it("dry-run reports without sending; --apply honours the back-off", async () => {
    const w = await world();
    mock.failScores(500);
    await sendAssignmentGrades(w.teacher, { classId: w.classId, assignmentId: w.assignmentId }, deps());
    mock.clearScoreFailures();
    // Three pending jobs with attempts = 1 → next attempt one minute later.
    const dry = await runSyncWorker({ connectionId: w.connection.id, ...deps() });
    expect(dry[0]).toMatchObject({ skipped: false, summary: null });
    expect(dry[0].due).toHaveLength(0);
    expect(dry[0].waiting).toHaveLength(3);

    advance(30_000);
    const early = await runSyncWorker({ apply: true, connectionId: w.connection.id, ...deps() });
    expect(early[0].summary?.processed).toBe(0);
    expect(scoresFor(w.lineItem.id)).toHaveLength(0);

    advance(31_000);
    const dueDry = await runSyncWorker({ connectionId: w.connection.id, ...deps() });
    expect(dueDry[0].due).toHaveLength(3);
    expect(scoresFor(w.lineItem.id)).toHaveLength(0); // dry run contacts nobody

    const applied = await runSyncWorker({ apply: true, connectionId: w.connection.id, ...deps() });
    expect(applied[0].summary).toMatchObject({ processed: 3, synced: 3 });
    expect(scoresFor(w.lineItem.id)).toHaveLength(3);
  });
});

// ──────────────────────────────── Deep linking ──────────────────────────────

describe("deep-linking activity picker", () => {
  const settings = (overrides: Partial<DeepLinkingSettings> = {}): DeepLinkingSettings => ({
    deepLinkReturnUrl: `${mock.issuer}/courses/1/deep_linking_response`,
    acceptTypes: ["ltiResourceLink"],
    acceptPresentationDocumentTargets: ["iframe", "window"],
    acceptMultiple: true,
    acceptLineItem: true,
    autoCreate: false,
    data: "opaque-data-42",
    title: null,
    text: null,
    ...overrides,
  });

  async function pickerWorld() {
    const w = await world();
    const sub = `lms-teacher-${seq}`;
    const linked = await linkIdentity(w.connection.id, sub, w.teacher.id, "lti_launch_signed_in");
    if (!linked.ok) throw new Error(linked.error.message);
    const session: DeepLinkSession = {
      connectionId: w.connection.id,
      organizationId: w.orgId,
      userSub: sub,
      settings: settings(),
      contextTitle: "AP Calc",
      exp: Math.floor(Date.now() / 1000) + 600,
    };
    return { ...w, sub, session };
  }

  it("signs and verifies deep-link session tokens (tamper / expiry rejected)", () => {
    const session: DeepLinkSession = {
      connectionId: "11111111-1111-1111-1111-111111111111",
      organizationId: "22222222-2222-2222-2222-222222222222",
      userSub: "u",
      settings: settings(),
      contextTitle: null,
      exp: Math.floor(Date.now() / 1000) + 60,
    };
    const token = signDeepLinkSession(session, "secret-for-tests-0123456789abcdef");
    expect(verifyDeepLinkSession(token, new Date(), "secret-for-tests-0123456789abcdef")).toEqual(session);
    expect(verifyDeepLinkSession(token, new Date(), "another-secret-0123456789abcdefgh")).toBeNull();
    expect(verifyDeepLinkSession(token, new Date(Date.now() + 61_000), "secret-for-tests-0123456789abcdef")).toBeNull();
    const [body, mac] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...session, userSub: "attacker" })).toString("base64url");
    expect(verifyDeepLinkSession(`${forged}.${mac}`, new Date(), "secret-for-tests-0123456789abcdef")).toBeNull();
    expect(verifyDeepLinkSession(`${body}.${mac}.x`, new Date(), "secret-for-tests-0123456789abcdef")).toBeNull();
  });

  it("produces a response JWT that verifies against the tool JWKS with the right content item", async () => {
    const p = await pickerWorld();
    const listed = await listPickerClasses(p.teacher, p.session);
    expect(listed.ok && listed.classes.map((c) => c.id)).toEqual([p.classId]);

    const built = await buildPickerResponse(p.teacher, p.session, [p.assignmentId], { adapter });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.value.response.returnUrl).toBe(p.session.settings.deepLinkReturnUrl);
    const { payload, protectedHeader } = await jwtVerify(built.value.response.jwt, createLocalJWKSet(getPublicJwks()), {
      issuer: mock.clientId,
      audience: mock.issuer,
      algorithms: ["RS256"],
    });
    expect(protectedHeader.kid).toBe("passback-test-key");
    expect(payload[CLAIM.messageType]).toBe("LtiDeepLinkingResponse");
    expect(payload[CLAIM.version]).toBe("1.3.0");
    expect(payload[CLAIM.deploymentId]).toBe(p.connection.deploymentId);
    expect(payload[DEEP_LINK_CLAIM.data]).toBe("opaque-data-42");
    expect(typeof payload.nonce).toBe("string");
    const db = await getDb();
    const [a] = await db.select().from(assignments).where(eq(assignments.id, p.assignmentId));
    expect(payload[DEEP_LINK_CLAIM.contentItems]).toEqual([
      {
        type: "ltiResourceLink",
        title: a.title,
        url: LAUNCH_URL,
        custom: { aceap_assignment_id: p.assignmentId },
        lineItem: { scoreMaximum: 10, label: a.title, resourceId: p.assignmentId },
        window: { targetName: "_blank" },
      },
    ]);
    const [log] = await db.select().from(auditLogs).where(and(eq(auditLogs.action, "lms.deep_link_returned"), eq(auditLogs.actorId, p.teacher.id)));
    expect(log.metadata).toMatchObject({ assignmentIds: [p.assignmentId], count: 1 });

    const { html, csp } = renderDeepLinkingPage(built.value.response, { itemCount: 1 });
    expect(html).toContain(`action="${p.session.settings.deepLinkReturnUrl}"`);
    expect(html).toContain(`name="JWT" value="${built.value.response.jwt}"`);
    expect(csp).toMatch(/default-src 'none'; script-src 'sha256-[A-Za-z0-9+/=]+'/);
  });

  it("escapes the return URL and returns an empty selection as an empty response", async () => {
    const p = await pickerWorld();
    const tricky = { ...p.session, settings: settings({ deepLinkReturnUrl: `${mock.issuer}/dl?a=1&b="><script>alert(1)</script>` }) };
    const built = await buildPickerResponse(p.teacher, tricky, [], { adapter });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.value.itemCount).toBe(0);
    expect(decodeJwt(built.value.response.jwt)[DEEP_LINK_CLAIM.contentItems]).toEqual([]);
    const { html } = renderDeepLinkingPage(built.value.response, { itemCount: 0 });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&quot;&gt;&lt;script&gt;");
  });

  it("refuses other accounts, students, other schools' assignments and multiple items when only one is accepted", async () => {
    const p = await pickerWorld();
    const colleague = await newTeacher(p.orgId);
    const wrong = await buildPickerResponse(colleague, p.session, [p.assignmentId], { adapter });
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.error.message).toMatch(/linked to a different AceAP account/);

    const db = await getDb();
    const [student] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, p.students.ada));
    expect((await listPickerClasses(student, p.session)).ok).toBe(false);

    const other = await world();
    const foreign = await buildPickerResponse(p.teacher, p.session, [other.assignmentId], { adapter });
    expect(foreign.ok).toBe(false);
    if (!foreign.ok) expect(foreign.error.code).toBe("permission_denied");

    const second = await newAssignment(p.classId, p.teacher.id);
    const single = { ...p.session, settings: settings({ acceptMultiple: false }) };
    const many = await buildPickerResponse(p.teacher, single, [p.assignmentId, second], { adapter });
    expect(many.ok).toBe(false);
    if (!many.ok) expect(many.error.code).toBe("bad_request");
  });

  it("content items always point at the launch endpoint and request a new window", () => {
    expect(contentItemsFor("https://aceap.example.test/", [{ id: "a", title: "T", points: 5 }])).toEqual([
      { title: "T", url: LAUNCH_URL, custom: { aceap_assignment_id: "a" }, lineItem: { scoreMaximum: 5, label: "T", resourceId: "a" }, window: { targetName: "_blank" } },
    ]);
  });

  it("a deep-linking launch by an unlinked LMS user goes to the account-link confirmation, then the picker", async () => {
    const { GET: loginGet } = await import("@/app/api/lti/login/route");
    const { POST: launchPost } = await import("@/app/api/lti/launch/route");
    const orgId = await newOrg();
    const teacher = await newTeacher(orgId);
    const saved = await saveConnection(orgId, teacher.id, mock.connectionInput()); // exact mock deployment id
    expect(saved.ok).toBe(true);
    // The route's module-level adapter fetches the platform JWKS through the DNS guard:
    // resolve the mock host to a public address and hand the pinned request to the mock.
    const resolved: string[] = [];
    outboundDefaults.resolver = async (host) => {
      resolved.push(host);
      return [{ address: "93.184.216.34", family: 4 }];
    };
    outboundDefaults.transport = () => mock.fetch;

    const params = new URLSearchParams({ iss: mock.issuer, login_hint: "hint-dl", target_link_uri: LAUNCH_URL, client_id: mock.clientId, lti_deployment_id: mock.deploymentId });
    const login = await loginGet(new Request(`${APP_BASE_URL}/api/lti/login?${params.toString()}`));
    expect(login.status).toBe(302);
    const { form } = await mock.authorize(
      login.headers.get("location") ?? "",
      { targetLinkUri: LAUNCH_URL, messageType: "LtiDeepLinkingRequest", sub: "lms-new-teacher", roles: [ROLE.instructor], deepLinkData: "dl-data" },
      { loginHint: "hint-dl", registeredRedirectUris: [LAUNCH_URL] },
    );
    const launch = await launchPost(
      new Request(LAUNCH_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(form).toString() }),
    );
    expect(launch.status, await launch.clone().text()).toBe(303);
    expect(resolved).toContain(new URL(mock.jwksUrl).hostname); // the JWKS host went through the DNS guard
    const location = new URL(launch.headers.get("location") ?? "", APP_BASE_URL);
    expect(location.pathname).toBe("/lti/link");
    const pending = verifyPendingLink(location.searchParams.get("token") ?? "");
    expect(pending?.userSub).toBe("lms-new-teacher");
    const session = verifyDeepLinkSession(pending?.deepLinkToken ?? "");
    expect(session).toMatchObject({ connectionId: saved.ok ? saved.value.id : "", organizationId: orgId, userSub: "lms-new-teacher" });
    expect(session?.settings.data).toBe("dl-data");
    expect(session?.settings.deepLinkReturnUrl).toContain("/deep_linking_response");
    // Nothing was linked by the launch itself.
    expect((await listPickerClasses(teacher, session!)).ok).toBe(false);
  });

  it("deepLinkSessionFromLaunch ignores resource-link and anonymous launches", () => {
    const base = {
      connectionId: "c",
      organizationId: "o",
      issuer: "i",
      clientId: "x",
      deploymentId: "d",
      roles: [],
      userName: null,
      userEmail: null,
      context: null,
      resourceLink: null,
      targetLinkUri: LAUNCH_URL,
      custom: {},
      ags: null,
      nrps: null,
    };
    expect(deepLinkSessionFromLaunch({ ...base, messageType: "LtiResourceLinkRequest", userSub: "u", deepLinking: null })).toBeNull();
    expect(deepLinkSessionFromLaunch({ ...base, messageType: "LtiDeepLinkingRequest", userSub: null, deepLinking: settings() })).toBeNull();
    expect(deepLinkSessionFromLaunch({ ...base, messageType: "LtiDeepLinkingRequest", userSub: "u", deepLinking: settings() })?.settings.data).toBe("opaque-data-42");
  });
});
