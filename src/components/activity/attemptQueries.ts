/**
 * Server-only reads for the start pages: an attempt the student can resume,
 * and their previous submitted attempts (count, best and latest score).
 * Private data, so everything goes through asUser (row-level security).
 */
import "server-only";
import { and, desc, eq, inArray, isNull, type SQL } from "drizzle-orm";
import { asUser, type Actor } from "@/db/client";
import * as t from "@/db/schema";

export type AttemptFilter =
  | { kind: "assessment"; assessmentId: string }
  | { kind: "practice"; skillId: string }
  | { kind: "review"; courseId: string }
  | { kind: "exam_mixed"; courseId: string }
  | { kind: "assignment"; assignmentId: string };

function where(actor: Actor, f: AttemptFilter): SQL {
  const mine = eq(t.attempts.userId, actor.id);
  switch (f.kind) {
    case "assessment":
      return and(mine, eq(t.attempts.assessmentId, f.assessmentId), isNull(t.attempts.assignmentId))!;
    case "practice":
      return and(mine, eq(t.attempts.mode, "guided_practice"), eq(t.attempts.skillId, f.skillId), isNull(t.attempts.assignmentId))!;
    case "review":
      return and(mine, eq(t.attempts.mode, "course_review"), eq(t.attempts.courseId, f.courseId), isNull(t.attempts.assessmentId), isNull(t.attempts.assignmentId))!;
    case "exam_mixed":
      return and(mine, eq(t.attempts.mode, "exam_practice"), eq(t.attempts.courseId, f.courseId), isNull(t.attempts.assessmentId), isNull(t.attempts.assignmentId))!;
    case "assignment":
      return and(mine, eq(t.attempts.assignmentId, f.assignmentId))!;
  }
}

export interface AttemptHistory {
  open: { id: string; startedAt: Date; deadline: Date | null } | null;
  submitted: number;
  best: { score: number; maxScore: number } | null;
  last: { id: string; score: number; maxScore: number; submittedAt: Date } | null;
}

export async function attemptHistory(actor: Actor, filter: AttemptFilter): Promise<AttemptHistory> {
  const rows = await asUser(actor, (tx) =>
    tx
      .select({ id: t.attempts.id, status: t.attempts.status, startedAt: t.attempts.startedAt, submittedAt: t.attempts.submittedAt, score: t.attempts.score, maxScore: t.attempts.maxScore, timeLimitSeconds: t.attempts.timeLimitSeconds })
      .from(t.attempts)
      .where(where(actor, filter))
      .orderBy(desc(t.attempts.startedAt))
      .limit(100),
  );
  const now = Date.now();
  const openRow = rows.find((r) => {
    if (r.status !== "in_progress") return false;
    // A timed attempt past its deadline is closed on next view; don't offer it as "resume".
    return !r.timeLimitSeconds || r.startedAt.getTime() + r.timeLimitSeconds * 1000 + 30_000 > now;
  });
  const done = rows.filter((r) => r.status === "submitted" && r.score !== null && r.maxScore);
  const best = done.reduce<{ score: number; maxScore: number } | null>((b, r) => (!b || (r.score as number) / (r.maxScore as number) > b.score / b.maxScore ? { score: r.score as number, maxScore: r.maxScore as number } : b), null);
  const lastRow = done[0];
  return {
    open: openRow ? { id: openRow.id, startedAt: openRow.startedAt, deadline: openRow.timeLimitSeconds ? new Date(openRow.startedAt.getTime() + openRow.timeLimitSeconds * 1000) : null } : null,
    submitted: done.length,
    best,
    last: lastRow ? { id: lastRow.id, score: lastRow.score as number, maxScore: lastRow.maxScore as number, submittedAt: lastRow.submittedAt as Date } : null,
  };
}

export const formatScore = (s: { score: number; maxScore: number }) => `${Math.round(s.score * 10) / 10} / ${s.maxScore} (${Math.round((s.score / s.maxScore) * 100)}%)`;

/** The student's current mastery state for some skills (missing = not started). */
export async function skillStates(actor: Actor, skillIds: string[]): Promise<Map<string, { level: typeof t.masteryStates.$inferSelect.level; needsReview: boolean }>> {
  if (skillIds.length === 0) return new Map();
  const rows = await asUser(actor, (tx) =>
    tx
      .select({ skillId: t.masteryStates.skillId, level: t.masteryStates.level, needsReview: t.masteryStates.needsReview })
      .from(t.masteryStates)
      .where(and(eq(t.masteryStates.userId, actor.id), inArray(t.masteryStates.skillId, skillIds))),
  );
  return new Map(rows.map((r) => [r.skillId, { level: r.level, needsReview: r.needsReview }]));
}
