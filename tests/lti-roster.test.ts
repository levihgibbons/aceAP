/**
 * Canvas roster review (NRPS → proposals only) and the DNS-rebinding defence
 * for outbound LMS requests.
 *
 * Runs against the in-repo MOCK LTI platform and an in-memory database. It
 * proves the tool-side behaviour only — nothing here says anything about a
 * real Canvas instance. No test touches the network: DNS answers come from
 * injected resolvers and the pinning test talks to a server on 127.0.0.1.
 */
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq, sql } from "drizzle-orm";

vi.mock("server-only", () => ({}));

import { asUser, getDb } from "@/db/client";
import {
  auditLogs,
  classEnrollments,
  classes,
  courseVersions,
  courses,
  externalCourseMappings,
  externalIdentityMappings,
  lmsConnections,
  lmsRosterProposals,
  organizationMemberships,
  organizations,
  users,
} from "@/db/schema";
import { resetRateLimit } from "@/lib/rate-limit";
import { requestAccountDeletion } from "@/modules/accounts/deletion";
import { runRetention } from "@/modules/accounts/retention";
import { createUser } from "@/modules/auth/service";
import { createCanvasAdapter } from "@/modules/integrations/lms/canvasAdapter";
import { maybeMapAssignment, type PendingLink } from "@/modules/integrations/lms/launchFlow";
import { guardOutbound, outboundDefaults, pinnedFetch, resolvePublicAddress, systemResolver, type HostResolver } from "@/modules/integrations/lms/lti/dnsGuard";
import { generateDevKeyPem, getPublicJwks } from "@/modules/integrations/lms/lti/keys";
import { ROLE } from "@/modules/integrations/lms/lti/launch";
import { safeFetch } from "@/modules/integrations/lms/lti/token";
import { isNonPublicAddress, urlPolicyFromEnv } from "@/modules/integrations/lms/lti/urlPolicy";
import { MockLtiPlatform, type MockMember } from "@/modules/integrations/lms/mockPlatform";
import { classifyRosterMembers, getRosterReview, normaliseEmail, reviewCanvasRoster } from "@/modules/integrations/lms/roster";
import { linkIdentity, mapCourse, runDiagnostics, saveConnection } from "@/modules/integrations/lms/service";
import type { FetchLike, LmsConnectionConfig, RosterMember } from "@/modules/integrations/lms/types";
import { rejection } from "./helpers/world";

const APP_BASE_URL = "https://aceap.example.test";
const DAY = 24 * 60 * 60 * 1000;
const PUBLIC_V4 = "93.184.216.34";
const PUBLIC_V6 = "2606:2800:220:1:248:1893:25c8:1946";

let mock: MockLtiPlatform;
let seq = 0;

beforeAll(async () => {
  process.env.LTI_TOOL_PRIVATE_KEY = generateDevKeyPem();
  process.env.LTI_TOOL_KEY_ID = "roster-test-key";
  process.env.APP_BASE_URL = APP_BASE_URL;
  process.env.LTI_ALLOWED_HOSTS = "*.example.test";
  mock = await MockLtiPlatform.create({ toolJwks: () => getPublicJwks() });
  const db = await getDb();
  await db.insert(courses).values({ id: "roster-course", name: "Roster Course", category: "Test", description: "Fixture", sourceUrl: "https://example.test/course" });
  await db.insert(courseVersions).values({ id: "roster-course.v1", courseId: "roster-course", label: "v1", alignmentSourceUrl: "https://example.test/ced" });
});

beforeEach(() => resetRateLimit());

afterEach(() => {
  outboundDefaults.resolver = systemResolver;
  outboundDefaults.transport = (pin) => pinnedFetch(pin);
});

const adapter = () => createCanvasAdapter({ fetch: mock.fetch });
const deps = () => ({ adapter: adapter() });

interface Staff {
  id: string;
  role: "teacher" | "school_admin" | "platform_admin";
}

async function newOrg(): Promise<string> {
  seq += 1;
  const db = await getDb();
  const [org] = await db.insert(organizations).values({ name: `Roster School ${seq}`, slug: `roster-school-${seq}` }).returning();
  return org.id;
}

async function newStaff(organizationId: string, role: "teacher" | "school_admin" = "teacher"): Promise<Staff> {
  seq += 1;
  const db = await getDb();
  const [u] = await db.insert(users).values({ email: `staff${seq}@example.test`, name: `Staff ${seq}`, passwordHash: "x", role: "teacher" }).returning();
  await db.insert(organizationMemberships).values({ organizationId, userId: u.id, role });
  return { id: u.id, role: "teacher" };
}

async function newClass(organizationId: string, teacherId: string): Promise<string> {
  seq += 1;
  const db = await getDb();
  const [row] = await db
    .insert(classes)
    .values({ organizationId, teacherId, courseId: "roster-course", courseVersionId: "roster-course.v1", name: `Roster class ${seq}`, joinCode: `RS${seq}X` })
    .returning();
  return row.id;
}

async function newStudent(name: string, email: string, classId?: string): Promise<string> {
  const db = await getDb();
  const [row] = await db.insert(users).values({ email, name, passwordHash: "x", role: "student" }).returning();
  if (classId) await db.insert(classEnrollments).values({ classId, studentId: row.id });
  return row.id;
}

async function newConnection(organizationId: string, actorId: string): Promise<LmsConnectionConfig> {
  seq += 1;
  const saved = await saveConnection(organizationId, actorId, { ...mock.connectionInput(), deploymentId: `roster-deployment-${seq}` });
  if (!saved.ok) throw new Error(saved.error.message);
  const report = await runDiagnostics(saved.value.id, { fetch: mock.fetch });
  if (!report.ok || report.value.status !== "verified") throw new Error("diagnostics did not pass against the mock");
  return saved.value;
}

const learner = (userId: string, extra: Partial<MockMember> = {}): MockMember => ({ user_id: userId, roles: [ROLE.learner], status: "Active", ...extra });

async function countRows(table: typeof externalIdentityMappings | typeof classEnrollments | typeof lmsRosterProposals): Promise<number> {
  const db = await getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(table);
  return n;
}

async function proposalsFor(classId: string) {
  const db = await getDb();
  return db.select().from(lmsRosterProposals).where(eq(lmsRosterProposals.classId, classId));
}

/**
 * One class mapped to a mock Canvas course with a roster that exercises every rule:
 *   ada   enrolled, explicitly linked                         → already_linked
 *   zed   linked, but his AceAP account is in another class   → linked_elsewhere
 *   ben   enrolled, unlinked, same e-mail (different case)    → suggested
 *   cal   enrolled, unlinked, same NAME but other e-mail      → no_match (names never match)
 *   dee   e-mail of a student enrolled in ANOTHER class only  → no_match
 *   anon  Canvas sent neither name nor e-mail                 → no_match, nothing stored
 *   fay   enrolled but already linked to another Canvas user  → no_match
 *   ina   enrolled student's e-mail, but Inactive in Canvas   → no_match
 *   dup1/dup2  two Canvas members share gus's e-mail          → no_match (ambiguous)
 *   teach a Canvas Instructor using hal's e-mail               → no_match, not listed
 */
async function rosterWorld() {
  const orgId = await newOrg();
  const teacher = await newStaff(orgId);
  const classId = await newClass(orgId, teacher.id);
  const otherClassId = await newClass(orgId, teacher.id);
  const connection = await newConnection(orgId, teacher.id);
  seq += 1;
  const course = `roster-course-${seq}`;
  const mapped = await mapCourse({ connectionId: connection.id, externalCourseId: course, classId, membershipsUrl: mock.membershipsUrl(course) });
  if (!mapped.ok) throw new Error(mapped.error.message);

  const s = seq;
  const ada = await newStudent("Ada Lovelace", `ada${s}@example.test`, classId);
  const ben = await newStudent("Ben Okafor", `ben${s}@example.test`, classId);
  const cal = await newStudent("Cal Rivera", `cal${s}@example.test`, classId);
  const fay = await newStudent("Fay Wong", `fay${s}@example.test`, classId);
  const ina = await newStudent("Ina Park", `ina${s}@example.test`, classId);
  const gus = await newStudent("Gus Berg", `gus${s}@example.test`, classId);
  const hal = await newStudent("Hal Moss", `hal${s}@example.test`, classId);
  const una = await newStudent("Una Unlisted", `una${s}@example.test`, classId); // not in Canvas at all
  const zed = await newStudent("Zed Other", `zed${s}@example.test`, otherClassId);
  const dee = await newStudent("Dee Elsewhere", `dee${s}@example.test`, otherClassId);

  for (const [external, userId] of [
    [`lms-ada-${s}`, ada],
    [`lms-zed-${s}`, zed],
    [`lms-fay-old-${s}`, fay],
  ] as const) {
    const linked = await linkIdentity(connection.id, external, userId, "lti_launch_signed_in");
    if (!linked.ok) throw new Error(linked.error.message);
  }

  mock.addMembers(course, [
    learner(`lms-ada-${s}`, { name: "Ada Lovelace", email: `ada${s}@example.test` }),
    learner(`lms-zed-${s}`, { name: "Zed Other" }),
    learner(`lms-ben-${s}`, { name: "Benjamin O.", email: `  BEN${s}@Example.TEST ` }),
    learner(`lms-cal-${s}`, { name: "Cal Rivera", email: `c.rivera${s}@school.example.test` }),
    learner(`lms-dee-${s}`, { name: "Dee Elsewhere", email: `dee${s}@example.test` }),
    learner(`lms-anon-${s}`),
    learner(`lms-fay-new-${s}`, { name: "Fay Wong", email: `fay${s}@example.test` }),
    learner(`lms-ina-${s}`, { name: "Ina Park", email: `ina${s}@example.test`, status: "Inactive" }),
    learner(`lms-dup1-${s}`, { email: `gus${s}@example.test` }),
    learner(`lms-dup2-${s}`, { email: `gus${s}@example.test` }),
    { user_id: `lms-teach-${s}`, roles: [ROLE.instructor], status: "Active", name: "Ms Teacher", email: `hal${s}@example.test` },
  ]);
  return { orgId, teacher, classId, otherClassId, connection, course, s, students: { ada, ben, cal, fay, ina, gus, hal, una, zed, dee } };
}

// ─────────────────────────────── Roster review ──────────────────────────────

describe("Canvas roster review (proposals only)", () => {
  it("classifies every member by the documented rules and stores name/e-mail only when Canvas sent them", async () => {
    const w = await rosterWorld();
    const outcome = await reviewCanvasRoster(w.teacher, w.classId, deps());
    expect(outcome.sources).toEqual([{ connectionId: w.connection.id, externalCourseIds: [w.course], ok: true, error: null, members: 11 }]);
    expect(outcome.counts).toEqual({ already_linked: 1, linked_elsewhere: 1, suggested: 1, no_match: 8 });

    const rows = await proposalsFor(w.classId);
    const by = new Map(rows.map((r) => [r.externalUserId.replace(`-${w.s}`, ""), r]));
    expect(by.get("lms-ada")).toMatchObject({ matchState: "already_linked", linkedUserId: w.students.ada, suggestedUserId: null, status: "active" });
    expect(by.get("lms-zed")).toMatchObject({ matchState: "linked_elsewhere", linkedUserId: null, suggestedUserId: null, email: null });
    expect(by.get("lms-ben")).toMatchObject({ matchState: "suggested", suggestedUserId: w.students.ben, linkedUserId: null });
    expect(by.get("lms-cal")).toMatchObject({ matchState: "no_match", suggestedUserId: null, name: "Cal Rivera" });
    expect(by.get("lms-dee")).toMatchObject({ matchState: "no_match", suggestedUserId: null });
    expect(by.get("lms-anon")).toMatchObject({ matchState: "no_match", name: null, email: null });
    expect(by.get("lms-fay-new")).toMatchObject({ matchState: "no_match", suggestedUserId: null });
    expect(by.get("lms-ina")).toMatchObject({ matchState: "no_match", status: "inactive" });
    expect(by.get("lms-dup1")).toMatchObject({ matchState: "no_match", name: null });
    expect(by.get("lms-dup2")).toMatchObject({ matchState: "no_match" });
    expect(by.get("lms-teach")).toMatchObject({ matchState: "no_match", roles: [ROLE.instructor] });
    for (const r of rows) {
      expect(r.connectionId).toBe(w.connection.id);
      expect(r.createdAt.getTime()).toBe(outcome.reviewedAt.getTime());
    }
  });

  it("never matches by name — only exact e-mail with a student enrolled in this class", () => {
    const enrolled = [
      { id: "u-ann", email: "ann@school.test" },
      { id: "u-bob", email: "bob@school.test" },
    ];
    const ctx = { enrolled, linksByExternalId: new Map<string, string>(), linkedUserIds: new Set<string>() };
    const members: RosterMember[] = [
      { userId: "c-1", roles: [ROLE.learner], status: "Active", name: "Ann", givenName: "Ann", familyName: "Lee" }, // name only
      { userId: "c-2", roles: [ROLE.learner], status: "Active", name: "Someone", email: "ANN@school.test" },
      { userId: "c-3", roles: [ROLE.learner], status: "Active", name: "Bob", email: "bob@other.test" }, // same name, other e-mail
      { userId: "c-4", roles: [ROLE.learner], status: "Active", email: "ann@school.test.evil" }, // not equal, only similar
    ];
    const result = classifyRosterMembers(members, ctx);
    expect(result.map((r) => [r.externalUserId, r.matchState, r.suggestedUserId])).toEqual([
      ["c-1", "no_match", null],
      ["c-2", "suggested", "u-ann"],
      ["c-3", "no_match", null],
      ["c-4", "no_match", null],
    ]);
    expect(result[0].name).toBe("Ann");
    expect(normaliseEmail("  A@B.C ")).toBe("a@b.c");
    expect(normaliseEmail("not-an-email")).toBeNull();
  });

  it("creates no identity link and no enrolment, and audits the review without names or e-mail addresses", async () => {
    const w = await rosterWorld();
    const db = await getDb();
    const linksBefore = await countRows(externalIdentityMappings);
    const enrolmentsBefore = await countRows(classEnrollments);
    await reviewCanvasRoster(w.teacher, w.classId, deps());
    expect(await countRows(externalIdentityMappings)).toBe(linksBefore);
    expect(await countRows(classEnrollments)).toBe(enrolmentsBefore);
    const links = await db.select().from(externalIdentityMappings).where(eq(externalIdentityMappings.connectionId, w.connection.id));
    expect(links.map((l) => l.externalUserId).sort()).toEqual([`lms-ada-${w.s}`, `lms-fay-old-${w.s}`, `lms-zed-${w.s}`].sort());

    const [audit] = await db.select().from(auditLogs).where(and(eq(auditLogs.action, "lms.roster_reviewed"), eq(auditLogs.entityId, w.classId)));
    expect(audit).toMatchObject({ actorId: w.teacher.id, entityType: "class", organizationId: w.orgId });
    expect(audit.metadata).toMatchObject({ suggested: 1, already_linked: 1, identityLinksCreated: 0 });
    expect(JSON.stringify(audit.metadata)).not.toMatch(/@|Ada|Ben/);
  });

  it("the page model splits linked, unlinked, not-in-class and suggestions", async () => {
    const w = await rosterWorld();
    await reviewCanvasRoster(w.teacher, w.classId, deps());
    const view = await getRosterReview(w.teacher, w.classId);
    expect(view.canReview).toBe(true);
    expect(view.snapshotAt).not.toBeNull();
    expect(view.linkedEnrolled.map((m) => m.studentName)).toEqual(["Ada Lovelace"]);
    expect(view.suggestions).toEqual([expect.objectContaining({ externalUserId: `lms-ben-${w.s}`, userId: w.students.ben, studentName: "Ben Okafor" })]);
    // Enrolled students without a link (live): everyone except ada and fay (fay is linked to another Canvas user).
    expect(view.enrolledUnlinked.map((s) => s.studentName).sort()).toEqual(["Ben Okafor", "Cal Rivera", "Gus Berg", "Hal Moss", "Ina Park", "Una Unlisted"]);
    expect(view.enrolledUnlinked.find((s) => s.userId === w.students.ben)?.suggestion?.externalUserId).toBe(`lms-ben-${w.s}`);
    expect(view.enrolledUnlinked.find((s) => s.userId === w.students.cal)?.suggestion).toBeNull();
    const notIn = new Map(view.canvasNotInClass.map((m) => [m.externalUserId.replace(`-${w.s}`, ""), m]));
    expect([...notIn.keys()].sort()).toEqual(["lms-anon", "lms-cal", "lms-dee", "lms-dup1", "lms-dup2", "lms-fay-new", "lms-ina", "lms-zed"]);
    expect(notIn.get("lms-zed")?.linkedElsewhere).toBe(true);
    expect(notIn.get("lms-cal")?.linkedElsewhere).toBe(false);
    expect(view.canvasStaffCount).toBe(1);

    // A suggestion disappears once the student links themselves (the only way to link).
    const linked = await linkIdentity(w.connection.id, `lms-ben-${w.s}`, w.students.ben, "lti_launch_signed_in");
    expect(linked.ok).toBe(true);
    const after = await getRosterReview(w.teacher, w.classId);
    expect(after.suggestions).toEqual([]);
    expect(after.enrolledUnlinked.some((s) => s.userId === w.students.ben)).toBe(false);
  });

  it("a second review replaces the snapshot (members gone from Canvas disappear, no duplicates)", async () => {
    const w = await rosterWorld();
    await reviewCanvasRoster(w.teacher, w.classId, deps());
    mock.addMembers(w.course, [learner(`lms-new-${w.s}`, { name: "New Learner" })]);
    const second = await reviewCanvasRoster(w.teacher, w.classId, deps());
    expect(second.sources[0].members).toBe(12);
    const rows = await proposalsFor(w.classId);
    expect(rows).toHaveLength(12);
    expect(new Set(rows.map((r) => r.createdAt.getTime())).size).toBe(1);
  });

  it("is refused for a teacher of another class, a teacher of another organisation and a class without a Canvas roster", async () => {
    const w = await rosterWorld();
    const colleague = await newStaff(w.orgId); // same school, not the class teacher, not an admin
    const otherOrg = await newOrg();
    const outsider = await newStaff(otherOrg);
    const outsiderAdmin = await newStaff(otherOrg, "school_admin");
    for (const user of [colleague, outsider, outsiderAdmin]) {
      await expect(reviewCanvasRoster(user, w.classId, deps())).rejects.toMatchObject({ code: "not_found" });
      await expect(getRosterReview(user, w.classId)).rejects.toMatchObject({ code: "not_found" });
    }
    expect(await proposalsFor(w.classId)).toHaveLength(0);

    // A school admin of the class's organisation is staff of the class.
    const admin = await newStaff(w.orgId, "school_admin");
    expect((await reviewCanvasRoster(admin, w.classId, deps())).sources[0].ok).toBe(true);

    // No mapped course → nothing to review.
    const unmapped = await newClass(w.orgId, w.teacher.id);
    await expect(reviewCanvasRoster(w.teacher, unmapped, deps())).rejects.toMatchObject({ code: "conflict" });
    expect((await getRosterReview(w.teacher, unmapped)).canReview).toBe(false);
  });

  it("the restricted database role cannot read the proposals table at all", async () => {
    const w = await rosterWorld();
    await reviewCanvasRoster(w.teacher, w.classId, deps());
    expect(await rejection(asUser(w.teacher, (tx) => tx.select().from(lmsRosterProposals)))).toMatch(/permission denied/);
  });

  it("snapshots older than 30 days are hidden and purged by retention; class and connection deletion cascade", async () => {
    const w = await rosterWorld();
    await reviewCanvasRoster(w.teacher, w.classId, deps());
    const db = await getDb();
    const now = new Date();
    await db.update(lmsRosterProposals).set({ createdAt: new Date(now.getTime() - 31 * DAY) }).where(eq(lmsRosterProposals.classId, w.classId));
    const view = await getRosterReview(w.teacher, w.classId);
    expect(view.snapshotAt).toBeNull();
    expect(view.suggestions).toEqual([]);

    // A fresh snapshot of another class must survive the purge.
    const fresh = await rosterWorld();
    await reviewCanvasRoster(fresh.teacher, fresh.classId, deps());
    const freshCount = (await proposalsFor(fresh.classId)).length;

    const dry = await runRetention({ now });
    expect(dry.counts.rosterProposals).toBeGreaterThanOrEqual(11);
    expect(await proposalsFor(w.classId)).toHaveLength(11); // dry run deletes nothing
    const applied = await runRetention({ now, apply: true });
    expect(applied.counts.rosterProposals).toBe(dry.counts.rosterProposals);
    expect(await proposalsFor(w.classId)).toHaveLength(0);
    expect(await proposalsFor(fresh.classId)).toHaveLength(freshCount);

    // Deleting the connection removes its proposals; deleting the class removes the rest.
    await reviewCanvasRoster(w.teacher, w.classId, deps());
    expect((await proposalsFor(w.classId)).length).toBe(11);
    await db.delete(lmsConnections).where(eq(lmsConnections.id, w.connection.id));
    expect(await proposalsFor(w.classId)).toHaveLength(0);
    await db.delete(classes).where(eq(classes.id, fresh.classId));
    expect(await proposalsFor(fresh.classId)).toHaveLength(0);
  });

  it("an account deletion request removes proposals that point at the account", async () => {
    const w = await rosterWorld();
    const db = await getDb();
    const student = await createUser({ name: "Leaving Student", email: `leaving${w.s}@example.test`, password: "test-password-2026", role: "student" });
    await db.insert(classEnrollments).values({ classId: w.classId, studentId: student.id });
    mock.addMembers(w.course, [learner(`lms-leaving-${w.s}`, { email: `leaving${w.s}@example.test` })]);
    await reviewCanvasRoster(w.teacher, w.classId, deps());
    expect((await proposalsFor(w.classId)).some((r) => r.suggestedUserId === student.id)).toBe(true);
    await requestAccountDeletion(student, { password: "test-password-2026", confirmation: "DELETE" });
    const rows = await proposalsFor(w.classId);
    expect(rows.some((r) => r.suggestedUserId === student.id || r.externalUserId === `lms-leaving-${w.s}`)).toBe(false);
  });

  it("the memberships URL is checked against the SSRF policy and the DNS-rebinding guard", async () => {
    const w = await rosterWorld();
    const db = await getDb();

    // mapCourse refuses a private / foreign memberships URL outright.
    for (const bad of ["https://169.254.169.254/latest/meta-data", "https://10.0.0.5/api/lti/courses/1/names_and_roles", "https://evil.example.org/roster", "http://mock-lms.example.test/x"]) {
      const res = await mapCourse({ connectionId: w.connection.id, externalCourseId: `bad-${bad.length}`, classId: w.classId, membershipsUrl: bad });
      expect(res.ok, bad).toBe(false);
    }

    // A URL written to the table some other way is still refused at fetch time.
    const ssrfClass = await newClass(w.orgId, w.teacher.id);
    await db.insert(externalCourseMappings).values({ connectionId: w.connection.id, externalCourseId: `ssrf-${w.s}`, classId: ssrfClass, membershipsUrl: "https://169.254.169.254/latest/meta-data" });
    const ssrf = await reviewCanvasRoster(w.teacher, ssrfClass, deps());
    expect(ssrf.sources[0]).toMatchObject({ ok: false, members: 0 });
    expect(ssrf.sources[0].error).toMatch(/private|allow-list|same host/i);
    expect(await proposalsFor(ssrfClass)).toHaveLength(0);

    // DNS rebinding: the allow-listed mock host suddenly resolves to a private address.
    await reviewCanvasRoster(w.teacher, w.classId, deps()); // a good snapshot first
    const before = mock.requests.length;
    for (const evil of ["10.0.0.5", "::ffff:127.0.0.1", "fd00::1"]) {
      const rebinding = createCanvasAdapter({ fetch: mock.fetch, resolveHost: async () => [{ address: evil, family: evil.includes(":") ? 6 : 4 }] });
      const outcome = await reviewCanvasRoster(w.teacher, w.classId, { adapter: rebinding });
      expect(outcome.sources[0].ok, evil).toBe(false);
      expect(outcome.sources[0].error).toMatch(/DNS rebinding/);
    }
    expect(mock.requests.length).toBe(before); // the mock platform was never contacted
    expect(await proposalsFor(w.classId)).toHaveLength(11); // the previous snapshot is kept

    // The same adapter with a public answer works (and is what production does with real DNS).
    const publicAdapter = createCanvasAdapter({ fetch: mock.fetch, resolveHost: async () => [{ address: PUBLIC_V4, family: 4 }] });
    expect((await reviewCanvasRoster(w.teacher, w.classId, { adapter: publicAdapter })).sources[0].ok).toBe(true);
  });
});

describe("course mapping from an instructor launch", () => {
  it("maps the Canvas course and its roster address to the assignment's class, never re-pointing an existing mapping", async () => {
    const orgId = await newOrg();
    const teacher = await newStaff(orgId);
    const classId = await newClass(orgId, teacher.id);
    const otherClass = await newClass(orgId, teacher.id);
    const connection = await newConnection(orgId, teacher.id);
    const db = await getDb();
    const { assignments } = await import("@/db/schema");
    const [a] = await db.insert(assignments).values({ classId, createdBy: teacher.id, title: "Linked quiz", kind: "skill_practice", gradingMethod: "score", points: 10 }).returning();
    seq += 1;
    const course = `launch-course-${seq}`;
    const pending: PendingLink = {
      connectionId: connection.id,
      organizationId: orgId,
      userSub: `lms-teacher-${seq}`,
      instructor: true,
      assignmentId: a.id,
      resourceLinkId: `rl-${seq}`,
      lineItemUrl: null,
      contextTitle: "Course",
      contextId: course,
      membershipsUrl: mock.membershipsUrl(course),
      exp: Math.floor(Date.now() / 1000) + 600,
    };
    await maybeMapAssignment(teacher.id, pending);
    const [mapping] = await db.select().from(externalCourseMappings).where(eq(externalCourseMappings.externalCourseId, course));
    expect(mapping).toMatchObject({ connectionId: connection.id, classId, membershipsUrl: mock.membershipsUrl(course) });

    // A student launch, or a launch by someone who doesn't teach the class, maps nothing.
    const other = `launch-course-other-${seq}`;
    await maybeMapAssignment(teacher.id, { ...pending, instructor: false, contextId: other });
    const stranger = await newStaff(orgId);
    await maybeMapAssignment(stranger.id, { ...pending, contextId: other });
    expect(await db.select().from(externalCourseMappings).where(eq(externalCourseMappings.externalCourseId, other))).toHaveLength(0);

    // Already mapped to another class → left alone.
    await db.update(externalCourseMappings).set({ classId: otherClass }).where(eq(externalCourseMappings.externalCourseId, course));
    await maybeMapAssignment(teacher.id, pending);
    const [still] = await db.select().from(externalCourseMappings).where(eq(externalCourseMappings.externalCourseId, course));
    expect(still.classId).toBe(otherClass);

    // A roster address outside the policy is dropped; the course is still mapped.
    const third = `launch-course-third-${seq}`;
    await maybeMapAssignment(teacher.id, { ...pending, contextId: third, membershipsUrl: "https://10.0.0.5/roster" });
    const [thirdMapping] = await db.select().from(externalCourseMappings).where(eq(externalCourseMappings.externalCourseId, third));
    expect(thirdMapping).toMatchObject({ classId, membershipsUrl: null });
  });
});

// ─────────────────────────────── DNS rebinding ──────────────────────────────

const resolverFor =
  (answers: Record<string, string[]>): HostResolver =>
  async (host) => {
    const list = answers[host];
    if (!list) throw Object.assign(new Error(`getaddrinfo ENOTFOUND ${host}`), { code: "ENOTFOUND" });
    return list.map((address) => ({ address, family: address.includes(":") ? 6 : 4 }));
  };

describe("DNS-rebinding defence (dnsGuard)", () => {
  it("classifies resolved addresses: public passes, every non-public range fails (IPv4, IPv6, mapped, NAT64, 6to4)", () => {
    for (const address of [PUBLIC_V4, "8.8.8.8", "1.1.1.1", PUBLIC_V6, "2001:4860:4860::8888", "::ffff:93.184.216.34", "64:ff9b::808:808", "2002:5db8:d822::1"]) {
      expect(isNonPublicAddress(address), address).toBe(false);
    }
    for (const address of [
      "10.0.0.5",
      "127.0.0.1",
      "127.8.9.10",
      "0.0.0.0",
      "169.254.169.254",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "100.64.0.1",
      "224.0.0.1",
      "255.255.255.255",
      "::",
      "::1",
      "fe80::1",
      "fe80::1%eth0",
      "fc00::1",
      "fd12:3456::1",
      "fec0::1",
      "ff02::1",
      "::ffff:127.0.0.1",
      "::ffff:10.0.0.5",
      "::ffff:7f00:1",
      "::127.0.0.1",
      "64:ff9b::a00:5",
      "64:ff9b:1::1",
      "2002:0a00:0005::1",
      "2001:db8::1",
      "2001::1",
      "not-an-ip",
      "",
    ]) {
      expect(isNonPublicAddress(address), address).toBe(true);
    }
  });

  it("resolvePublicAddress: public, private, mixed results, IPv6, IPv4-mapped, DNS failure and empty answers", async () => {
    const resolve = resolverFor({
      "canvas.example.test": [PUBLIC_V4, PUBLIC_V6],
      "private.example.test": ["10.0.0.5"],
      "mixed.example.test": [PUBLIC_V4, "10.0.0.5"],
      "mixed6.example.test": [PUBLIC_V6, "fd00::1"],
      "v6.example.test": [PUBLIC_V6],
      "mapped.example.test": ["::ffff:127.0.0.1"],
      "metadata.example.test": ["169.254.169.254"],
      "empty.example.test": [],
    });
    expect(await resolvePublicAddress("canvas.example.test", resolve)).toEqual({ ok: true, pinned: { address: PUBLIC_V4, family: 4 } });
    expect(await resolvePublicAddress("v6.example.test", resolve)).toEqual({ ok: true, pinned: { address: PUBLIC_V6, family: 6 } });
    for (const host of ["private.example.test", "mixed.example.test", "mixed6.example.test", "mapped.example.test", "metadata.example.test"]) {
      const res = await resolvePublicAddress(host, resolve);
      expect(res, host).toMatchObject({ ok: false, kind: "non_public" });
      expect(res.ok ? "" : res.reason).not.toMatch(/10\.0\.0\.5|127\.0\.0\.1|169\.254/); // never leaks the resolved address
    }
    expect(await resolvePublicAddress("missing.example.test", resolve)).toMatchObject({ ok: false, kind: "dns_failed" });
    expect(await resolvePublicAddress("empty.example.test", resolve)).toMatchObject({ ok: false, kind: "dns_failed" });
    // IP literals are judged directly, without a lookup.
    const never: HostResolver = async () => {
      throw new Error("must not be called");
    };
    expect(await resolvePublicAddress(PUBLIC_V4, never)).toEqual({ ok: true, pinned: { address: PUBLIC_V4, family: 4 } });
    expect(await resolvePublicAddress(`[${PUBLIC_V6}]`, never)).toEqual({ ok: true, pinned: { address: PUBLIC_V6, family: 6 } });
  });

  it("safeFetch refuses before any request when a hostname resolves to a non-public address, and maps DNS failure to a retryable error", async () => {
    const calls: string[] = [];
    const fetchSpy: FetchLike = async (input) => {
      calls.push(String(input));
      return new Response("{}", { status: 200 });
    };
    const resolveHost = resolverFor({ "canvas.example.test": [PUBLIC_V4], "rebind.example.test": [PUBLIC_V4, "10.0.0.5"], "mapped.example.test": ["::ffff:127.0.0.1"] });
    const policy = urlPolicyFromEnv({ NODE_ENV: "production", LTI_ALLOWED_HOSTS: "*.example.test" });

    const good = await safeFetch({ fetch: fetchSpy, resolveHost, urlPolicy: policy }, "https://canvas.example.test/api/x", { method: "GET" }, "Test request");
    expect(good.ok).toBe(true);
    for (const host of ["rebind.example.test", "mapped.example.test"]) {
      const res = await safeFetch({ fetch: fetchSpy, resolveHost, urlPolicy: policy }, `https://${host}/api/x`, { method: "GET" }, "Test request");
      expect(res).toMatchObject({ ok: false, error: { code: "bad_request" } });
      expect(res.ok ? "" : res.error.message).toMatch(/DNS rebinding/);
    }
    const missing = await safeFetch({ fetch: fetchSpy, resolveHost, urlPolicy: policy }, "https://gone.example.test/api/x", { method: "GET" }, "Test request");
    expect(missing).toMatchObject({ ok: false, error: { code: "platform_error" } });
    expect(calls).toEqual(["https://canvas.example.test/api/x"]);

    // The host allow-list and https rule still apply first.
    expect(await safeFetch({ fetch: fetchSpy, resolveHost, urlPolicy: policy }, "https://canvas.evil.test/x", {}, "Test request")).toMatchObject({ ok: false, error: { code: "bad_request" } });
    expect(await safeFetch({ fetch: fetchSpy, resolveHost, urlPolicy: policy }, "http://canvas.example.test/x", {}, "Test request")).toMatchObject({ ok: false, error: { code: "bad_request" } });
    expect(calls).toHaveLength(1);
  });

  it("without an injected fetch, the request is sent through a transport pinned to the validated address", async () => {
    const pins: { address: string; family: number }[] = [];
    outboundDefaults.resolver = resolverFor({ "canvas.example.test": [PUBLIC_V4, PUBLIC_V6] });
    outboundDefaults.transport = (pin) => {
      pins.push(pin);
      return async () => new Response("pinned", { status: 200 });
    };
    const policy = urlPolicyFromEnv({ NODE_ENV: "production", LTI_ALLOWED_HOSTS: "*.example.test" });
    const res = await safeFetch({ urlPolicy: policy }, "https://canvas.example.test/api/x", { method: "GET" }, "Test request");
    expect(res.ok && (await res.value.text())).toBe("pinned");
    expect(pins).toEqual([{ address: PUBLIC_V4, family: 4 }]);

    // localhost stays exempt outside production (no lookup) and refused in production by the policy.
    const transport = await guardOutbound(new URL("http://localhost:3000/x"), {}, "Test request");
    expect(transport.ok).toBe(true);
    expect(pins).toHaveLength(1);
    expect(await safeFetch({ urlPolicy: policy }, "http://localhost:3000/x", {}, "Test request")).toMatchObject({ ok: false, error: { code: "bad_request" } });
  });

  describe("pinnedFetch (node:http transport)", () => {
    let server: Server;
    let port = 0;
    const seen: { host: string | undefined; method: string | undefined; url: string | undefined; body: string; contentType: string | undefined }[] = [];

    beforeAll(async () => {
      server = createServer((req: IncomingMessage, res) => {
        let body = "";
        req.on("data", (c: Buffer) => (body += c.toString()));
        req.on("end", () => {
          seen.push({ host: req.headers.host, method: req.method, url: req.url, body, contentType: req.headers["content-type"] });
          if (req.url === "/redirect") {
            res.writeHead(302, { location: "http://169.254.169.254/latest" });
            res.end();
          } else if (req.url === "/slow") {
            setTimeout(() => res.end("late"), 2_000);
          } else if (req.url === "/empty") {
            res.writeHead(204);
            res.end();
          } else {
            res.writeHead(201, { "content-type": "application/json", link: '<https://x/next>; rel="next"' });
            res.end(JSON.stringify({ ok: true }));
          }
        });
      });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      port = (server.address() as AddressInfo).port;
    });

    afterAll(async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it("connects only to the pinned address while keeping the hostname for the Host header", async () => {
      // "canvas.unresolvable.invalid" can never resolve; the request still arrives because the socket is pinned.
      const f = pinnedFetch({ address: "127.0.0.1", family: 4 });
      const res = await f(`http://canvas.unresolvable.invalid:${port}/api/lti/courses/1/names_and_roles?limit=2`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
        body: "grant_type=client_credentials",
      });
      expect(res.status).toBe(201);
      expect(res.headers.get("link")).toContain('rel="next"');
      expect(await res.json()).toEqual({ ok: true });
      expect(seen.at(-1)).toEqual({
        host: `canvas.unresolvable.invalid:${port}`,
        method: "POST",
        url: "/api/lti/courses/1/names_and_roles?limit=2",
        body: "grant_type=client_credentials",
        contentType: "application/x-www-form-urlencoded",
      });
    });

    it("never follows redirects, handles empty bodies, honours the abort signal and the size cap", async () => {
      const f = pinnedFetch({ address: "127.0.0.1", family: 4 });
      const redirect = await f(`http://canvas.unresolvable.invalid:${port}/redirect`);
      expect(redirect.status).toBe(302);
      expect(redirect.headers.get("location")).toBe("http://169.254.169.254/latest");
      expect((await f(`http://canvas.unresolvable.invalid:${port}/empty`)).status).toBe(204);
      await expect(f(`http://canvas.unresolvable.invalid:${port}/slow`, { signal: AbortSignal.timeout(100) })).rejects.toThrow();
      await expect(pinnedFetch({ address: "127.0.0.1", family: 4 }, { maxBytes: 4 })(`http://canvas.unresolvable.invalid:${port}/json`)).rejects.toThrow(/exceeds/);
    });
  });
});
