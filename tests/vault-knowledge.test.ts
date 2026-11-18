/**
 * "My knowledge" — the vault's self-building knowledge base.
 *  - It contains only lessons the student has opened, and only the blocks
 *    they have reached; finishing the lesson adds the rest (key ideas).
 *  - Mastery and the student's own linked notes appear under the topic.
 *  - Another student's progress and notes never appear.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import type { Actor } from "@/db/client";
import * as t from "@/db/schema";
import type { LessonBlock } from "@/modules/content/schema";
import { completeLesson, saveLessonPosition, startLesson } from "@/modules/learning/progress";
import { getKnowledgeBase } from "@/modules/vault/knowledge";
import { createNote } from "@/modules/vault/service";
import { T0, MINUTE, bootWorld, plus, type World } from "./helpers/world";

const LESSON = "physics-1.l.position-displacement";
const SKILL = "physics-1.position-displacement";

let w: World;
let blocks: LessonBlock[];
const actor = (u: { id: string; role: Actor["role"] }): Actor => ({ id: u.id, role: u.role });

beforeAll(async () => {
  w = await bootWorld();
  const [lesson] = await w.db.select().from(t.lessons).where(eq(t.lessons.id, LESSON));
  const [version] = await w.db
    .select()
    .from(t.lessonVersions)
    .where(and(eq(t.lessonVersions.lessonId, LESSON), eq(t.lessonVersions.version, lesson.publishedVersion!)));
  blocks = version.blocks;
});

const topicFor = async (u: World["students"]["cleo"]) => {
  const kb = await getKnowledgeBase(actor(u), { courseId: "physics-1" });
  return kb.courses[0]?.units.flatMap((x) => x.topics).find((x) => x.lessons.some((l) => l.id === LESSON)) ?? null;
};

describe("the vault builds itself from progress", () => {
  it("is empty for a course the student has not started", async () => {
    const kb = await getKnowledgeBase(actor(w.students.cleo), { courseId: "physics-1" });
    expect(kb.totals.topics).toBe(0);
    expect(kb.courses[0].upcomingUnits.length).toBeGreaterThan(0);
  });

  it("adds only what the student has reached, then the rest when they finish", async () => {
    const definitionAt = blocks.findIndex((b) => b.type === "definition" || b.type === "formula");
    const summaryAt = blocks.findIndex((b) => b.type === "summary");
    expect(definitionAt, "lesson has a definition or formula").toBeGreaterThan(0);
    expect(summaryAt, "lesson has a summary after it").toBeGreaterThan(definitionAt);

    await startLesson(w.students.cleo.id, LESSON, T0);
    let topic = (await topicFor(w.students.cleo))!;
    expect(topic).not.toBeNull();
    expect(topic.lessons[0]).toMatchObject({ id: LESSON, status: "in_progress" });
    expect(topic.definitions.length + topic.formulas.length).toBe(0);
    expect(topic.keyIdeas).toEqual([]);

    await saveLessonPosition(w.students.cleo.id, LESSON, definitionAt, plus(T0, MINUTE));
    topic = (await topicFor(w.students.cleo))!;
    expect(topic.definitions.length + topic.formulas.length).toBeGreaterThan(0);
    expect(topic.keyIdeas).toEqual([]);

    await completeLesson(w.students.cleo.id, LESSON, plus(T0, 5 * MINUTE));
    topic = (await topicFor(w.students.cleo))!;
    expect(topic.lessons[0].status).toBe("completed");
    const summary = blocks[summaryAt] as Extract<LessonBlock, { type: "summary" }>;
    expect(topic.keyIdeas.map((k) => k.text)).toEqual(expect.arrayContaining(summary.points));
    expect(topic.skills.map((s) => s.id)).toContain(SKILL);

    const kb = await getKnowledgeBase(actor(w.students.cleo), { courseId: "physics-1" });
    expect(kb.totals.topics).toBeGreaterThanOrEqual(1);
    expect(kb.recent[0]).toMatchObject({ kind: "lesson_completed", href: `/app/learn/${LESSON}` });
  });

  it("files the student's own linked notes under the topic", async () => {
    const note = await createNote(actor(w.students.cleo), { title: "Displacement vs distance", body: "See [[Position and displacement]] — sign matters." });
    const topic = (await topicFor(w.students.cleo))!;
    expect(topic.notes).toEqual([expect.objectContaining({ id: note.id, title: "Displacement vs distance" })]);
  });

  it("never shows another student's progress or notes", async () => {
    await createNote(actor(w.students.ben), { title: "Ben's secret", body: "[[Position and displacement]]" });
    expect(await topicFor(w.students.ben)).toBeNull();
    const cleo = (await topicFor(w.students.cleo))!;
    expect(cleo.notes.map((n) => n.title)).not.toContain("Ben's secret");
  });
});
