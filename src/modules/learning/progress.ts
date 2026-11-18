/**
 * Lesson progress. Completion is recorded here and is deliberately NOT an
 * input to mastery: finishing a lesson proves the content was reached, not
 * that it was understood. Only graded responses create mastery evidence.
 */
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { logEvent } from "./events";

async function publishedLesson(lessonId: string) {
  const db = await getDb();
  const [lesson] = await db.select().from(t.lessons).where(eq(t.lessons.id, lessonId));
  if (!lesson || !lesson.publishedVersion) throw new DomainError("not_found", "Lesson not found.");
  return { db, lesson, version: lesson.publishedVersion };
}

/** Record that the student opened the lesson (idempotent). */
export async function startLesson(userId: string, lessonId: string, now: Date = new Date()) {
  const { db, lesson, version } = await publishedLesson(lessonId);
  await db.insert(t.courseEnrollments).values({ userId, courseId: lesson.courseId }).onConflictDoNothing();
  const inserted = await db
    .insert(t.lessonProgress)
    .values({ userId, lessonId, courseId: lesson.courseId, lessonVersion: version, startedAt: now, updatedAt: now })
    .onConflictDoNothing()
    .returning({ lessonId: t.lessonProgress.lessonId });
  if (inserted.length)
    await logEvent(db, { userId, type: "LESSON_STARTED", courseId: lesson.courseId, activityType: "lesson", activityId: lessonId, idempotencyKey: `lesson-started:${lessonId}`, occurredAt: now });
  else await db.update(t.lessonProgress).set({ updatedAt: now }).where(and(eq(t.lessonProgress.userId, userId), eq(t.lessonProgress.lessonId, lessonId)));
}

/** Remember how far the student has got, so they resume where they stopped. */
export async function saveLessonPosition(userId: string, lessonId: string, furthestBlock: number, now: Date = new Date()) {
  const db = await getDb();
  await db
    .update(t.lessonProgress)
    .set({ furthestBlock: sql`greatest(${t.lessonProgress.furthestBlock}, ${Math.max(0, Math.floor(furthestBlock))})`, updatedAt: now })
    .where(and(eq(t.lessonProgress.userId, userId), eq(t.lessonProgress.lessonId, lessonId)));
}

export async function completeLesson(userId: string, lessonId: string, now: Date = new Date()): Promise<{ alreadyCompleted: boolean }> {
  const { db, lesson, version } = await publishedLesson(lessonId);
  const [row] = await db.select().from(t.lessonProgress).where(and(eq(t.lessonProgress.userId, userId), eq(t.lessonProgress.lessonId, lessonId)));
  if (row?.status === "completed") return { alreadyCompleted: true };
  await db
    .insert(t.lessonProgress)
    .values({ userId, lessonId, courseId: lesson.courseId, lessonVersion: version, status: "completed", completedAt: now, startedAt: now, updatedAt: now, furthestBlock: 9999 })
    .onConflictDoUpdate({ target: [t.lessonProgress.userId, t.lessonProgress.lessonId], set: { status: "completed", completedAt: now, updatedAt: now, lessonVersion: version } });
  await logEvent(db, { userId, type: "LESSON_COMPLETED", courseId: lesson.courseId, activityType: "lesson", activityId: lessonId, idempotencyKey: `lesson-completed:${lessonId}`, occurredAt: now });

  // A lesson assignment is satisfied by completing the lesson.
  const assigned = await db
    .select({ id: t.assignments.id, dueAt: t.assignments.dueAt, classId: t.assignments.classId })
    .from(t.assignments)
    .innerJoin(t.classEnrollments, and(eq(t.classEnrollments.classId, t.assignments.classId), eq(t.classEnrollments.studentId, userId), eq(t.classEnrollments.status, "active")))
    .where(and(eq(t.assignments.kind, "lesson"), eq(t.assignments.lessonId, lessonId), sql`${t.assignments.archivedAt} is null`));
  for (const a of assigned) {
    const targets = await db.select().from(t.assignmentTargets).where(eq(t.assignmentTargets.assignmentId, a.id));
    if (targets.length && !targets.some((x) => x.studentId === userId)) continue;
    const [existing] = await db.select({ id: t.submissions.id }).from(t.submissions).where(and(eq(t.submissions.assignmentId, a.id), eq(t.submissions.studentId, userId)));
    if (existing) continue;
    await db.insert(t.submissions).values({ assignmentId: a.id, studentId: userId, status: a.dueAt && now.getTime() > a.dueAt.getTime() ? "late" : "submitted", score: 1, maxScore: 1, submittedAt: now });
  }
  return { alreadyCompleted: false };
}
