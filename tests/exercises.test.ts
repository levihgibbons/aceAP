/**
 * Exercises (topic practice sets) and the teacher "Lessons & practice" report.
 *  - An exercise attempt serves `questionsPerAttempt` questions drawn from its
 *    pool, as formative guided practice with immediate feedback and hints.
 *  - A retake prefers questions the student has not seen yet.
 *  - The roadmap puts each topic's exercises after that topic's lessons.
 *  - The report shows the class's results per lesson/exercise and is limited to
 *    the class's own teacher.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { eq, and } from "drizzle-orm";
import * as t from "@/db/schema";
import { startAttempt, submitAttempt } from "@/modules/assessments/service";
import { getUnitPracticeReport } from "@/modules/classrooms/practiceReport";
import { unitPath } from "@/modules/curriculum/path";
import { getCourseTree } from "@/modules/curriculum/queries";
import { DAY, T0, answerCorrectly, attemptRow, bootWorld, clock, plus, rejection, type World } from "./helpers/world";

let w: World;
let exercise: typeof t.assessments.$inferSelect;
let pool: string[];

beforeAll(async () => {
  w = await bootWorld();
  const rows = await w.db.select().from(t.assessments).where(and(eq(t.assessments.courseId, "physics-1"), eq(t.assessments.kind, "exercise")));
  expect(rows.length, "AP Physics 1 publishes exercises").toBeGreaterThan(0);
  exercise = rows.sort((a, b) => a.id.localeCompare(b.id))[0];
  pool = (await w.db.select().from(t.assessmentItems).where(eq(t.assessmentItems.assessmentId, exercise.id))).map((i) => i.questionId);
});

describe("exercise attempts", () => {
  it("draw questionsPerAttempt questions from the pool as guided practice with immediate feedback", async () => {
    const per = exercise.config.questionsPerAttempt!;
    expect(per).toBeGreaterThan(0);
    expect(pool.length).toBeGreaterThanOrEqual(per + 2);
    const c = clock(T0);
    const { attemptId } = await startAttempt(w.students.cleo.id, { kind: "assessment", assessmentId: exercise.id }, c.tick());
    const a = await attemptRow(attemptId);
    expect(a.mode).toBe("guided_practice");
    expect(a.feedback).toBe("immediate");
    expect(a.items).toHaveLength(per);
    for (const item of a.items) expect(pool).toContain(item.questionId);
    expect(new Set(a.items.map((i) => i.questionId)).size).toBe(per);

    for (const item of a.items) await answerCorrectly(attemptId, item.questionId, { now: c.tick() });
    const result = await submitAttempt(w.students.cleo.id, attemptId, c.tick());
    expect(result.score).toBe(result.maxScore);

    // A retake prefers questions not seen yet.
    const second = await startAttempt(w.students.cleo.id, { kind: "assessment", assessmentId: exercise.id }, plus(T0, DAY));
    const b = await attemptRow(second.attemptId);
    const seen = new Set(a.items.map((i) => i.questionId));
    const fresh = b.items.filter((i) => !seen.has(i.questionId)).length;
    expect(fresh).toBe(Math.min(per, pool.length - per));
  });
});

describe("the guided path", () => {
  it("places every topic's exercises after that topic's lessons", async () => {
    const tree = (await getCourseTree("physics-1"))!;
    const unit = tree.units.find((u) => u.status === "available")!;
    const sections = unitPath(tree, unit);
    expect(sections.some((s) => s.items.some((i) => i.type === "assessment" && i.assessment.kind === "exercise"))).toBe(true);
    for (const s of sections) {
      const firstAssessment = s.items.findIndex((i) => i.type === "assessment");
      const lastLesson = s.items.map((i) => i.type).lastIndexOf("lesson");
      if (firstAssessment >= 0 && lastLesson >= 0) expect(lastLesson).toBeLessThan(firstAssessment);
    }
  });
});

describe("Lessons & practice report", () => {
  it("shows the class's results for the exercise", async () => {
    const report = await getUnitPracticeReport(w.teachers.northfield, w.classes.northPhysics.id, exercise.unitId ?? undefined);
    expect(report.students.map((s) => s.id)).toEqual([w.students.cleo.id]);
    const step = report.steps.find((s) => s.id === exercise.id)!;
    expect(step).toBeDefined();
    expect(step.kind).toBe("exercise");
    expect(step.started).toBe(1);
    expect(step.attempts).toBe(1);
    expect(step.averageBest).toBe(1);
    expect(step.struggling).toEqual([]);
    expect(report.steps.some((s) => s.type === "lesson")).toBe(true);
  });

  it("is not available to a teacher from another school", async () => {
    expect(await rejection(getUnitPracticeReport(w.teachers.lakeview, w.classes.northPhysics.id))).toMatch(/not.?found/i);
  });
});
