/**
 * Server-only loaders for the learning runtime. Reads SHARED content only
 * (published lesson versions) with the trusted role; anything private to a
 * student goes through the domain services / asUser.
 */
import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import type { LessonBlock } from "@/modules/content/schema";
import { classAiPolicy } from "@/modules/assessments/service";
import { getTutorStatus } from "@/modules/ai/provider";
import { TUTOR_DISABLED_REASONS } from "@/modules/ai/tutor";
import type { TutorPanelProps } from "@/components/tutor/types";

const CONTENT_ID = /^[a-z0-9.-]{1,200}$/;

export interface PublishedLesson {
  lesson: typeof t.lessons.$inferSelect;
  version: number;
  blocks: LessonBlock[];
}

/** The version of a lesson students currently see, or null when it doesn't exist / isn't published. */
export async function loadPublishedLesson(lessonId: string): Promise<PublishedLesson | null> {
  if (!CONTENT_ID.test(lessonId)) return null;
  const db = await getDb();
  const [lesson] = await db.select().from(t.lessons).where(eq(t.lessons.id, lessonId));
  if (!lesson?.publishedVersion) return null;
  const [row] = await db
    .select({ blocks: t.lessonVersions.blocks })
    .from(t.lessonVersions)
    .where(and(eq(t.lessonVersions.lessonId, lessonId), eq(t.lessonVersions.version, lesson.publishedVersion)));
  if (!row) return null;
  return { lesson, version: lesson.publishedVersion, blocks: row.blocks };
}

/** A curriculum or teacher-built assessment row (shared content). */
export async function loadAssessment(assessmentId: string) {
  if (!CONTENT_ID.test(assessmentId)) return null;
  const db = await getDb();
  const [row] = await db.select().from(t.assessments).where(eq(t.assessments.id, assessmentId));
  return row ?? null;
}

export type TutorAvailability = TutorPanelProps["availability"];

/**
 * What the tutor panel should say, computed the same way the tutor service
 * decides: an attempt's own assistance setting wins; otherwise the student's
 * class policy for the course; then whether a provider is configured.
 */
export async function tutorAvailability(userId: string, courseId: string, attemptAssistance?: "allowed" | "hints_only" | "disabled"): Promise<TutorAvailability> {
  if (attemptAssistance === "disabled") return { status: "disabled", reason: TUTOR_DISABLED_REASONS.attemptDisabled };
  if (attemptAssistance === "hints_only") return { status: "disabled", reason: TUTOR_DISABLED_REASONS.attemptHintsOnly };
  if (!attemptAssistance) {
    const db = await getDb();
    const policy = await classAiPolicy(db, userId, courseId);
    if (policy === "disabled") return { status: "disabled", reason: TUTOR_DISABLED_REASONS.classDisabled };
    if (policy === "hints_only") return { status: "disabled", reason: TUTOR_DISABLED_REASONS.classHintsOnly };
  }
  return getTutorStatus().configured ? { status: "available" } : { status: "not_configured" };
}
