/**
 * Append-only learning events. Only meaningful, purposeful events are logged —
 * never mouse movement, keystrokes or anything outside the learning activity.
 */
import type { Db } from "@/db/client";
import * as t from "@/db/schema";

export const EVENT_SCHEMA_VERSION = 1;

export interface LearningEventInput {
  userId: string;
  type: t.LearningEventType;
  courseId?: string | null;
  skillId?: string | null;
  objectiveId?: string | null;
  activityType?: string | null;
  activityId?: string | null;
  sessionId?: string | null;
  payload?: Record<string, unknown>;
  /** When set, a repeated event with the same key is ignored. */
  idempotencyKey?: string | null;
  occurredAt?: Date;
}

export async function logEvent(db: Db, e: LearningEventInput): Promise<void> {
  await db
    .insert(t.learningEvents)
    .values({
      userId: e.userId,
      type: e.type,
      courseId: e.courseId ?? null,
      skillId: e.skillId ?? null,
      objectiveId: e.objectiveId ?? null,
      activityType: e.activityType ?? null,
      activityId: e.activityId ?? null,
      sessionId: e.sessionId ?? null,
      payload: e.payload ?? {},
      schemaVersion: EVENT_SCHEMA_VERSION,
      idempotencyKey: e.idempotencyKey ?? null,
      occurredAt: e.occurredAt ?? new Date(),
    })
    .onConflictDoNothing();
}
