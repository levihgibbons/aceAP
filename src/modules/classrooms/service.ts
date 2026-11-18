/**
 * Classes, rosters and assignments. Every mutation re-checks authorisation on
 * the server; hiding a button is never the access control.
 */
import { randomInt } from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type Db } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { DEFAULT_GRADING_POLICY } from "@/modules/gradebook/policy";

export interface StaffUser {
  id: string;
  role: t.UserRole;
}

type ClassRow = typeof t.classes.$inferSelect;

/** Teacher of the class, school admin of its organisation, or platform admin. */
export async function assertClassStaff(db: Db, user: StaffUser, classId: string): Promise<ClassRow> {
  if (!/^[0-9a-f-]{36}$/i.test(classId)) throw new DomainError("not_found", "Class not found.");
  const [cls] = await db.select().from(t.classes).where(eq(t.classes.id, classId));
  if (!cls) throw new DomainError("not_found", "Class not found.");
  if (user.role === "platform_admin" || cls.teacherId === user.id) return cls;
  const [admin] = await db
    .select({ userId: t.organizationMemberships.userId })
    .from(t.organizationMemberships)
    .where(and(eq(t.organizationMemberships.organizationId, cls.organizationId), eq(t.organizationMemberships.userId, user.id), eq(t.organizationMemberships.role, "school_admin")));
  if (!admin) throw new DomainError("not_found", "Class not found."); // Don't reveal that it exists.
  return cls;
}

export async function staffOrganizations(db: Db, userId: string) {
  return db
    .select({ id: t.organizations.id, name: t.organizations.name, role: t.organizationMemberships.role })
    .from(t.organizationMemberships)
    .innerJoin(t.organizations, eq(t.organizations.id, t.organizationMemberships.organizationId))
    .where(and(eq(t.organizationMemberships.userId, userId), inArray(t.organizationMemberships.role, ["teacher", "school_admin"])));
}

export interface ClassSummary {
  id: string;
  name: string;
  courseId: string;
  courseName: string;
  organizationName: string;
  joinCode: string;
  studentCount: number;
  aiPolicy: t.AiPolicy;
  teacherId: string;
  createdAt: Date;
}

export async function listClassesForStaff(user: StaffUser): Promise<ClassSummary[]> {
  const db = await getDb();
  const orgs = await staffOrganizations(db, user.id);
  const adminOrgIds = orgs.filter((o) => o.role === "school_admin").map((o) => o.id);
  const scope =
    user.role === "platform_admin"
      ? undefined
      : adminOrgIds.length
        ? sql`(${t.classes.teacherId} = ${user.id} or ${inArray(t.classes.organizationId, adminOrgIds)})`
        : eq(t.classes.teacherId, user.id);
  const rows = await db
    .select({
      c: t.classes,
      courseName: t.courses.name,
      organizationName: t.organizations.name,
      studentCount: sql<number>`(select count(*)::int from ${t.classEnrollments} e where e.class_id = ${t.classes.id} and e.status = 'active')`,
    })
    .from(t.classes)
    .innerJoin(t.courses, eq(t.courses.id, t.classes.courseId))
    .innerJoin(t.organizations, eq(t.organizations.id, t.classes.organizationId))
    .where(and(sql`${t.classes.archivedAt} is null`, scope))
    .orderBy(asc(t.classes.name));
  return rows.map((r) => ({ id: r.c.id, name: r.c.name, courseId: r.c.courseId, courseName: r.courseName, organizationName: r.organizationName, joinCode: r.c.joinCode, studentCount: r.studentCount, aiPolicy: r.c.aiPolicy, teacherId: r.c.teacherId, createdAt: r.c.createdAt }));
}

const JOIN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
export function generateJoinCode(): string {
  return Array.from({ length: 7 }, () => JOIN_ALPHABET[randomInt(JOIN_ALPHABET.length)]).join("");
}

export const createClassSchema = z.object({
  name: z.string().trim().min(2, "Give the class a name.").max(80),
  courseId: z.string().min(1, "Choose a course."),
  organizationId: z.string().uuid().optional(),
});

export async function createClass(user: StaffUser, input: z.infer<typeof createClassSchema>): Promise<ClassRow> {
  if (!["teacher", "school_admin", "platform_admin"].includes(user.role)) throw new DomainError("forbidden", "Only teachers can create classes.");
  const db = await getDb();
  const orgs = await staffOrganizations(db, user.id);
  const org = input.organizationId ? orgs.find((o) => o.id === input.organizationId) : orgs[0];
  if (!org) throw new DomainError("forbidden", "You need to belong to a school or organisation to create a class.");
  const [course] = await db.select().from(t.courses).where(eq(t.courses.id, input.courseId));
  if (!course) throw new DomainError("invalid", "Choose a course.");
  if (course.availability !== "active") throw new DomainError("invalid", `${course.name} isn't offered yet.`);
  const [version] = await db.select().from(t.courseVersions).where(and(eq(t.courseVersions.courseId, course.id), eq(t.courseVersions.isCurrent, true)));
  if (!version) throw new DomainError("invalid", "That course has no curriculum version.");

  for (let attempt = 0; attempt < 5; attempt++) {
    const [row] = await db
      .insert(t.classes)
      .values({ organizationId: org.id, teacherId: user.id, courseId: course.id, courseVersionId: version.id, name: input.name, joinCode: generateJoinCode() })
      .onConflictDoNothing({ target: t.classes.joinCode })
      .returning();
    if (!row) continue;
    await db.insert(t.gradingPolicies).values({ classId: row.id, version: 1, config: DEFAULT_GRADING_POLICY, isActive: true, createdBy: user.id });
    await db.insert(t.auditLogs).values({ actorId: user.id, action: "class.created", entityType: "class", entityId: row.id, organizationId: org.id, metadata: { courseId: course.id } });
    return row;
  }
  throw new DomainError("conflict", "Couldn't generate a join code. Please try again.");
}

export async function joinClassByCode(student: StaffUser, rawCode: string): Promise<{ classId: string; className: string; courseId: string; alreadyMember: boolean }> {
  if (student.role !== "student") throw new DomainError("forbidden", "Only student accounts can join a class.");
  const limit = await rateLimit(`join:${student.id}`, 10, 10 * 60_000);
  if (!limit.allowed) throw new DomainError("rate_limited", "Too many attempts. Please wait a few minutes and try again.");
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length < 5) throw new DomainError("invalid", "Enter the join code your teacher gave you.");
  const db = await getDb();
  const [cls] = await db.select().from(t.classes).where(and(eq(t.classes.joinCode, code), sql`${t.classes.archivedAt} is null`));
  if (!cls) throw new DomainError("not_found", "No class matches that code. Check it with your teacher.");
  const [existing] = await db.select().from(t.classEnrollments).where(and(eq(t.classEnrollments.classId, cls.id), eq(t.classEnrollments.studentId, student.id)));
  if (existing?.status === "active") return { classId: cls.id, className: cls.name, courseId: cls.courseId, alreadyMember: true };
  await db
    .insert(t.classEnrollments)
    .values({ classId: cls.id, studentId: student.id, status: "active" })
    .onConflictDoUpdate({ target: [t.classEnrollments.classId, t.classEnrollments.studentId], set: { status: "active", joinedAt: new Date() } });
  await db.insert(t.courseEnrollments).values({ userId: student.id, courseId: cls.courseId }).onConflictDoNothing();
  await db.insert(t.auditLogs).values({ actorId: student.id, action: "class.joined", entityType: "class", entityId: cls.id, organizationId: cls.organizationId, metadata: {} });
  return { classId: cls.id, className: cls.name, courseId: cls.courseId, alreadyMember: false };
}

export async function removeStudent(user: StaffUser, classId: string, studentId: string) {
  const db = await getDb();
  const cls = await assertClassStaff(db, user, classId);
  await db.update(t.classEnrollments).set({ status: "removed" }).where(and(eq(t.classEnrollments.classId, classId), eq(t.classEnrollments.studentId, studentId)));
  await db.insert(t.auditLogs).values({ actorId: user.id, action: "class.student_removed", entityType: "class", entityId: classId, organizationId: cls.organizationId, metadata: { studentId } });
}

export async function setClassAiPolicy(user: StaffUser, classId: string, aiPolicy: t.AiPolicy) {
  const db = await getDb();
  const cls = await assertClassStaff(db, user, classId);
  await db.update(t.classes).set({ aiPolicy }).where(eq(t.classes.id, classId));
  await db.insert(t.auditLogs).values({ actorId: user.id, action: "class.ai_policy_changed", entityType: "class", entityId: classId, organizationId: cls.organizationId, metadata: { from: cls.aiPolicy, to: aiPolicy } });
}

// ──────────────────────────────── assignments ───────────────────────────────

const optionalDate = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined || v === null || v === "") return null;
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date." });
      return z.NEVER;
    }
    return d;
  });

export const createAssignmentSchema = z
  .object({
    classId: z.string().uuid(),
    title: z.string().trim().min(2, "Give the assignment a title.").max(120),
    instructions: z.string().trim().max(2000).default(""),
    kind: z.enum(["lesson", "skill_practice", "assessment"]),
    lessonId: z.string().optional().nullable(),
    assessmentId: z.string().optional().nullable(),
    skillIds: z.array(z.string()).max(12).default([]),
    questionCount: z.coerce.number().int().min(3).max(20).default(6),
    dueAt: optionalDate,
    availableFrom: optionalDate,
    maxAttempts: z.union([z.coerce.number().int().min(1).max(10), z.null()]).optional().default(null),
    gradingMethod: z.enum(["score", "mastery", "completion"]).default("score"),
    points: z.coerce.number().int().min(1).max(1000).default(100),
    aiPolicy: z.enum(["allowed", "hints_only", "disabled"]).default("hints_only"),
    feedback: z.enum(["immediate", "after_submit"]).default("after_submit"),
    /** Empty = whole class. */
    studentIds: z.array(z.string().uuid()).max(500).default([]),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "lesson" && !v.lessonId) ctx.addIssue({ code: "custom", path: ["lessonId"], message: "Choose a lesson." });
    if (v.kind === "assessment" && !v.assessmentId) ctx.addIssue({ code: "custom", path: ["assessmentId"], message: "Choose a quiz or test." });
    if (v.kind === "skill_practice" && v.skillIds.length === 0) ctx.addIssue({ code: "custom", path: ["skillIds"], message: "Choose at least one skill." });
    if (v.dueAt && v.availableFrom && v.availableFrom > v.dueAt) ctx.addIssue({ code: "custom", path: ["availableFrom"], message: "Opens-on must be before the due date." });
  });
export type CreateAssignmentInput = z.input<typeof createAssignmentSchema>;

export async function createAssignment(user: StaffUser, raw: CreateAssignmentInput): Promise<typeof t.assignments.$inferSelect> {
  const input = createAssignmentSchema.parse(raw);
  const db = await getDb();
  const cls = await assertClassStaff(db, user, input.classId);

  let skillIds = input.skillIds;
  let gradingMethod = input.gradingMethod;
  if (input.kind === "lesson") {
    const [lesson] = await db.select().from(t.lessons).where(eq(t.lessons.id, input.lessonId as string));
    if (!lesson || lesson.courseId !== cls.courseId) throw new DomainError("invalid", "That lesson isn't part of this class's course.");
    skillIds = (await db.select().from(t.lessonSkills).where(eq(t.lessonSkills.lessonId, lesson.id))).map((r) => r.skillId);
    if (gradingMethod === "score") gradingMethod = "completion";
  } else if (input.kind === "assessment") {
    const [assessment] = await db.select().from(t.assessments).where(eq(t.assessments.id, input.assessmentId as string));
    if (!assessment || assessment.courseId !== cls.courseId) throw new DomainError("invalid", "That assessment isn't part of this class's course.");
    const items = await db
      .select({ skillId: t.questions.primarySkillId })
      .from(t.assessmentItems)
      .innerJoin(t.questions, eq(t.questions.id, t.assessmentItems.questionId))
      .where(eq(t.assessmentItems.assessmentId, assessment.id));
    skillIds = [...new Set(items.map((i) => i.skillId))];
  } else {
    const skills = await db.select({ id: t.skills.id, courseId: t.skills.courseId }).from(t.skills).where(inArray(t.skills.id, skillIds));
    if (skills.length !== skillIds.length || skills.some((s) => s.courseId !== cls.courseId)) throw new DomainError("invalid", "One of those skills isn't part of this class's course.");
  }

  if (input.studentIds.length) {
    const roster = await db
      .select({ id: t.classEnrollments.studentId })
      .from(t.classEnrollments)
      .where(and(eq(t.classEnrollments.classId, cls.id), eq(t.classEnrollments.status, "active"), inArray(t.classEnrollments.studentId, input.studentIds)));
    if (roster.length !== new Set(input.studentIds).size) throw new DomainError("invalid", "One of the selected students isn't in this class.");
  }

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(t.assignments)
      .values({
        classId: cls.id,
        createdBy: user.id,
        title: input.title,
        instructions: input.instructions,
        kind: input.kind,
        lessonId: input.kind === "lesson" ? input.lessonId : null,
        assessmentId: input.kind === "assessment" ? input.assessmentId : null,
        skillIds,
        questionCount: input.questionCount,
        availableFrom: input.availableFrom,
        dueAt: input.dueAt,
        maxAttempts: input.maxAttempts,
        gradingMethod,
        points: input.points,
        aiPolicy: input.aiPolicy,
        feedback: input.kind === "skill_practice" ? "immediate" : input.feedback,
      })
      .returning();
    if (input.studentIds.length) await tx.insert(t.assignmentTargets).values([...new Set(input.studentIds)].map((studentId) => ({ assignmentId: row.id, studentId })));
    await tx.insert(t.auditLogs).values({ actorId: user.id, action: "assignment.created", entityType: "assignment", entityId: row.id, organizationId: cls.organizationId, metadata: { kind: row.kind, targeted: input.studentIds.length } });
    return row;
  });
}

export async function archiveAssignment(user: StaffUser, assignmentId: string) {
  const db = await getDb();
  const [a] = await db.select().from(t.assignments).where(eq(t.assignments.id, assignmentId));
  if (!a) throw new DomainError("not_found", "Assignment not found.");
  const cls = await assertClassStaff(db, user, a.classId);
  await db.update(t.assignments).set({ archivedAt: new Date() }).where(eq(t.assignments.id, assignmentId));
  await db.insert(t.auditLogs).values({ actorId: user.id, action: "assignment.archived", entityType: "assignment", entityId: assignmentId, organizationId: cls.organizationId, metadata: {} });
}

export const overrideSchema = z.object({
  assignmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  dueAt: optionalDate,
  maxAttempts: z.union([z.coerce.number().int().min(1).max(20), z.null()]).optional().default(null),
  timeMultiplier: z.union([z.coerce.number().min(1).max(3), z.null()]).optional().default(null),
  note: z.string().trim().max(300).default(""),
});

/** Per-student accommodation (extended time, later due date, extra attempts). */
export async function setAccommodation(user: StaffUser, raw: z.input<typeof overrideSchema>) {
  const input = overrideSchema.parse(raw);
  const db = await getDb();
  const [a] = await db.select().from(t.assignments).where(eq(t.assignments.id, input.assignmentId));
  if (!a) throw new DomainError("not_found", "Assignment not found.");
  const cls = await assertClassStaff(db, user, a.classId);
  const values = { assignmentId: input.assignmentId, studentId: input.studentId, dueAt: input.dueAt, maxAttempts: input.maxAttempts, timeMultiplier: input.timeMultiplier, note: input.note };
  await db.insert(t.assignmentOverrides).values(values).onConflictDoUpdate({ target: [t.assignmentOverrides.assignmentId, t.assignmentOverrides.studentId], set: values });
  await db.insert(t.auditLogs).values({ actorId: user.id, action: "assignment.accommodation_set", entityType: "assignment", entityId: a.id, organizationId: cls.organizationId, metadata: { studentId: input.studentId } });
}
