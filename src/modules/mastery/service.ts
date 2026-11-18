/**
 * Mastery persistence: evidence → projection (mastery_states) + history
 * (mastery_snapshots) + review schedule + misconception tracking.
 *
 * mastery_states is a rebuildable projection. `rebuildMastery` replays the
 * immutable evidence log and is the documented recovery process.
 */
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as t from "@/db/schema";
import { computeSkillMastery, isIndependent } from "./engine";
import { DEFAULT_MASTERY_POLICY, parseMasteryPolicy } from "./policy";
import { scheduleAfterEvidence } from "./retention";
import { CALC_VERSION, type EvidenceItem, type MasteryPolicyConfig, type SkillMasteryResult } from "./types";

export interface ActivePolicy {
  id: string;
  version: number;
  name: string;
  organizationId: string | null;
  config: MasteryPolicyConfig;
}

/** Create the platform default policy on first use. */
export async function ensureDefaultPolicy(db: Db): Promise<ActivePolicy> {
  const existing = await getPlatformPolicy(db);
  if (existing) return existing;
  const [row] = await db
    .insert(t.masteryPolicies)
    .values({ organizationId: null, name: "AceAP default", version: 1, config: DEFAULT_MASTERY_POLICY, isActive: true })
    .returning();
  return { id: row.id, version: row.version, name: row.name, organizationId: null, config: row.config };
}

async function getPlatformPolicy(db: Db): Promise<ActivePolicy | null> {
  const [row] = await db
    .select()
    .from(t.masteryPolicies)
    .where(and(isNull(t.masteryPolicies.organizationId), eq(t.masteryPolicies.isActive, true)))
    .orderBy(desc(t.masteryPolicies.version))
    .limit(1);
  return row ? { id: row.id, version: row.version, name: row.name, organizationId: null, config: row.config } : null;
}

/**
 * The policy governing a student's mastery in a course: the active policy of
 * the school whose class the student takes the course in, otherwise the
 * platform default.
 */
export async function resolvePolicy(db: Db, userId: string, courseId: string): Promise<ActivePolicy> {
  const [orgPolicy] = await db
    .select({ p: t.masteryPolicies })
    .from(t.classEnrollments)
    .innerJoin(t.classes, eq(t.classes.id, t.classEnrollments.classId))
    .innerJoin(t.masteryPolicies, eq(t.masteryPolicies.organizationId, t.classes.organizationId))
    .where(
      and(
        eq(t.classEnrollments.studentId, userId),
        eq(t.classEnrollments.status, "active"),
        eq(t.classes.courseId, courseId),
        isNull(t.classes.archivedAt),
        eq(t.masteryPolicies.isActive, true),
      ),
    )
    .orderBy(desc(t.masteryPolicies.version))
    .limit(1);
  if (orgPolicy) return { id: orgPolicy.p.id, version: orgPolicy.p.version, name: orgPolicy.p.name, organizationId: orgPolicy.p.organizationId, config: orgPolicy.p.config };
  return ensureDefaultPolicy(db);
}

export function toEvidenceItem(row: typeof t.masteryEvidence.$inferSelect): EvidenceItem {
  return {
    id: row.id,
    questionId: row.questionId,
    pattern: row.pattern,
    score: row.score,
    difficulty: row.difficulty,
    mode: row.mode,
    attemptId: row.attemptId,
    tryNumber: row.tryNumber,
    hintsUsed: row.hintsUsed,
    solutionViewed: row.solutionViewed,
    tutorUsed: row.tutorUsed,
    isRetentionReview: row.isRetentionReview,
    occurredAt: row.occurredAt,
  };
}

export interface RecomputeInput {
  userId: string;
  skillId: string;
  courseId: string;
  trigger: "evidence" | "policy_change" | "rebuild" | "retention";
  triggerEvidenceId?: string | null;
  now?: Date;
  policy?: ActivePolicy;
}

/** Recalculate one (student, skill) state from all of its evidence and persist it. */
export async function recomputeSkill(db: Db, input: RecomputeInput): Promise<SkillMasteryResult> {
  const now = input.now ?? new Date();
  const policy = input.policy ?? (await resolvePolicy(db, input.userId, input.courseId));
  const rows = await db
    .select()
    .from(t.masteryEvidence)
    .where(and(eq(t.masteryEvidence.userId, input.userId), eq(t.masteryEvidence.skillId, input.skillId)))
    .orderBy(asc(t.masteryEvidence.occurredAt), asc(t.masteryEvidence.id));
  const evidence = rows.map(toEvidenceItem);

  const [schedule] = await db
    .select()
    .from(t.reviewSchedule)
    .where(and(eq(t.reviewSchedule.userId, input.userId), eq(t.reviewSchedule.skillId, input.skillId)));

  // Evaluate without the schedule first so the new evidence can move the schedule…
  const provisional = computeSkillMastery(evidence, policy.config, { now, reviewDueAt: null });
  let next = schedule ? { stage: schedule.stage, dueAt: schedule.dueAt, lastReviewedAt: schedule.lastReviewedAt } : null;
  if (input.trigger === "evidence" && evidence.length) {
    const latest = input.triggerEvidenceId ? (evidence.find((e) => e.id === input.triggerEvidenceId) ?? evidence[evidence.length - 1]) : evidence[evidence.length - 1];
    next = scheduleAfterEvidence(next, latest, provisional.level, policy.config);
    if (next) {
      await db
        .insert(t.reviewSchedule)
        .values({ userId: input.userId, skillId: input.skillId, courseId: input.courseId, stage: next.stage, dueAt: next.dueAt, lastReviewedAt: next.lastReviewedAt, updatedAt: now })
        .onConflictDoUpdate({ target: [t.reviewSchedule.userId, t.reviewSchedule.skillId], set: { stage: next.stage, dueAt: next.dueAt, lastReviewedAt: next.lastReviewedAt, updatedAt: now } });
    }
  }
  // …then apply the (possibly updated) schedule to decide the review flag.
  const result = computeSkillMastery(evidence, policy.config, { now, reviewDueAt: next?.dueAt ?? null });

  const values = {
    userId: input.userId,
    skillId: input.skillId,
    courseId: input.courseId,
    alpha: result.alpha,
    beta: result.beta,
    estimate: result.estimate,
    level: result.level,
    needsReview: result.needsReview,
    explanation: result.explanation,
    lastEvidenceAt: evidence.length ? evidence[evidence.length - 1].occurredAt : null,
    lastDemonstratedAt: result.explanation.lastDemonstratedAt ? new Date(result.explanation.lastDemonstratedAt) : null,
    calcVersion: CALC_VERSION,
    policyId: policy.id,
    policyVersion: policy.version,
    updatedAt: now,
  };
  await db
    .insert(t.masteryStates)
    .values(values)
    .onConflictDoUpdate({ target: [t.masteryStates.userId, t.masteryStates.skillId], set: { ...values, userId: undefined, skillId: undefined } });

  await db.insert(t.masterySnapshots).values({
    userId: input.userId,
    skillId: input.skillId,
    courseId: input.courseId,
    estimate: result.estimate,
    level: result.level,
    needsReview: result.needsReview,
    alpha: result.alpha,
    beta: result.beta,
    evidenceCount: evidence.length,
    calcVersion: CALC_VERSION,
    policyId: policy.id,
    policyVersion: policy.version,
    trigger: input.trigger,
    triggerEvidenceId: input.triggerEvidenceId ?? null,
    createdAt: now,
  });

  return result;
}

/**
 * Replay evidence into the projection. Used after a policy change and as the
 * recovery path if mastery_states is ever lost or suspected stale.
 */
export async function rebuildMastery(db: Db, options: { userId?: string; organizationId?: string | null; trigger: "policy_change" | "rebuild"; now?: Date }): Promise<number> {
  const where = options.userId ? eq(t.masteryEvidence.userId, options.userId) : undefined;
  const pairs = await db
    .selectDistinct({ userId: t.masteryEvidence.userId, skillId: t.masteryEvidence.skillId, courseId: t.masteryEvidence.courseId })
    .from(t.masteryEvidence)
    .where(where);
  let n = 0;
  for (const p of pairs) {
    await recomputeSkill(db, { ...p, trigger: options.trigger, now: options.now });
    n += 1;
  }
  return n;
}

/**
 * Publish a new policy version. The previous version row is kept (inactive),
 * every affected state is recalculated, and each recalculation appends a
 * snapshot — earlier snapshots are never modified.
 */
export async function publishPolicy(
  db: Db,
  input: { organizationId: string | null; name: string; config: unknown; createdBy: string | null; now?: Date },
): Promise<{ policy: ActivePolicy; recalculated: number }> {
  const config = parseMasteryPolicy(input.config);
  const scope = input.organizationId ? eq(t.masteryPolicies.organizationId, input.organizationId) : isNull(t.masteryPolicies.organizationId);
  return db.transaction(async (tx) => {
    const [{ max }] = await tx.select({ max: sql<number>`coalesce(max(${t.masteryPolicies.version}), 0)::int` }).from(t.masteryPolicies).where(scope);
    await tx.update(t.masteryPolicies).set({ isActive: false }).where(scope);
    const [row] = await tx
      .insert(t.masteryPolicies)
      .values({ organizationId: input.organizationId, name: input.name, version: max + 1, config, isActive: true, createdBy: input.createdBy })
      .returning();
    await tx.insert(t.auditLogs).values({
      actorId: input.createdBy,
      action: "mastery_policy.published",
      entityType: "mastery_policy",
      entityId: row.id,
      organizationId: input.organizationId,
      metadata: { version: row.version, name: row.name },
    });
    const recalculated = await rebuildMastery(tx as unknown as Db, { trigger: "policy_change", now: input.now });
    return { policy: { id: row.id, version: row.version, name: row.name, organizationId: row.organizationId, config: row.config }, recalculated };
  });
}

// ───────────────────────────── Misconceptions ───────────────────────────────

/** Independent correct answers on the skill needed to change a hypothesis's status. */
export const MISCONCEPTION_RESOLUTION = { potentiallyResolvedAfter: 2, resolvedAfter: 4 } as const;

export async function recordMisconceptionSignal(
  db: Db,
  input: { userId: string; courseId: string; skillId: string; responseId: string; misconceptionId: string | null; evidence: Pick<EvidenceItem, "score" | "tryNumber" | "hintsUsed" | "solutionViewed" | "tutorUsed">; correctThreshold: number; now: Date },
): Promise<void> {
  const at = input.now.toISOString();

  if (input.misconceptionId) {
    const [known] = await db.select({ id: t.misconceptions.id }).from(t.misconceptions).where(eq(t.misconceptions.id, input.misconceptionId));
    if (!known) return;
    const [existing] = await db
      .select()
      .from(t.detectedMisconceptions)
      .where(and(eq(t.detectedMisconceptions.userId, input.userId), eq(t.detectedMisconceptions.misconceptionId, input.misconceptionId)));
    if (!existing) {
      await db.insert(t.detectedMisconceptions).values({
        userId: input.userId,
        courseId: input.courseId,
        skillId: input.skillId,
        misconceptionId: input.misconceptionId,
        detectionMethod: "answer_pattern_rule",
        status: "hypothesis",
        responseIds: [input.responseId],
        history: [{ at, status: "hypothesis", note: "First matching wrong answer" }],
        firstObservedAt: input.now,
        lastObservedAt: input.now,
      });
    } else {
      // A recurrence reopens anything that looked resolved; a teacher's confirmation is kept.
      const status: t.MisconceptionStatus = existing.status === "teacher_confirmed" ? "teacher_confirmed" : "hypothesis";
      const history = status !== existing.status ? [...existing.history, { at, status, note: "Observed again" }] : existing.history;
      await db
        .update(t.detectedMisconceptions)
        .set({ occurrences: existing.occurrences + 1, correctSinceLast: 0, status, responseIds: [...existing.responseIds, input.responseId].slice(-25), history, lastObservedAt: input.now })
        .where(eq(t.detectedMisconceptions.id, existing.id));
    }
    return;
  }

  // An unassisted correct answer on the skill is evidence against open hypotheses for it.
  const independentCorrect = input.evidence.score >= input.correctThreshold && isIndependent({ ...input.evidence } as EvidenceItem);
  if (!independentCorrect) return;
  const open = await db
    .select()
    .from(t.detectedMisconceptions)
    .where(and(eq(t.detectedMisconceptions.userId, input.userId), eq(t.detectedMisconceptions.skillId, input.skillId)));
  for (const m of open) {
    if (m.status === "resolved") continue;
    const correctSinceLast = m.correctSinceLast + 1;
    let status: t.MisconceptionStatus = m.status;
    if (correctSinceLast >= MISCONCEPTION_RESOLUTION.resolvedAfter) status = "resolved";
    else if (correctSinceLast >= MISCONCEPTION_RESOLUTION.potentiallyResolvedAfter && m.status === "hypothesis") status = "potentially_resolved";
    const history = status !== m.status ? [...m.history, { at, status, note: `${correctSinceLast} unassisted correct answers since last observed` }] : m.history;
    await db.update(t.detectedMisconceptions).set({ correctSinceLast, status, history }).where(eq(t.detectedMisconceptions.id, m.id));
  }
}
