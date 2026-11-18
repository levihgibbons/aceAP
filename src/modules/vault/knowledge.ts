/**
 * "My knowledge" — the part of the vault that builds itself from the student's
 * own progress. Nothing here is typed by the student: it is assembled, on
 * every read, from
 *
 *  - the lessons they have opened (only the blocks they have actually reached,
 *    so the vault grows as they move through a lesson): key ideas (summary
 *    blocks), definitions and formulas;
 *  - their mastery record for the skills each topic teaches;
 *  - misconceptions their answers have shown, and the ones they have since fixed;
 *  - their own notes that link to those skills.
 *
 * Student-private rows are read under row-level security (`asUser`), so this
 * can only ever return the caller's own progress. Shared curriculum (course
 * tree, lesson text) comes from the published content.
 */
import { and, eq, inArray, or } from "drizzle-orm";
import { asUser, getDb, type Actor } from "@/db/client";
import * as t from "@/db/schema";
import type { LessonBlock } from "@/modules/content/schema";
import { unitLessons } from "@/modules/curriculum/path";
import { getCourseTree } from "@/modules/curriculum/queries";
import { getEnrolledCourses } from "@/modules/learning/overview";
import { LEVEL_LABEL, LEVEL_RANK, type MasteryLevel } from "@/modules/mastery/types";
import { vaultHref } from "./service";

/** Skills at or above this level count as "secure" in the summary. */
const SECURE_FROM: MasteryLevel = "proficient";

export interface KnowledgeSkill {
  id: string;
  name: string;
  level: MasteryLevel;
  levelLabel: string;
  needsReview: boolean;
  href: string;
}

export interface KnowledgeTopic {
  id: string;
  title: string;
  unitNumber: number;
  lessons: { id: string; title: string; number: string; status: "in_progress" | "completed"; href: string }[];
  keyIdeas: { text: string; lessonId: string }[];
  definitions: { term: string; md: string; lessonId: string }[];
  formulas: { latex: string; caption: string | null; lessonId: string }[];
  skills: KnowledgeSkill[];
  /** Misconceptions seen in the student's answers that are not resolved yet. */
  watchOut: { id: string; title: string; remediation: string; skillId: string }[];
  /** Misconceptions the student has since corrected. */
  fixed: { id: string; title: string; skillId: string }[];
  notes: { id: string; title: string; href: string }[];
  lastActivityAt: Date | null;
}

export interface KnowledgeUnit {
  id: string;
  number: number;
  title: string;
  topics: KnowledgeTopic[];
  /** Topics in this unit the student has not reached yet. */
  lockedTopics: number;
}

export interface KnowledgeCourse {
  courseId: string;
  name: string;
  units: KnowledgeUnit[];
  /** Available units with nothing unlocked yet. */
  upcomingUnits: { id: string; number: number; title: string; href: string }[];
  totals: KnowledgeTotals;
}

export interface KnowledgeTotals {
  topics: number;
  keyIdeas: number;
  definitions: number;
  formulas: number;
  skillsStarted: number;
  skillsSecure: number;
  fixedMisconceptions: number;
  watchOut: number;
}

export interface KnowledgeBase {
  courses: KnowledgeCourse[];
  totals: KnowledgeTotals;
  /** Most recent progress that changed the vault, newest first. */
  recent: { at: Date; kind: "lesson_completed" | "lesson_started" | "skill" | "fixed"; label: string; detail: string; href: string }[];
}

const zeroTotals = (): KnowledgeTotals => ({ topics: 0, keyIdeas: 0, definitions: 0, formulas: 0, skillsStarted: 0, skillsSecure: 0, fixedMisconceptions: 0, watchOut: 0 });
const addTotals = (a: KnowledgeTotals, b: KnowledgeTotals): KnowledgeTotals => {
  const out = { ...a };
  for (const k of Object.keys(out) as (keyof KnowledgeTotals)[]) out[k] += b[k];
  return out;
};
const latest = (dates: (Date | null | undefined)[]) => dates.reduce<Date | null>((m, d) => (d && (!m || d > m) ? d : m), null);

/** The student's self-building knowledge base, for every course they are in (or one). */
export async function getKnowledgeBase(actor: Actor, options: { courseId?: string } = {}): Promise<KnowledgeBase> {
  const enrolled = await getEnrolledCourses(actor, actor.id);
  const own = await asUser(actor, async (tx) => {
    const progress = await tx.select().from(t.lessonProgress).where(eq(t.lessonProgress.userId, actor.id));
    const mastery = await tx
      .select({ skillId: t.masteryStates.skillId, courseId: t.masteryStates.courseId, level: t.masteryStates.level, needsReview: t.masteryStates.needsReview, lastEvidenceAt: t.masteryStates.lastEvidenceAt })
      .from(t.masteryStates)
      .where(eq(t.masteryStates.userId, actor.id));
    const detected = await tx
      .select({ id: t.detectedMisconceptions.id, skillId: t.detectedMisconceptions.skillId, misconceptionId: t.detectedMisconceptions.misconceptionId, status: t.detectedMisconceptions.status, lastObservedAt: t.detectedMisconceptions.lastObservedAt, history: t.detectedMisconceptions.history })
      .from(t.detectedMisconceptions)
      .where(eq(t.detectedMisconceptions.userId, actor.id));
    const links = await tx
      .select({ noteId: t.vaultLinks.noteId, skillId: t.vaultLinks.targetId, title: t.vaultNotes.title })
      .from(t.vaultLinks)
      .innerJoin(t.vaultNotes, eq(t.vaultNotes.id, t.vaultLinks.noteId))
      .where(and(eq(t.vaultLinks.userId, actor.id), eq(t.vaultLinks.targetType, "skill")));
    return { progress, mastery, detected, links };
  });

  // Courses: enrolled ones first (most recent activity first), then any course the student has progress in.
  const courseIds = [...new Set([...enrolled.map((c) => c.courseId), ...own.progress.map((p) => p.courseId), ...own.mastery.map((m) => m.courseId)])].filter(
    (id) => !options.courseId || id === options.courseId,
  );

  // Lesson text for exactly the versions the student saw.
  const db = await getDb();
  const versionKeys = own.progress.map((p) => ({ lessonId: p.lessonId, version: p.lessonVersion }));
  const versions = versionKeys.length
    ? await db
        .select({ lessonId: t.lessonVersions.lessonId, version: t.lessonVersions.version, blocks: t.lessonVersions.blocks })
        .from(t.lessonVersions)
        .where(or(...versionKeys.map((k) => and(eq(t.lessonVersions.lessonId, k.lessonId), eq(t.lessonVersions.version, k.version)))))
    : [];
  const blocksFor = new Map(versions.map((v) => [`${v.lessonId}@${v.version}`, v.blocks as LessonBlock[]]));
  const progressBy = new Map(own.progress.map((p) => [p.lessonId, p]));
  const masteryBy = new Map(own.mastery.map((m) => [m.skillId, m]));
  const catalogIds = [...new Set(own.detected.map((d) => d.misconceptionId))];
  const catalog = catalogIds.length ? await db.select().from(t.misconceptions).where(inArray(t.misconceptions.id, catalogIds)) : [];
  const misconceptionBy = new Map(catalog.map((m) => [m.id, m]));

  const recent: KnowledgeBase["recent"] = [];
  const courses: KnowledgeCourse[] = [];

  for (const courseId of courseIds) {
    const tree = await getCourseTree(courseId);
    if (!tree) continue;
    const units: KnowledgeUnit[] = [];
    const upcomingUnits: KnowledgeCourse["upcomingUnits"] = [];
    let totals = zeroTotals();

    for (const unit of tree.units) {
      if (unit.status !== "available") continue;
      const lessons = unitLessons(tree, unit.id);
      const numberOf = new Map(lessons.map((l, i) => [l.id, `${unit.number}.${i + 1}`]));
      const topics: KnowledgeTopic[] = [];
      let locked = 0;

      for (const topic of unit.topics) {
        const topicLessons = lessons.filter((l) => l.topicId === topic.id);
        const skillIds = [...new Set([...topic.skillIds, ...topicLessons.flatMap((l) => l.skillIds)])];
        const opened = topicLessons.filter((l) => progressBy.has(l.id));
        const skillStates = skillIds.filter((id) => masteryBy.has(id));
        if (opened.length === 0 && skillStates.length === 0) {
          locked += 1;
          continue;
        }

        const entry: KnowledgeTopic = {
          id: topic.id,
          title: topic.title,
          unitNumber: unit.number,
          lessons: [],
          keyIdeas: [],
          definitions: [],
          formulas: [],
          skills: [],
          watchOut: [],
          fixed: [],
          notes: [],
          lastActivityAt: null,
        };
        const seen = new Set<string>();
        for (const l of opened) {
          const p = progressBy.get(l.id)!;
          const completed = p.status === "completed";
          entry.lessons.push({ id: l.id, title: l.title, number: numberOf.get(l.id) ?? "", status: completed ? "completed" : "in_progress", href: vaultHref.lesson(l.id) });
          const blocks = blocksFor.get(`${l.id}@${p.lessonVersion}`) ?? [];
          const reached = completed ? blocks : blocks.slice(0, p.furthestBlock + 1);
          const first = (key: string) => !seen.has(key) && Boolean(seen.add(key));
          for (const b of reached) {
            if (b.type === "summary") {
              for (const point of b.points) if (first(`k:${point}`)) entry.keyIdeas.push({ text: point, lessonId: l.id });
            } else if (b.type === "definition") {
              if (first(`d:${b.term.toLowerCase()}`)) entry.definitions.push({ term: b.term, md: b.md, lessonId: l.id });
            } else if (b.type === "formula") {
              if (first(`f:${b.latex.replace(/\s+/g, "")}`)) entry.formulas.push({ latex: b.latex, caption: b.caption ?? null, lessonId: l.id });
            }
          }
          recent.push(
            completed
              ? { at: p.completedAt ?? p.updatedAt, kind: "lesson_completed", label: l.title, detail: `Finished lesson ${numberOf.get(l.id) ?? ""}`.trim(), href: vaultHref.lesson(l.id) }
              : { at: p.updatedAt, kind: "lesson_started", label: l.title, detail: `Reading lesson ${numberOf.get(l.id) ?? ""}`.trim(), href: vaultHref.lesson(l.id) },
          );
        }

        for (const id of skillIds) {
          const s = tree.skills.get(id);
          if (!s) continue;
          const m = masteryBy.get(id);
          const level: MasteryLevel = m?.level ?? "not_started";
          entry.skills.push({ id, name: s.name, level, levelLabel: LEVEL_LABEL[level], needsReview: m?.needsReview ?? false, href: vaultHref.concept(id) });
          if (m?.lastEvidenceAt) recent.push({ at: m.lastEvidenceAt, kind: "skill", label: s.name, detail: `Now ${LEVEL_LABEL[level].toLowerCase()}`, href: vaultHref.concept(id) });
        }

        const skillSet = new Set(skillIds);
        for (const d of own.detected.filter((x) => skillSet.has(x.skillId))) {
          const m = misconceptionBy.get(d.misconceptionId);
          if (!m) continue;
          if (d.status === "resolved") {
            entry.fixed.push({ id: m.id, title: m.title, skillId: d.skillId });
            const at = latest(d.history.filter((h) => h.status === "resolved").map((h) => new Date(h.at))) ?? d.lastObservedAt;
            recent.push({ at, kind: "fixed", label: m.title, detail: "Misconception fixed", href: vaultHref.concept(d.skillId) });
          } else entry.watchOut.push({ id: m.id, title: m.title, remediation: m.remediation, skillId: d.skillId });
        }

        const noteIds = new Set<string>();
        for (const n of own.links.filter((x) => skillSet.has(x.skillId))) {
          if (noteIds.has(n.noteId)) continue;
          noteIds.add(n.noteId);
          entry.notes.push({ id: n.noteId, title: n.title, href: vaultHref.note(n.noteId) });
        }

        entry.lastActivityAt = latest([
          ...opened.map((l) => progressBy.get(l.id)!.updatedAt),
          ...skillStates.map((id) => masteryBy.get(id)!.lastEvidenceAt),
        ]);

        const started = entry.skills.filter((s) => s.level !== "not_started");
        totals = addTotals(totals, {
          topics: 1,
          keyIdeas: entry.keyIdeas.length,
          definitions: entry.definitions.length,
          formulas: entry.formulas.length,
          skillsStarted: started.length,
          skillsSecure: started.filter((s) => LEVEL_RANK[s.level] >= LEVEL_RANK[SECURE_FROM]).length,
          fixedMisconceptions: entry.fixed.length,
          watchOut: entry.watchOut.length,
        });
        topics.push(entry);
      }

      if (topics.length) units.push({ id: unit.id, number: unit.number, title: unit.title, topics, lockedTopics: locked });
      else upcomingUnits.push({ id: unit.id, number: unit.number, title: unit.title, href: `/app/courses/${encodeURIComponent(courseId)}/units/${encodeURIComponent(unit.slug)}` });
    }

    courses.push({ courseId, name: tree.course.name, units, upcomingUnits, totals });
  }

  // Courses with something in them first, keeping enrolment order otherwise.
  courses.sort((a, b) => Number(b.totals.topics > 0) - Number(a.totals.topics > 0));
  recent.sort((a, b) => b.at.getTime() - a.at.getTime());
  const once = new Set<string>(); // a skill taught in two topics is one event
  const unique = recent.filter((r) => !once.has(`${r.kind}:${r.href}:${r.label}`) && once.add(`${r.kind}:${r.href}:${r.label}`));
  return { courses, totals: courses.reduce((acc, c) => addTotals(acc, c.totals), zeroTotals()), recent: unique.slice(0, 8) };
}
