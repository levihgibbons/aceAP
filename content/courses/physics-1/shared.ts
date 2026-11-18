/**
 * AP Physics 1 is authored one unit per file (unit-1.ts … unit-8.ts, each with
 * its own *.questions.ts). Every unit file exports a UnitPart; ./index.ts
 * merges them into the course. IDs are global across the course, so each unit
 * uses its own prefixes (see docs/CONTENT_PIPELINE.md, "AP Physics 1 layout").
 */
import type { CourseContentInput } from "@/modules/content/schema";

type C = CourseContentInput;

export interface UnitPart {
  units: C["units"];
  skills: C["skills"];
  misconceptions: NonNullable<C["misconceptions"]>;
  questions: C["questions"];
  assessments: NonNullable<C["assessments"]>;
  simulations?: NonNullable<C["simulations"]>;
}

export const emptyUnit = (): UnitPart => ({ units: [], skills: [], misconceptions: [], questions: [], assessments: [] });
