/**
 * The guided path through a unit, shared by the student roadmap and the
 * teacher "Lessons & practice" report: each topic's lessons (numbered by unit,
 * e.g. 3.2) followed by that topic's exercises and quizzes, then unit-level
 * checks such as the unit test.
 */
import type { CourseTree, LessonNode, UnitNode } from "./queries";

/** Lessons of one unit in guided-path order. */
export function unitLessons(tree: CourseTree, unitId: string): LessonNode[] {
  return tree.lessonOrder.map((id) => tree.lessons.get(id)!).filter((l) => l && l.unitId === unitId);
}

export type PathItem =
  | { type: "lesson"; lesson: LessonNode; number: string }
  | { type: "assessment"; assessment: CourseTree["assessments"][number] };

export interface PathSection {
  /** null for the unit-level checks at the end (unit test, etc.). */
  topic: UnitNode["topics"][number] | null;
  items: PathItem[];
}

export function unitPath(tree: CourseTree, unit: UnitNode): PathSection[] {
  const lessons = unitLessons(tree, unit.id);
  const numberOf = new Map(lessons.map((l, i) => [l.id, `${unit.number}.${i + 1}`]));
  const sections: PathSection[] = unit.topics.map((topic) => ({
    topic,
    items: [
      ...lessons.filter((l) => l.topicId === topic.id).map((l) => ({ type: "lesson" as const, lesson: l, number: numberOf.get(l.id)! })),
      ...unit.assessments.filter((a) => a.topicId === topic.id).map((a) => ({ type: "assessment" as const, assessment: a })),
    ],
  }));
  const unitLevel = unit.assessments.filter((a) => !a.topicId || !unit.topics.some((t) => t.id === a.topicId));
  if (unitLevel.length) sections.push({ topic: null, items: unitLevel.map((a) => ({ type: "assessment" as const, assessment: a })) });
  return sections.filter((s) => s.items.length > 0);
}
