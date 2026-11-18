/**
 * Read models for shared curriculum. Curriculum is identical for every user
 * and changes only on content sync, so course trees are cached in-process.
 */
import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  difficulty: number;
  keywords: string[];
  patternLabels: Record<string, string>;
  prerequisites: string[];
  objectiveIds: string[];
  lessonIds: string[];
  questionCount: number;
}

export interface ObjectiveNode {
  id: string;
  code: string;
  description: string;
  topicId: string;
  unitId: string;
  skillIds: string[];
}

export interface LessonNode {
  id: string;
  title: string;
  summary: string;
  estMinutes: number;
  topicId: string;
  unitId: string;
  skillIds: string[];
  publishedVersion: number | null;
}

export interface TopicNode {
  id: string;
  title: string;
  description: string;
  objectives: ObjectiveNode[];
  lessons: LessonNode[];
  skillIds: string[];
}

export interface AssessmentNode {
  id: string;
  kind: string;
  title: string;
  description: string;
  unitId: string | null;
  topicId: string | null;
  questionCount: number;
  timeLimitSeconds: number | null;
  skillIds: string[];
}

export interface UnitNode {
  id: string;
  number: number;
  slug: string;
  title: string;
  description: string;
  status: "outline" | "available";
  topics: TopicNode[];
  skillIds: string[];
  assessments: AssessmentNode[];
}

export interface CourseTree {
  course: typeof t.courses.$inferSelect;
  version: typeof t.courseVersions.$inferSelect;
  units: UnitNode[];
  skills: Map<string, SkillNode>;
  /** All skills, in authored order. */
  skillIds: string[];
  objectives: Map<string, ObjectiveNode>;
  lessons: Map<string, LessonNode>;
  /** Lessons in course order — the guided path. */
  lessonOrder: string[];
  assessments: AssessmentNode[];
  misconceptions: Map<string, typeof t.misconceptions.$inferSelect>;
}

const cache = (globalThis as unknown as { __aceapCourseTrees?: Map<string, Promise<CourseTree | null>> }).__aceapCourseTrees ??= new Map();

export function invalidateCurriculumCache() {
  cache.clear();
  catalogCache = null;
}

async function loadCourseTree(courseId: string): Promise<CourseTree | null> {
  const db = await getDb();
  const [course] = await db.select().from(t.courses).where(eq(t.courses.id, courseId));
  if (!course) return null;
  const versions = await db.select().from(t.courseVersions).where(eq(t.courseVersions.courseId, courseId));
  const version = versions.find((v) => v.isCurrent) ?? versions[0];
  if (!version) return null;

  const [unitRows, topicRows, objectiveRows, skillRows, lessonRows, assessmentRows, misconceptionRows] = await Promise.all([
    db.select().from(t.units).where(eq(t.units.courseVersionId, version.id)).orderBy(asc(t.units.number), asc(t.units.id)),
    db.select().from(t.topics).where(eq(t.topics.courseId, courseId)).orderBy(asc(t.topics.ordinal)),
    db.select().from(t.learningObjectives).where(eq(t.learningObjectives.courseId, courseId)).orderBy(asc(t.learningObjectives.ordinal)),
    db.select().from(t.skills).where(eq(t.skills.courseId, courseId)).orderBy(asc(t.skills.ordinal)),
    db.select().from(t.lessons).where(eq(t.lessons.courseId, courseId)).orderBy(asc(t.lessons.ordinal)),
    db.select().from(t.assessments).where(eq(t.assessments.courseId, courseId)),
    db.select({ m: t.misconceptions }).from(t.misconceptions).innerJoin(t.skills, eq(t.skills.id, t.misconceptions.skillId)).where(eq(t.skills.courseId, courseId)),
  ]);

  const skillIds = skillRows.map((s) => s.id);
  const objectiveIds = objectiveRows.map((o) => o.id);
  const lessonIds = lessonRows.map((l) => l.id);
  const assessmentIds = assessmentRows.filter((a) => !a.createdBy).map((a) => a.id);
  const none = Promise.resolve([] as never[]);

  const [osRows, prereqRows, lsRows, qRows, itemRows] = await Promise.all([
    objectiveIds.length ? db.select().from(t.objectiveSkills).where(inArray(t.objectiveSkills.objectiveId, objectiveIds)) : none,
    skillIds.length ? db.select().from(t.skillPrerequisites).where(inArray(t.skillPrerequisites.skillId, skillIds)) : none,
    lessonIds.length ? db.select().from(t.lessonSkills).where(inArray(t.lessonSkills.lessonId, lessonIds)) : none,
    db.select({ id: t.questions.id, primarySkillId: t.questions.primarySkillId }).from(t.questions).where(eq(t.questions.courseId, courseId)),
    assessmentIds.length ? db.select().from(t.assessmentItems).where(inArray(t.assessmentItems.assessmentId, assessmentIds)) : none,
  ]);

  const questionSkill = new Map(qRows.map((q) => [q.id, q.primarySkillId]));
  const skills = new Map<string, SkillNode>(
    skillRows.map((s) => [
      s.id,
      { id: s.id, name: s.name, description: s.description, difficulty: s.difficulty, keywords: s.keywords, patternLabels: s.patternLabels, prerequisites: [], objectiveIds: [], lessonIds: [], questionCount: 0 },
    ]),
  );
  for (const p of prereqRows) skills.get(p.skillId)?.prerequisites.push(p.prerequisiteSkillId);
  for (const q of qRows) {
    const s = skills.get(q.primarySkillId);
    if (s) s.questionCount += 1;
  }

  const topicUnit = new Map(topicRows.map((tp) => [tp.id, tp.unitId]));
  const objectives = new Map<string, ObjectiveNode>(
    objectiveRows.map((o) => [o.id, { id: o.id, code: o.code, description: o.description, topicId: o.topicId, unitId: topicUnit.get(o.topicId) ?? "", skillIds: [] }]),
  );
  for (const os of osRows) {
    objectives.get(os.objectiveId)?.skillIds.push(os.skillId);
    skills.get(os.skillId)?.objectiveIds.push(os.objectiveId);
  }
  // Keep each objective's skills in authored order.
  const skillOrder = new Map(skillIds.map((id, i) => [id, i]));
  for (const o of objectives.values()) o.skillIds.sort((a, b) => (skillOrder.get(a) ?? 0) - (skillOrder.get(b) ?? 0));

  const lessons = new Map<string, LessonNode>(
    lessonRows.map((l) => [l.id, { id: l.id, title: l.title, summary: l.summary, estMinutes: l.estMinutes, topicId: l.topicId, unitId: l.unitId, skillIds: [], publishedVersion: l.publishedVersion }]),
  );
  for (const ls of lsRows) {
    lessons.get(ls.lessonId)?.skillIds.push(ls.skillId);
    skills.get(ls.skillId)?.lessonIds.push(ls.lessonId);
  }

  const assessments: AssessmentNode[] = assessmentRows
    .filter((a) => !a.createdBy)
    .map((a) => {
      const items = itemRows.filter((i) => i.assessmentId === a.id);
      return {
        id: a.id,
        kind: a.kind,
        title: a.title,
        description: a.description,
        unitId: a.unitId,
        topicId: a.topicId,
        questionCount: items.length,
        timeLimitSeconds: a.config.timeLimitSeconds ?? null,
        skillIds: [...new Set(items.map((i) => questionSkill.get(i.questionId)).filter((x): x is string => Boolean(x)))],
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const uniq = (xs: string[]) => [...new Set(xs)];
  const lessonOrder: string[] = [];
  const units: UnitNode[] = unitRows.map((u) => {
    const topics: TopicNode[] = topicRows
      .filter((tp) => tp.unitId === u.id)
      .map((tp) => {
        const topicObjectives = [...objectives.values()].filter((o) => o.topicId === tp.id);
        const topicLessons = [...lessons.values()].filter((l) => l.topicId === tp.id);
        for (const l of topicLessons) lessonOrder.push(l.id);
        return { id: tp.id, title: tp.title, description: tp.description, objectives: topicObjectives, lessons: topicLessons, skillIds: uniq(topicObjectives.flatMap((o) => o.skillIds)) };
      });
    return {
      id: u.id,
      number: u.number,
      slug: u.slug,
      title: u.title,
      description: u.description,
      status: u.status,
      topics,
      skillIds: uniq(topics.flatMap((tp) => tp.skillIds)),
      assessments: assessments.filter((a) => a.unitId === u.id),
    };
  });

  return {
    course,
    version,
    units,
    skills,
    skillIds,
    objectives,
    lessons,
    lessonOrder,
    assessments,
    misconceptions: new Map(misconceptionRows.map((r) => [r.m.id, r.m])),
  };
}

export function getCourseTree(courseId: string): Promise<CourseTree | null> {
  let p = cache.get(courseId);
  if (!p) {
    p = loadCourseTree(courseId);
    cache.set(courseId, p);
    p.catch(() => cache.delete(courseId));
  }
  return p;
}

export type CatalogRow = typeof t.courses.$inferSelect & { unitCount: number; lessonCount: number };
let catalogCache: Promise<CatalogRow[]> | null = null;

export function getCatalog(): Promise<CatalogRow[]> {
  catalogCache ??= (async () => {
    const db = await getDb();
    const [courseRows, unitRows, lessonRows] = await Promise.all([
      db.select().from(t.courses).orderBy(asc(t.courses.sortOrder)),
      db.select({ courseId: t.units.courseId }).from(t.units).innerJoin(t.courseVersions, eq(t.courseVersions.id, t.units.courseVersionId)).where(eq(t.courseVersions.isCurrent, true)),
      db.select({ courseId: t.lessons.courseId }).from(t.lessons),
    ]);
    const count = (rows: { courseId: string }[]) => rows.reduce((m, r) => m.set(r.courseId, (m.get(r.courseId) ?? 0) + 1), new Map<string, number>());
    const u = count(unitRows);
    const l = count(lessonRows);
    return courseRows.map((c) => ({ ...c, unitCount: u.get(c.id) ?? 0, lessonCount: l.get(c.id) ?? 0 }));
  })();
  catalogCache.catch(() => (catalogCache = null));
  return catalogCache;
}

/** Find the course a skill belongs to without loading every tree. */
export async function getSkillCourseId(skillId: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db.select({ courseId: t.skills.courseId }).from(t.skills).where(eq(t.skills.id, skillId));
  return row?.courseId ?? null;
}

export const CONTENT_STATUS_LABEL: Record<t.CourseContentStatus, { label: string; description: string }> = {
  catalog_only: { label: "Catalog only", description: "Listed for reference. AceAP has no outline or lessons for this course yet." },
  outline_available: { label: "Outline available", description: "Official unit outline is listed. Lessons have not been written yet." },
  lessons_in_development: { label: "Lessons in development", description: "Some lessons exist but the sequence is not ready for students." },
  pilot_available: { label: "Pilot course", description: "A complete, assessed learning sequence is available for part of this course." },
  complete: { label: "Complete course", description: "Every unit has lessons, practice and assessments." },
};
