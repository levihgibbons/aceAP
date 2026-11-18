/** Persistence for learning sessions and active-time heartbeats. */
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { clampHeartbeat } from "./activeTime";

export async function startLearningSession(userId: string, input: { activityKind: t.ActivityKind; courseId: string | null; activityId: string | null }, now: Date = new Date()): Promise<string> {
  const db = await getDb();
  const [row] = await db
    .insert(t.learningSessions)
    .values({ userId, courseId: input.courseId, activityKind: input.activityKind, activityId: input.activityId, startedAt: now, lastHeartbeatAt: now })
    .returning({ id: t.learningSessions.id });
  return row.id;
}

/** Add a heartbeat's (clamped) time to the session and to the day's aggregate. */
export async function recordHeartbeat(userId: string, input: { sessionId: string; openMs: number; activeMs: number }, now: Date = new Date()): Promise<{ openMs: number; activeMs: number }> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(t.learningSessions)
      .where(and(eq(t.learningSessions.id, input.sessionId), eq(t.learningSessions.userId, userId)))
      .for("update");
    if (!session) throw new DomainError("not_found", "Learning session not found.");
    const accepted = clampHeartbeat(input, now.getTime() - session.lastHeartbeatAt.getTime());
    await tx
      .update(t.learningSessions)
      .set({ lastHeartbeatAt: now, openMs: session.openMs + accepted.openMs, activeMs: session.activeMs + accepted.activeMs })
      .where(eq(t.learningSessions.id, session.id));
    if (session.courseId && (accepted.openMs > 0 || accepted.activeMs > 0)) {
      await tx
        .insert(t.activityAggregates)
        .values({ userId, courseId: session.courseId, day: now.toISOString().slice(0, 10), activityKind: session.activityKind, openMs: accepted.openMs, activeMs: accepted.activeMs })
        .onConflictDoUpdate({
          target: [t.activityAggregates.userId, t.activityAggregates.courseId, t.activityAggregates.day, t.activityAggregates.activityKind],
          set: { openMs: sql`${t.activityAggregates.openMs} + ${accepted.openMs}`, activeMs: sql`${t.activityAggregates.activeMs} + ${accepted.activeMs}` },
        });
    }
    return accepted;
  });
}
