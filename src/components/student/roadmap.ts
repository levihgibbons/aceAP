/**
 * Course roadmap helpers shared by My courses, the course page, the unit page
 * and the lesson page: lesson numbering ("3.2" = unit 3, lesson 2) and the
 * single "up next" step on the guided path.
 */
import type { CourseTree, LessonNode, UnitNode } from "@/modules/curriculum/queries";
import type { CourseOverview } from "@/modules/learning/overview";
import { unitLessons } from "@/modules/curriculum/path";

export { unitLessons, unitPath, type PathItem, type PathSection } from "@/modules/curriculum/path";

type ProgressLike = Pick<CourseOverview, "lessonProgress">;


/** "3.2" for the second lesson of unit 3. */
export function lessonNumber(tree: CourseTree, lessonId: string): string | null {
  const lesson = tree.lessons.get(lessonId);
  const unit = lesson ? tree.units.find((u) => u.id === lesson.unitId) : undefined;
  if (!lesson || !unit) return null;
  const index = unitLessons(tree, unit.id).findIndex((l) => l.id === lessonId);
  return index < 0 ? null : `${unit.number}.${index + 1}`;
}

export interface NextStep {
  lesson: LessonNode;
  unit: UnitNode;
  number: string;
  /** start: nothing opened yet · resume: this lesson is open · next: earlier lessons finished · done: every lesson finished. */
  mode: "start" | "resume" | "next" | "done";
  finished: number;
  total: number;
}

/** The one lesson the guided path points to now (an open lesson first, then the first unfinished one). */
export function nextStepFor(tree: CourseTree, o: ProgressLike): NextStep | null {
  if (tree.lessonOrder.length === 0) return null;
  const status = (id: string) => o.lessonProgress.get(id)?.status;
  const finished = tree.lessonOrder.filter((id) => status(id) === "completed").length;
  const open = tree.lessonOrder.find((id) => status(id) === "in_progress");
  const unfinished = tree.lessonOrder.find((id) => status(id) !== "completed");
  const id = open ?? unfinished ?? tree.lessonOrder[tree.lessonOrder.length - 1];
  const lesson = tree.lessons.get(id)!;
  const unit = tree.units.find((u) => u.id === lesson.unitId)!;
  const mode: NextStep["mode"] = open ? "resume" : !unfinished ? "done" : finished === 0 && o.lessonProgress.size === 0 ? "start" : "next";
  return { lesson, unit, number: lessonNumber(tree, id) ?? "", mode, finished, total: tree.lessonOrder.length };
}

export const NEXT_STEP_ACTION: Record<NextStep["mode"], string> = {
  start: "Start lesson",
  resume: "Resume lesson",
  next: "Start lesson",
  done: "Review lesson",
};

export const NEXT_STEP_EYEBROW: Record<NextStep["mode"], string> = {
  start: "Start here",
  resume: "Pick up where you left off",
  next: "Up next",
  done: "Every lesson finished",
};

