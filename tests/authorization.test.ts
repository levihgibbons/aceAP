/**
 * Tenant isolation and privacy.
 *
 * The important assertions query through `asUser`, i.e. as the restricted
 * `aceap_app` role with PostgreSQL row-level security — so they prove the
 * DATABASE blocks access, not just the service layer. Service-level refusals
 * are checked as well. Tests share one world and run in order; the
 * roster-removal tests come last because they change enrolment.
 */
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { asUser, type Actor } from "@/db/client";
import * as t from "@/db/schema";
import { recordHeartbeat, startLearningSession } from "@/modules/analytics/service";
import { startAttempt, submitAttempt } from "@/modules/assessments/service";
import { createSession } from "@/modules/auth/service";
import { classesSharedWithStudent, getMasteryMatrix, getRoster, getStudentAttempts } from "@/modules/classrooms/analytics";
import { assertClassStaff, createAssignment, removeStudent } from "@/modules/classrooms/service";
import { getSkillDetail, listStudentAssignments } from "@/modules/learning/overview";
import { startLesson } from "@/modules/learning/progress";
import { answerCorrectly, answerIncorrectly, attemptRow, bootWorld, calc, countRows, DAY, MINUTE, plus, rejection, T0, type World } from "./helpers/world";

let w: World;
let sharedNoteId = "";
let privateNoteId = "";
let wholeClassAssignmentId = "";

/** Number of rows of `table` belonging to `userId` that `actor` can see under RLS (optionally one course). */
async function visible(actor: Actor, table: PgTable, userCol: AnyPgColumn, userId: string, course?: { col: AnyPgColumn; id: string }): Promise<number> {
  const [{ n }] = await asUser(actor, (tx) =>
    tx
      .select({ n: sql<number>`count(*)::int` })
      .from(table)
      .where(and(eq(userCol, userId), course ? eq(course.col, course.id) : undefined)),
  );
  return n;
}

/** Same count with the trusted role (sanity check that the rows exist). */
async function existing(table: PgTable, userCol: AnyPgColumn, userId: string, course?: { col: AnyPgColumn; id: string }) {
  return countRows(table, and(eq(userCol, userId), course ? eq(course.col, course.id) : undefined));
}

const STUDENT_RECORDS: [string, PgTable, AnyPgColumn, AnyPgColumn | null][] = [
  ["mastery_states", t.masteryStates, t.masteryStates.userId, t.masteryStates.courseId],
  ["mastery_evidence", t.masteryEvidence, t.masteryEvidence.userId, t.masteryEvidence.courseId],
  ["mastery_snapshots", t.masterySnapshots, t.masterySnapshots.userId, t.masterySnapshots.courseId],
  ["question_responses", t.questionResponses, t.questionResponses.userId, t.questionResponses.courseId],
  ["attempts", t.attempts, t.attempts.userId, t.attempts.courseId],
  ["lesson_progress", t.lessonProgress, t.lessonProgress.userId, t.lessonProgress.courseId],
  ["activity_aggregates", t.activityAggregates, t.activityAggregates.userId, t.activityAggregates.courseId],
  ["learning_events", t.learningEvents, t.learningEvents.userId, t.learningEvents.courseId],
  ["learning_sessions", t.learningSessions, t.learningSessions.userId, t.learningSessions.courseId],
  ["detected_misconceptions", t.detectedMisconceptions, t.detectedMisconceptions.userId, t.detectedMisconceptions.courseId],
];

beforeAll(async () => {
  w = await bootWorld();
  const { ada, cleo, quinn } = w.students;
  const day = plus(T0, DAY);

  // Ada (Northfield calculus): lesson progress, a lesson check with a detected misconception, practice, active time.
  await startLesson(ada.id, "calculus-ab.l.chain-rule", day);
  const lesson = await startAttempt(ada.id, { kind: "lesson", lessonId: "calculus-ab.l.chain-rule" }, plus(day, MINUTE));
  await answerIncorrectly(lesson.attemptId, "calculus-ab.q.cp-1", { prefer: "omit-inner", now: plus(day, 3 * MINUTE) });
  await answerCorrectly(lesson.attemptId, "calculus-ab.q.cp-2", { now: plus(day, 5 * MINUTE) });
  const practice = await startAttempt(ada.id, { kind: "practice", skillId: calc("power-rule"), count: 3 }, plus(day, 10 * MINUTE));
  for (const item of (await attemptRow(practice.attemptId)).items) await answerCorrectly(practice.attemptId, item.questionId, { now: plus(day, 12 * MINUTE) });
  await submitAttempt(ada.id, practice.attemptId, plus(day, 15 * MINUTE));
  const session = await startLearningSession(ada.id, { activityKind: "lesson", courseId: "calculus-ab", activityId: "calculus-ab.l.chain-rule" }, day);
  await recordHeartbeat(ada.id, { sessionId: session, openMs: 30_000, activeMs: 30_000 }, plus(day, 30_000));

  // Ada also studies Physics 1 independently — no class, so no teacher may see it.
  const physicsDay = plus(T0, 2 * DAY);
  await startLesson(ada.id, "physics-1.l.position-displacement", physicsDay);
  const physics = await startAttempt(ada.id, { kind: "practice", skillId: "physics-1.position-displacement", count: 2 }, plus(physicsDay, MINUTE));
  for (const item of (await attemptRow(physics.attemptId)).items) await answerCorrectly(physics.attemptId, item.questionId, { now: plus(physicsDay, 3 * MINUTE) });
  const physicsSession = await startLearningSession(ada.id, { activityKind: "practice", courseId: "physics-1", activityId: "physics-1.position-displacement" }, physicsDay);
  await recordHeartbeat(ada.id, { sessionId: physicsSession, openMs: 20_000, activeMs: 20_000 }, plus(physicsDay, 20_000));

  // Cleo is in the Northfield teacher's Physics class: her Physics records ARE visible to that teacher.
  const cleoPhysics = await startAttempt(cleo.id, { kind: "practice", skillId: "physics-1.position-displacement", count: 2 }, physicsDay);
  for (const item of (await attemptRow(cleoPhysics.attemptId)).items) await answerCorrectly(cleoPhysics.attemptId, item.questionId, { now: plus(physicsDay, 2 * MINUTE) });

  // Quinn (Lakeview) has evidence of their own.
  const q = await startAttempt(quinn.id, { kind: "practice", skillId: calc("power-rule"), count: 2 }, day);
  for (const item of (await attemptRow(q.attemptId)).items) await answerCorrectly(q.attemptId, item.questionId, { now: plus(day, 2 * MINUTE) });

  // A session row exists, so "cannot read sessions" is not vacuous.
  await createSession(ada.id, day);

  const assignment = await createAssignment(w.teachers.northfield, { classId: w.classes.northCalc.id, title: "Whole-class chain rule quiz", kind: "assessment", assessmentId: "calculus-ab.quiz.chain" });
  wholeClassAssignmentId = assignment.id;
});

// ═══════════════════════════════ Demo G: tenants ════════════════════════════

describe("Demo G — another school's teacher", () => {
  it("gets zero rows from every student-record table at the database level", async () => {
    const { ada } = w.students;
    for (const [name, table, userCol] of STUDENT_RECORDS) {
      expect(await existing(table, userCol, ada.id), `${name} has rows for the student`).toBeGreaterThan(0);
      expect(await visible(w.teachers.lakeview, table, userCol, ada.id), `${name} visible to Lakeview teacher`).toBe(0);
    }
    expect(await visible(w.teachers.lakeview, t.users, t.users.id, ada.id)).toBe(0);
    expect(await visible(w.teachers.lakeview, t.classEnrollments, t.classEnrollments.studentId, ada.id)).toBe(0);
    expect(await asUser(w.teachers.lakeview, (tx) => tx.select().from(t.classes).where(eq(t.classes.id, w.classes.northCalc.id)))).toHaveLength(0);
  });

  it("is refused by the services (not found, without revealing the class exists)", async () => {
    const { ada } = w.students;
    const lake = w.teachers.lakeview;
    await expect(getMasteryMatrix(lake, w.classes.northCalc.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(getRoster(lake, w.classes.northCalc.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(assertClassStaff(w.db, lake, w.classes.northCalc.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(createAssignment(lake, { classId: w.classes.northCalc.id, title: "Sneaky", kind: "skill_practice", skillIds: [calc("power-rule")] })).rejects.toMatchObject({ code: "not_found" });
    // Student-scoped reads are filtered by RLS: they come back empty rather than leaking anything.
    expect(await classesSharedWithStudent(lake, ada.id)).toEqual([]);
    expect(await getStudentAttempts(lake, "calculus-ab", ada.id)).toEqual([]);
    // Skill detail refuses outright rather than returning an empty record.
    await expect(getSkillDetail(lake, ada.id, calc("chain-polynomial"))).rejects.toMatchObject({ code: "not_found" });
  });
});

// ═════════════════════════ teacher scope within a school ════════════════════

describe("Own teacher — scoped to the course they teach the student", () => {
  it("can read the student's calculus records", async () => {
    const { ada } = w.students;
    const calcCourse = (col: AnyPgColumn) => ({ col, id: "calculus-ab" });
    for (const [name, table, userCol, courseCol] of STUDENT_RECORDS) {
      const expected = await existing(table, userCol, ada.id, calcCourse(courseCol!));
      expect(await visible(w.teachers.northfield, table, userCol, ada.id, calcCourse(courseCol!)), name).toBe(expected);
    }
    const detail = await getSkillDetail(w.teachers.northfield, ada.id, calc("chain-polynomial"));
    expect(detail.evidence.length).toBeGreaterThan(0);
  });

  it("cannot read that student's independent Physics records, even though they teach Physics to others", async () => {
    const { ada, cleo } = w.students;
    const physics = (col: AnyPgColumn) => ({ col, id: "physics-1" });
    let checked = 0;
    for (const [name, table, userCol, courseCol] of STUDENT_RECORDS) {
      const rows = await existing(table, userCol, ada.id, physics(courseCol!));
      if (rows === 0) continue; // e.g. no misconceptions in physics
      checked += 1;
      expect(await visible(w.teachers.northfield, table, userCol, ada.id, physics(courseCol!)), name).toBe(0);
    }
    expect(checked).toBeGreaterThanOrEqual(6);
    // Control: the same teacher does see Physics evidence of a student in their Physics class.
    expect(await visible(w.teachers.northfield, t.masteryEvidence, t.masteryEvidence.userId, cleo.id, physics(t.masteryEvidence.courseId))).toBeGreaterThan(0);
    // The service path agrees.
    const detail = await getSkillDetail(w.teachers.northfield, ada.id, "physics-1.position-displacement");
    expect(detail.evidence).toEqual([]);
    expect(detail.state).toBeNull();
    expect(await getStudentAttempts(w.teachers.northfield, "physics-1", ada.id)).toEqual([]);
  });
});

// ═══════════════════════════════ student privacy ════════════════════════════

describe("Students", () => {
  it("cannot read a classmate's attempts, evidence, mastery or responses", async () => {
    const { ada, ben } = w.students;
    for (const [name, table, userCol] of STUDENT_RECORDS) expect(await visible(ben, table, userCol, ada.id), name).toBe(0);
    // …but do see their own teacher and themselves.
    expect(await visible(ben, t.users, t.users.id, ben.id)).toBe(1);
    expect(await visible(ben, t.users, t.users.id, w.teachers.northfield.id)).toBe(1);
  });

  it("cannot write mastery evidence or mastery states (permission denied)", async () => {
    const { ada, ben } = w.students;
    const [ev] = await w.db.select().from(t.masteryEvidence).where(eq(t.masteryEvidence.userId, ada.id)).limit(1);
    const forged = { ...ev, id: undefined, userId: ben.id, score: 1 };
    expect(await rejection(asUser(ben, (tx) => tx.insert(t.masteryEvidence).values(forged)))).toMatch(/permission denied/i);
    expect(await rejection(asUser(ben, (tx) => tx.update(t.masteryStates).set({ level: "mastered", estimate: 0.99 }).where(eq(t.masteryStates.userId, ben.id))))).toMatch(/permission denied/i);
    expect(await rejection(asUser(ada, (tx) => tx.update(t.masteryStates).set({ level: "mastered" }).where(eq(t.masteryStates.userId, ada.id))))).toMatch(/permission denied/i);
    expect(await rejection(asUser(ada, (tx) => tx.delete(t.masteryEvidence).where(eq(t.masteryEvidence.userId, ada.id))))).toMatch(/permission denied/i);
    expect(await rejection(asUser(ada, (tx) => tx.update(t.questionResponses).set({ score: 1, isCorrect: true }).where(eq(t.questionResponses.userId, ada.id))))).toMatch(/permission denied/i);
    // Nothing changed.
    expect(await countRows(t.masteryEvidence, eq(t.masteryEvidence.userId, ben.id))).toBe(0);
    expect(await countRows(t.masteryStates, and(eq(t.masteryStates.userId, ada.id), eq(t.masteryStates.level, "mastered")))).toBe(0);
  });

  it("aceap_app can never read password hashes, sessions or answer keys — whatever the role", async () => {
    for (const actor of [w.students.ada, w.teachers.northfield, w.admin]) {
      expect(await rejection(asUser(actor, (tx) => tx.select({ hash: t.users.passwordHash }).from(t.users)))).toMatch(/permission denied/i);
      expect(await rejection(asUser(actor, (tx) => tx.select().from(t.users)))).toMatch(/permission denied/i); // select * includes password_hash
      expect(await rejection(asUser(actor, (tx) => tx.select().from(t.sessions)))).toMatch(/permission denied/i);
      expect(await rejection(asUser(actor, (tx) => tx.select().from(t.questionVersions)))).toMatch(/permission denied/i);
    }
    // The permitted user columns still work.
    expect(await asUser(w.students.ada, (tx) => tx.select({ id: t.users.id, name: t.users.name }).from(t.users).where(eq(t.users.id, w.students.ada.id)))).toHaveLength(1);
  });
});

// ═══════════════════════════════ knowledge vault ════════════════════════════

describe("Vault notes", () => {
  it("are private to the student until explicitly shared with a class", async () => {
    const { ada, ben } = w.students;
    const north = w.teachers.northfield;
    const [shared] = await asUser(ada, (tx) => tx.insert(t.vaultNotes).values({ userId: ada.id, title: "Chain rule in my words", body: "Outside derivative, inside kept, times inside derivative." }).returning());
    const [priv] = await asUser(ada, (tx) => tx.insert(t.vaultNotes).values({ userId: ada.id, title: "Private study diary", body: "Not for anyone else." }).returning());
    sharedNoteId = shared.id;
    privateNoteId = priv.id;

    expect(await visible(north, t.vaultNotes, t.vaultNotes.userId, ada.id)).toBe(0);
    expect(await visible(ben, t.vaultNotes, t.vaultNotes.userId, ada.id)).toBe(0);
    expect(await visible(ada, t.vaultNotes, t.vaultNotes.userId, ada.id)).toBe(2);

    // Only the owner can create notes as themselves.
    expect(await rejection(asUser(north, (tx) => tx.insert(t.vaultNotes).values({ userId: ada.id, title: "Planted by teacher" })))).toMatch(/row-level security/i);
    // A student can share only into a class they are actively enrolled in.
    expect(await rejection(asUser(ada, (tx) => tx.insert(t.vaultShares).values({ noteId: shared.id, classId: w.classes.lakeCalc.id, sharedBy: ada.id })))).toMatch(/row-level security/i);
    // Nobody can share someone else's note.
    expect(await rejection(asUser(ben, (tx) => tx.insert(t.vaultShares).values({ noteId: shared.id, classId: w.classes.northCalc.id, sharedBy: ben.id })))).toMatch(/row-level security/i);

    await asUser(ada, (tx) => tx.insert(t.vaultShares).values({ noteId: shared.id, classId: w.classes.northCalc.id, sharedBy: ada.id }));
    const teacherSees = await asUser(north, (tx) => tx.select({ id: t.vaultNotes.id }).from(t.vaultNotes).where(eq(t.vaultNotes.userId, ada.id)));
    expect(teacherSees.map((n) => n.id)).toEqual([shared.id]);
    expect(await visible(w.teachers.lakeview, t.vaultNotes, t.vaultNotes.userId, ada.id)).toBe(0);
    expect(await visible(ben, t.vaultNotes, t.vaultNotes.userId, ada.id)).toBe(0);
    // The teacher can read but not edit it.
    await asUser(north, (tx) => tx.update(t.vaultNotes).set({ body: "edited by teacher" }).where(eq(t.vaultNotes.id, shared.id)));
    const [stored] = await w.db.select().from(t.vaultNotes).where(eq(t.vaultNotes.id, shared.id));
    expect(stored.body).toContain("Outside derivative");
  });
});

// ═══════════════════════════════ platform admin ═════════════════════════════

describe("Platform admin", () => {
  it("can read learning records across organisations but not unshared (or shared) vault notes", async () => {
    const { ada, quinn } = w.students;
    expect(await visible(w.admin, t.masteryStates, t.masteryStates.userId, ada.id)).toBe(await existing(t.masteryStates, t.masteryStates.userId, ada.id));
    expect(await visible(w.admin, t.masteryStates, t.masteryStates.userId, quinn.id)).toBeGreaterThan(0);
    expect(await visible(w.admin, t.masteryEvidence, t.masteryEvidence.userId, quinn.id)).toBeGreaterThan(0);
    const classes = await asUser(w.admin, (tx) => tx.select({ id: t.classes.id, org: t.classes.organizationId }).from(t.classes));
    expect(new Set(classes.map((c) => c.org))).toEqual(new Set([w.orgs.northfield.id, w.orgs.lakeview.id]));
    expect(await asUser(w.admin, (tx) => tx.select().from(t.organizations))).toHaveLength(2);
    const matrix = await getMasteryMatrix(w.admin, w.classes.lakeCalc.id);
    expect(matrix.students.map((s) => s.id)).toEqual([quinn.id]);

    expect(privateNoteId && sharedNoteId).toBeTruthy();
    expect(await visible(w.admin, t.vaultNotes, t.vaultNotes.userId, ada.id)).toBe(0);
  });
});

// ═══════════════════════ roster removal (changes state — last) ══════════════

describe("Removing a student from a class", () => {
  it("revokes the teacher's access to their learning records", async () => {
    const { ada } = w.students;
    const north = w.teachers.northfield;
    expect(await visible(north, t.masteryStates, t.masteryStates.userId, ada.id)).toBeGreaterThan(0);
    await removeStudent(north, w.classes.northCalc.id, ada.id);
    for (const [name, table, userCol] of STUDENT_RECORDS) expect(await visible(north, table, userCol, ada.id), name).toBe(0);
    expect(await visible(north, t.users, t.users.id, ada.id)).toBe(0);
    const matrix = await getMasteryMatrix(north, w.classes.northCalc.id);
    expect(matrix.students.map((s) => s.id)).not.toContain(ada.id);
    await expect(getSkillDetail(north, ada.id, calc("chain-polynomial"))).rejects.toMatchObject({ code: "not_found" });
  });

  it("also revokes access to notes the student had shared with that class", async () => {
    const { ada } = w.students;
    expect(await visible(w.teachers.northfield, t.vaultNotes, t.vaultNotes.userId, ada.id)).toBe(0);
  });

  it("hides that class's assignments from the removed student", async () => {
    const { ada, ben } = w.students;
    // Control: a remaining classmate still sees it.
    expect((await asUser(ben, (tx) => listStudentAssignments(tx, ben.id))).map((a) => a.id)).toContain(wholeClassAssignmentId);
    expect(await asUser(ada, (tx) => tx.select().from(t.assignments).where(eq(t.assignments.classId, w.classes.northCalc.id)))).toHaveLength(0);
    expect(await asUser(ada, (tx) => listStudentAssignments(tx, ada.id))).toEqual([]);
    expect(await asUser(ada, (tx) => tx.select().from(t.classes).where(eq(t.classes.id, w.classes.northCalc.id)))).toHaveLength(0);
    await expect(startAttempt(ada.id, { kind: "assignment", assignmentId: wholeClassAssignmentId }, plus(T0, 10 * DAY))).rejects.toMatchObject({ code: "forbidden" });
    // Their own records are still theirs.
    expect(await visible(ada, t.masteryStates, t.masteryStates.userId, ada.id)).toBeGreaterThan(0);
  });
});

// ═══════════════════════════ secrets & client bundles ═══════════════════════

describe("Secrets never reach client bundles (static guard)", () => {
  const root = path.resolve(__dirname, "..");
  const walk = (dir: string): string[] =>
    fs.existsSync(dir)
      ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : /\.(tsx?|jsx?|mjs)$/.test(d.name) ? [path.join(dir, d.name)] : []))
      : [];
  const isClientModule = (src: string) => /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*["']use client["']/.test(src);
  const FORBIDDEN: [string, RegExp][] = [
    ["process.env.ANTHROPIC_API_KEY", /process\.env(?:\.ANTHROPIC_API_KEY|\[\s*["'`]ANTHROPIC_API_KEY)/],
    ["LTI_TOOL_PRIVATE_KEY", /LTI_TOOL_PRIVATE_KEY/],
    ["DATABASE_URL", /DATABASE_URL/],
    ["import of @/db/client", /from\s+["']@\/db\/client["']|import\(\s*["']@\/db\/client["']\s*\)|require\(\s*["']@\/db\/client["']\s*\)/],
  ];

  it("no client module references server secrets or the database client; server-side component helpers are marked server-only", () => {
    const components = walk(path.join(root, "src", "components"));
    const app = walk(path.join(root, "src", "app"));
    expect(components.length).toBeGreaterThan(0);
    const isServerOnly = (src: string) => /import\s+["']server-only["']/.test(src);
    const componentsDir = path.join(root, "src", "components");
    const offences: string[] = [];
    for (const file of [...components, ...app]) {
      const src = fs.readFileSync(file, "utf8");
      // Under src/app only client modules reach the browser. Under src/components any module could be
      // imported by one, so a component touching secrets/DB must import "server-only" (Next.js then
      // fails the build if a client module ever imports it).
      const mustBeClean = isClientModule(src) || (file.startsWith(componentsDir) && !isServerOnly(src));
      if (!mustBeClean) continue;
      for (const [label, re] of FORBIDDEN) if (re.test(src)) offences.push(`${path.relative(root, file)} → ${label}`);
    }
    expect(offences).toEqual([]);
  });
});
