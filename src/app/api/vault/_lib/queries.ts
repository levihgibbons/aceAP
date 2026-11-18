/**
 * Small read helpers shared by the vault pages and /api/vault/* handlers.
 * (Private folder: `_lib` is never routed.)
 *
 *  - Student-private rows (enrolments, mastery, notes) are read through
 *    `asUser`, so row-level security scopes them to the signed-in user.
 *  - Shared curriculum (skills, courses) is read with `getDb`.
 */
import "server-only";
import { and, asc, eq, ilike, inArray, sql } from "drizzle-orm";
import { asUser, getDb, type Actor } from "@/db/client";
import * as t from "@/db/schema";
import type { MasteryLevel } from "@/modules/mastery/types";
import { normaliseTitle } from "@/modules/vault/links";
import { vaultHref } from "@/modules/vault/service";

export interface ActiveClass {
  classId: string;
  className: string;
  courseId: string;
  courseName: string;
  teacherName: string | null;
}

/** The student's active, non-archived classes (for the share dialog). */
export async function getActiveClasses(actor: Actor): Promise<ActiveClass[]> {
  const rows = await asUser(actor, (tx) =>
    tx
      .select({
        classId: t.classes.id,
        className: t.classes.name,
        courseId: t.classes.courseId,
        teacherName: t.users.name,
      })
      .from(t.classEnrollments)
      .innerJoin(t.classes, eq(t.classes.id, t.classEnrollments.classId))
      .leftJoin(t.users, eq(t.users.id, t.classes.teacherId))
      .where(
        and(
          eq(t.classEnrollments.studentId, actor.id),
          eq(t.classEnrollments.status, "active"),
          sql`${t.classes.archivedAt} is null`,
        ),
      )
      .orderBy(asc(t.classes.name)),
  );
  if (rows.length === 0) return [];
  const db = await getDb();
  const courses = await db
    .select({ id: t.courses.id, name: t.courses.name })
    .from(t.courses)
    .where(inArray(t.courses.id, [...new Set(rows.map((r) => r.courseId))]));
  return rows.map((r) => ({
    ...r,
    courseName: courses.find((c) => c.id === r.courseId)?.name ?? r.courseId,
  }));
}

export interface SkillLevel {
  skillId: string;
  name: string;
  courseId: string;
  courseName: string;
  level: MasteryLevel;
  needsReview: boolean;
  href: string;
}

/** The actor's own mastery level for each skill (not_started when there is no record). */
export async function getSkillLevels(actor: Actor, skillIds: string[]): Promise<SkillLevel[]> {
  const ids = [...new Set(skillIds)];
  if (ids.length === 0) return [];
  const db = await getDb();
  const skills = await db
    .select({
      id: t.skills.id,
      name: t.skills.name,
      courseId: t.skills.courseId,
      courseName: t.courses.name,
    })
    .from(t.skills)
    .innerJoin(t.courses, eq(t.courses.id, t.skills.courseId))
    .where(inArray(t.skills.id, ids));
  const states = await asUser(actor, (tx) =>
    tx
      .select({
        skillId: t.masteryStates.skillId,
        level: t.masteryStates.level,
        needsReview: t.masteryStates.needsReview,
      })
      .from(t.masteryStates)
      .where(and(eq(t.masteryStates.userId, actor.id), inArray(t.masteryStates.skillId, ids))),
  );
  return ids
    .map((id) => {
      const s = skills.find((x) => x.id === id);
      if (!s) return null;
      const st = states.find((x) => x.skillId === id);
      return {
        skillId: id,
        name: s.name,
        courseId: s.courseId,
        courseName: s.courseName,
        level: st?.level ?? "not_started",
        needsReview: st?.needsReview ?? false,
        href: vaultHref.concept(id),
      };
    })
    .filter((x): x is SkillLevel => x !== null);
}

export interface SkillTarget {
  id: string;
  name: string;
  courseId: string;
  courseName: string;
  href: string;
}

const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** Curriculum skills for wiki-link autocomplete. Prefers the student's own courses when `q` is empty. */
export async function searchSkills(actor: Actor, q: string, limit = 8): Promise<SkillTarget[]> {
  const db = await getDb();
  const base = db
    .select({
      id: t.skills.id,
      name: t.skills.name,
      courseId: t.skills.courseId,
      courseName: t.courses.name,
    })
    .from(t.skills)
    .innerJoin(t.courses, eq(t.courses.id, t.skills.courseId));
  let rows;
  if (q) {
    // Name prefix matches first, then anywhere in the name.
    rows = await base
      .where(ilike(t.skills.name, likePattern(q)))
      .orderBy(
        sql`case when lower(${t.skills.name}) like ${`${q.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%`} then 0 else 1 end`,
        asc(t.skills.name),
      )
      .limit(limit);
  } else {
    const enrolled = await asUser(actor, async (tx) => {
      const viaClass = await tx
        .select({ courseId: t.classes.courseId })
        .from(t.classEnrollments)
        .innerJoin(t.classes, eq(t.classes.id, t.classEnrollments.classId))
        .where(
          and(eq(t.classEnrollments.studentId, actor.id), eq(t.classEnrollments.status, "active")),
        );
      const independent = await tx
        .select({ courseId: t.courseEnrollments.courseId })
        .from(t.courseEnrollments)
        .where(eq(t.courseEnrollments.userId, actor.id));
      return [...new Set([...viaClass, ...independent].map((r) => r.courseId))];
    });
    if (enrolled.length === 0) return [];
    rows = await base
      .where(inArray(t.skills.courseId, enrolled))
      .orderBy(asc(t.skills.courseId), asc(t.skills.ordinal))
      .limit(limit);
  }
  return rows.map((r) => ({ ...r, href: vaultHref.concept(r.id) }));
}

export interface ResolvedTarget {
  /** normaliseTitle() of the wiki-link target. */
  key: string;
  type: "note" | "skill" | "unresolved";
  id: string;
  title: string;
  href: string | null;
}

/**
 * Resolve wiki-link targets exactly as the vault service does: the owner's
 * note by title first, then a curriculum skill by name, else unresolved.
 */
export async function resolveTitles(actor: Actor, titles: string[]): Promise<ResolvedTarget[]> {
  const keys = [...new Set(titles.map(normaliseTitle).filter(Boolean))].slice(0, 50);
  if (keys.length === 0) return [];
  const notes = await asUser(actor, (tx) =>
    tx
      .select({ id: t.vaultNotes.id, title: t.vaultNotes.title })
      .from(t.vaultNotes)
      .where(
        and(eq(t.vaultNotes.userId, actor.id), inArray(sql`lower(${t.vaultNotes.title})`, keys)),
      ),
  );
  const db = await getDb();
  const skills = await db
    .select({ id: t.skills.id, name: t.skills.name })
    .from(t.skills)
    .where(inArray(sql`lower(${t.skills.name})`, keys))
    .orderBy(asc(t.skills.id));
  return keys.map((key) => {
    const note = notes.find((n) => normaliseTitle(n.title) === key);
    if (note)
      return {
        key,
        type: "note" as const,
        id: note.id,
        title: note.title,
        href: vaultHref.note(note.id),
      };
    const skill = skills.find((s) => normaliseTitle(s.name) === key);
    if (skill)
      return {
        key,
        type: "skill" as const,
        id: skill.id,
        title: skill.name,
        href: vaultHref.concept(skill.id),
      };
    return { key, type: "unresolved" as const, id: key, title: key, href: null };
  });
}

/** Class name + course for the teacher's shared-notes page header. Authorisation happens in the vault service. */
export async function getClassHeader(
  classId: string,
): Promise<{ name: string; courseName: string } | null> {
  const db = await getDb();
  const [row] = await db
    .select({ name: t.classes.name, courseName: t.courses.name })
    .from(t.classes)
    .innerJoin(t.courses, eq(t.courses.id, t.classes.courseId))
    .where(eq(t.classes.id, classId));
  return row ?? null;
}
