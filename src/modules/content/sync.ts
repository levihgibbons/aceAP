/**
 * Content sync: authored files (content/) → database.
 *
 *  - Idempotent: running it twice changes nothing.
 *  - Versioned: a lesson or question whose content hash changed gets a NEW
 *    version row; earlier versions (which past attempts point at) are kept.
 *  - Gated: a course is only published if validation reports no errors.
 */
import { createHash } from "node:crypto";
import { and, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { Db } from "@/db/client";
import * as t from "@/db/schema";
import { CATALOG, COURSE_CONTENT, type CatalogCourse } from "@content/index";
import { CONTENT_SOURCES } from "@content/sources";
import { COURSE_RELATIONSHIPS } from "@content/relationships";
import { validateCourseContent, type ContentIssue } from "./validate";
import { invalidateCurriculumCache } from "@/modules/curriculum/queries";
import { invalidateSearchIndex } from "@/modules/search/service";
import type { CourseContent } from "./schema";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 32);

/** `set` clause that overwrites every column except the listed keys with the incoming row. */
function overwrite<T extends PgTable>(table: T, except: string[]) {
  const cols = getTableColumns(table) as Record<string, { name: string }>;
  return Object.fromEntries(
    Object.entries(cols)
      .filter(([key]) => !except.includes(key))
      .map(([key, col]) => [key, sql.raw(`excluded."${col.name}"`)]),
  );
}

async function chunked<T>(rows: T[], size: number, fn: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

export interface SyncReport {
  courses: number;
  pilotCourses: string[];
  skipped: { courseId: string; issues: ContentIssue[] }[];
  warnings: { courseId: string; issues: ContentIssue[] }[];
  newLessonVersions: number;
  newQuestionVersions: number;
}

type UnitRow = typeof t.units.$inferInsert;

function unitRowsFromCatalog(course: CatalogCourse, versionId: string): UnitRow[] {
  const seen = new Map<number, number>();
  return course.units.map((u) => {
    const n = (seen.get(u.number) ?? 0) + 1;
    seen.set(u.number, n);
    const suffix = n > 1 ? String.fromCharCode(96 + n) : "";
    return {
      id: `${course.id}.u${u.number}${suffix}`,
      courseVersionId: versionId,
      courseId: course.id,
      number: u.number,
      slug: `unit-${u.number}${suffix}`,
      title: u.title,
      description: "",
      status: "outline",
    };
  });
}

export async function syncContent(db: Db): Promise<SyncReport> {
  const report: SyncReport = { courses: 0, pilotCourses: [], skipped: [], warnings: [], newLessonVersions: 0, newQuestionVersions: 0 };

  const validated = new Map<string, CourseContent>();
  for (const input of COURSE_CONTENT) {
    const result = validateCourseContent(input);
    const errors = result.issues.filter((i) => i.level === "error");
    const warnings = result.issues.filter((i) => i.level === "warning");
    if (errors.length || !result.content) report.skipped.push({ courseId: input.courseId, issues: errors });
    else {
      validated.set(input.courseId, result.content);
      if (warnings.length) report.warnings.push({ courseId: input.courseId, issues: warnings });
    }
  }

  await db.transaction(async (tx) => {
    // ── Catalog: every AP course, with an honest content status ──────────────
    const courseRows = CATALOG.courses.map((c, i) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      description: c.description,
      availability: c.availability,
      availabilityNote: c.availabilityNote,
      contentStatus: (validated.has(c.id) ? "pilot_available" : c.units.length ? "outline_available" : "catalog_only") as t.CourseContentStatus,
      sourceUrl: c.sourceUrl,
      catalogVerifiedOn: CATALOG.verifiedOn,
      sortOrder: i,
    }));
    await tx.insert(t.courses).values(courseRows).onConflictDoUpdate({ target: t.courses.id, set: overwrite(t.courses, ["id"]) });
    report.courses = courseRows.length;

    for (const c of CATALOG.courses) {
      const content = validated.get(c.id);
      const versionId = content?.version.id ?? `${c.id}@catalog`;
      await tx
        .insert(t.courseVersions)
        .values({
          id: versionId,
          courseId: c.id,
          label: content?.version.label ?? `Course outline as listed by College Board (verified ${CATALOG.verifiedOn})`,
          alignmentSourceUrl: content?.version.alignmentSourceUrl ?? c.sourceUrl,
          alignmentNotes: content?.version.alignmentNotes ?? "Unit titles only. AceAP has not yet written lessons for this course.",
          verificationStatus: content ? "aligned_by_author" : c.outlineVerified ? "outline_from_official_index" : "unverified",
          isCurrent: true,
        })
        .onConflictDoUpdate({ target: t.courseVersions.id, set: overwrite(t.courseVersions, ["id", "createdAt"]) });
      // Exactly one current version per course.
      await tx
        .update(t.courseVersions)
        .set({ isCurrent: false })
        .where(and(eq(t.courseVersions.courseId, c.id), sql`${t.courseVersions.id} <> ${versionId}`));

      const unitRows = unitRowsFromCatalog(c, versionId);
      if (content) {
        for (const u of content.units) {
          const row = unitRows.find((x) => x.id === u.id);
          if (row) Object.assign(row, { status: "available" as const, description: u.description });
          else
            unitRows.push({ id: u.id, courseVersionId: versionId, courseId: c.id, number: u.number, slug: `unit-${u.number}`, title: u.title, description: u.description, status: "available" as const });
        }
      }
      if (unitRows.length)
        await tx.insert(t.units).values(unitRows).onConflictDoUpdate({ target: t.units.id, set: overwrite(t.units, ["id"]) });
    }

    // ── Pilot course content ─────────────────────────────────────────────────
    for (const content of validated.values()) {
      const courseId = content.courseId;
      report.pilotCourses.push(courseId);

      await tx
        .insert(t.skills)
        .values(content.skills.map((s, i) => ({ id: s.id, courseId, name: s.name, description: s.description, difficulty: s.difficulty, keywords: s.keywords, patternLabels: s.patternLabels, ordinal: i })))
        .onConflictDoUpdate({ target: t.skills.id, set: overwrite(t.skills, ["id"]) });

      const skillIds = content.skills.map((s) => s.id);
      await tx.delete(t.skillPrerequisites).where(inArray(t.skillPrerequisites.skillId, skillIds));
      const prereqRows = content.skills.flatMap((s) => s.prerequisites.map((p) => ({ skillId: s.id, prerequisiteSkillId: p })));
      if (prereqRows.length) await tx.insert(t.skillPrerequisites).values(prereqRows);

      if (content.misconceptions.length)
        await tx.insert(t.misconceptions).values(content.misconceptions).onConflictDoUpdate({ target: t.misconceptions.id, set: overwrite(t.misconceptions, ["id"]) });

      for (const unit of content.units) {
        for (const [ti, topic] of unit.topics.entries()) {
          await tx
            .insert(t.topics)
            .values({ id: topic.id, unitId: unit.id, courseId, ordinal: ti, title: topic.title, description: topic.description })
            .onConflictDoUpdate({ target: t.topics.id, set: overwrite(t.topics, ["id"]) });

          for (const [oi, o] of topic.objectives.entries()) {
            await tx
              .insert(t.learningObjectives)
              .values({ id: o.id, topicId: topic.id, courseId, courseVersionId: content.version.id, code: o.code, description: o.description, ordinal: oi })
              .onConflictDoUpdate({ target: t.learningObjectives.id, set: overwrite(t.learningObjectives, ["id"]) });
            await tx.delete(t.objectiveSkills).where(eq(t.objectiveSkills.objectiveId, o.id));
            await tx.insert(t.objectiveSkills).values(o.skillIds.map((skillId) => ({ objectiveId: o.id, skillId })));
          }

          for (const [li, lesson] of topic.lessons.entries()) {
            await tx
              .insert(t.lessons)
              .values({ id: lesson.id, topicId: topic.id, unitId: unit.id, courseId, ordinal: li, title: lesson.title, summary: lesson.summary, estMinutes: lesson.estMinutes })
              .onConflictDoUpdate({ target: t.lessons.id, set: overwrite(t.lessons, ["id", "publishedVersion"]) });
            await tx.delete(t.lessonSkills).where(eq(t.lessonSkills.lessonId, lesson.id));
            if (lesson.skillIds.length) await tx.insert(t.lessonSkills).values(lesson.skillIds.map((skillId) => ({ lessonId: lesson.id, skillId })));

            const contentHash = hash(lesson.blocks);
            const [latest] = await tx
              .select({ version: t.lessonVersions.version, contentHash: t.lessonVersions.contentHash })
              .from(t.lessonVersions)
              .where(eq(t.lessonVersions.lessonId, lesson.id))
              .orderBy(sql`${t.lessonVersions.version} desc`)
              .limit(1);
            let version = latest?.version ?? 0;
            if (!latest || latest.contentHash !== contentHash) {
              version += 1;
              await tx.insert(t.lessonVersions).values({ lessonId: lesson.id, version, blocks: lesson.blocks, contentHash, status: "published", provenance: content.provenance, publishedAt: new Date() });
              await tx.insert(t.contentReviews).values({
                entityType: "lesson",
                entityId: lesson.id,
                version,
                reviewerLabel: "content:validate (automated)",
                decision: "automated_checks_passed",
                checks: [{ name: "schema", passed: true }, { name: "references", passed: true }, { name: "latex_renders", passed: true }],
                notes: "Published by content sync after passing automated validation. Human subject-matter review is tracked separately.",
              });
              report.newLessonVersions += 1;
            }
            await tx.update(t.lessons).set({ publishedVersion: version }).where(eq(t.lessons.id, lesson.id));
          }
        }
      }

      // Questions (versioned by content hash)
      const existing = await tx
        .select({ questionId: t.questionVersions.questionId, version: t.questionVersions.version, contentHash: t.questionVersions.contentHash })
        .from(t.questionVersions)
        .innerJoin(t.questions, eq(t.questions.id, t.questionVersions.questionId))
        .where(eq(t.questions.courseId, courseId));
      const latestByQuestion = new Map<string, { version: number; contentHash: string }>();
      for (const row of existing) {
        const cur = latestByQuestion.get(row.questionId);
        if (!cur || row.version > cur.version) latestByQuestion.set(row.questionId, row);
      }

      const questionRows: (typeof t.questions.$inferInsert)[] = [];
      const versionRows: (typeof t.questionVersions.$inferInsert)[] = [];
      const reviewRows: (typeof t.contentReviews.$inferInsert)[] = [];
      for (const q of content.questions) {
        const body = { prompt: q.prompt, body: q.body, hints: q.hints, solution: q.solution, stimulus: q.stimulus ?? null, difficulty: q.difficulty, pattern: q.pattern };
        const contentHash = hash(body);
        const latest = latestByQuestion.get(q.id);
        let version = latest?.version ?? 0;
        if (!latest || latest.contentHash !== contentHash) {
          version += 1;
          versionRows.push({ questionId: q.id, version, ...body, estSeconds: q.estSeconds, contentHash, status: "published", provenance: content.provenance });
          reviewRows.push({
            entityType: "question",
            entityId: q.id,
            version,
            reviewerLabel: "content:validate (automated)",
            decision: "automated_checks_passed",
            checks: [{ name: "answer_keys_graded", passed: true }, { name: "latex_renders", passed: true }],
            notes: "Answer key and authored wrong answers were run through the production grader.",
          });
        }
        questionRows.push({ id: q.id, courseId, type: q.body.type, publishedVersion: version, primarySkillId: q.skillIds[0] });
      }
      await chunked(questionRows, 100, (rows) => tx.insert(t.questions).values(rows).onConflictDoUpdate({ target: t.questions.id, set: overwrite(t.questions, ["id"]) }));
      await chunked(versionRows, 50, (rows) => tx.insert(t.questionVersions).values(rows));
      await chunked(reviewRows, 100, (rows) => tx.insert(t.contentReviews).values(rows));
      report.newQuestionVersions += versionRows.length;

      const questionIds = content.questions.map((q) => q.id);
      await chunked(questionIds, 200, (ids) => tx.delete(t.questionSkills).where(inArray(t.questionSkills.questionId, ids)));
      await chunked(
        content.questions.flatMap((q) => q.skillIds.map((skillId, i) => ({ questionId: q.id, skillId, isPrimary: i === 0 }))),
        200,
        (rows) => tx.insert(t.questionSkills).values(rows),
      );

      for (const a of content.assessments) {
        await tx
          .insert(t.assessments)
          .values({ id: a.id, courseId, unitId: a.unitId ?? null, topicId: a.topicId ?? null, kind: a.kind, title: a.title, description: a.description, config: a.config })
          .onConflictDoUpdate({ target: t.assessments.id, set: overwrite(t.assessments, ["id", "createdAt", "createdBy"]) });
        await tx.delete(t.assessmentItems).where(eq(t.assessmentItems.assessmentId, a.id));
        await tx.insert(t.assessmentItems).values(a.questionIds.map((questionId, ordinal) => ({ assessmentId: a.id, questionId, ordinal })));
      }

      for (const s of content.simulations) {
        await tx
          .insert(t.simulations)
          .values({ id: s.id, courseId, name: s.name, purpose: s.purpose, variables: s.variables, outputs: s.outputs, skillIds: s.skillIds, accessibilityAlternative: s.accessibilityAlternative, telemetry: s.telemetry })
          .onConflictDoUpdate({ target: t.simulations.id, set: overwrite(t.simulations, ["id"]) });
      }
    }

    // ── Shared cross-course relationships (only between skills that exist) ───
    const allSkills = new Set((await tx.select({ id: t.skills.id }).from(t.skills)).map((s) => s.id));
    await tx.delete(t.skillRelationships);
    const rels = COURSE_RELATIONSHIPS.filter((r) => allSkills.has(r.from) && allSkills.has(r.to));
    if (rels.length) await tx.insert(t.skillRelationships).values(rels.map((r) => ({ fromSkillId: r.from, toSkillId: r.to, type: r.type, rationale: r.rationale })));

    await tx.insert(t.contentSources).values(CONTENT_SOURCES).onConflictDoUpdate({ target: t.contentSources.id, set: overwrite(t.contentSources, ["id"]) });
  });

  // Cached read models reflect the previous content; drop them.
  invalidateCurriculumCache();
  invalidateSearchIndex();
  return report;
}
