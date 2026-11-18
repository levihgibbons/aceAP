/**
 * Derived display status for lessons in the student UI. Mastery comes from
 * the lesson's skills (rolled up conservatively, untested = Not started);
 * lesson progress only distinguishes "not opened" from "in progress".
 */
import type { LessonNode } from "@/modules/curriculum/queries";
import type { CourseOverview } from "@/modules/learning/overview";
import { rollup, studentStatus, type StudentStatus } from "@/modules/mastery/aggregation";

type OverviewLike = Pick<CourseOverview, "states" | "lessonProgress">;

export function lessonStatusFor(
  lesson: Pick<LessonNode, "id" | "skillIds">,
  o: OverviewLike,
): StudentStatus {
  const lite = new Map(
    lesson.skillIds.flatMap((id) => {
      const s = o.states.get(id);
      return s
        ? [
            [
              id,
              { skillId: id, level: s.level, estimate: s.estimate, needsReview: s.needsReview },
            ] as const,
          ]
        : [];
    }),
  );
  const r = rollup(lesson.skillIds, lite);
  const status = studentStatus(r.level, r.needsReview > 0);
  if (status === "not_started" && o.lessonProgress.has(lesson.id)) return "in_progress";
  return status;
}

/** "Finished" / "Started" / null — reading progress, kept separate from mastery. */
export function lessonReadingLabel(lessonId: string, o: OverviewLike): string | null {
  const p = o.lessonProgress.get(lessonId);
  if (!p) return null;
  return p.status === "completed" ? "Finished" : "Started";
}
