/**
 * Server-only read model for a finished attempt's results: which skills the
 * attempt produced evidence for, and each one's level before the attempt
 * started vs. right after it was submitted (from mastery snapshots). Reads go
 * through asUser so row-level security applies.
 */
import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { asUser, type Actor } from "@/db/client";
import * as t from "@/db/schema";
import type { MasteryChange } from "@/modules/assessments/service";
import { getCourseTree } from "@/modules/curriculum/queries";
import type { MasteryLevel } from "@/modules/mastery/types";

export async function attemptMasteryChanges(
  actor: Actor,
  attempt: { id: string; courseId: string; startedAt: string; submittedAt: string | null },
): Promise<MasteryChange[]> {
  const started = Date.parse(attempt.startedAt);
  const ended = (attempt.submittedAt ? Date.parse(attempt.submittedAt) : Date.now()) + 1_000;
  const data = await asUser(actor, async (tx) => {
    const evidence = await tx
      .selectDistinct({ skillId: t.masteryEvidence.skillId })
      .from(t.masteryEvidence)
      .where(and(eq(t.masteryEvidence.userId, actor.id), eq(t.masteryEvidence.attemptId, attempt.id)));
    const skillIds = evidence.map((e) => e.skillId);
    if (skillIds.length === 0) return { skillIds, snapshots: [] };
    const snapshots = await tx
      .select({ skillId: t.masterySnapshots.skillId, level: t.masterySnapshots.level, needsReview: t.masterySnapshots.needsReview, createdAt: t.masterySnapshots.createdAt })
      .from(t.masterySnapshots)
      .where(and(eq(t.masterySnapshots.userId, actor.id), inArray(t.masterySnapshots.skillId, skillIds)))
      .orderBy(asc(t.masterySnapshots.createdAt));
    return { skillIds, snapshots };
  });
  if (data.skillIds.length === 0) return [];
  const tree = await getCourseTree(attempt.courseId);

  return data.skillIds
    .map((skillId) => {
      const mine = data.snapshots.filter((s) => s.skillId === skillId);
      const before = [...mine].reverse().find((s) => s.createdAt.getTime() < started);
      const after = [...mine].reverse().find((s) => s.createdAt.getTime() <= ended) ?? mine[mine.length - 1];
      return {
        skillId,
        skillName: tree?.skills.get(skillId)?.name ?? skillId,
        before: (before?.level ?? "not_started") as MasteryLevel,
        after: (after?.level ?? before?.level ?? "not_started") as MasteryLevel,
        needsReview: after?.needsReview ?? false,
      };
    })
    .sort((a, b) => (tree ? tree.skillIds.indexOf(a.skillId) - tree.skillIds.indexOf(b.skillId) : 0));
}
