/**
 * AP Physics 1: Algebra-Based — assembled from one file per unit.
 *
 * Each unit teaches through lessons and then puts the learning to work in
 * topic exercises (a fresh draw of questions each try), with quizzes partway
 * and a unit test at the end. Unit titles follow College Board's published
 * course outline (content/catalog/ap-catalog.json); topics, objectives,
 * lessons and questions are original AceAP content. OpenStax "College Physics
 * for AP Courses 2e" (CC BY 4.0) is used as a scope reference only — no text is
 * reproduced (see content/sources.ts).
 */
import { defineCourse } from "@/modules/content/schema";
import type { UnitPart } from "./shared";
import { unit1 } from "./unit-1";
import { unit2 } from "./unit-2";
import { unit3 } from "./unit-3";
import { unit4 } from "./unit-4";
import { unit5 } from "./unit-5";
import { unit6 } from "./unit-6";
import { unit7 } from "./unit-7";
import { unit8 } from "./unit-8";

const parts: UnitPart[] = [unit1, unit2, unit3, unit4, unit5, unit6, unit7, unit8];

export default defineCourse({
  courseId: "physics-1",
  version: {
    id: "physics-1@2025",
    label: "Aligned to the AP Physics 1: Algebra-Based course framework (current in 2025–26)",
    alignmentSourceUrl: "https://apcentral.collegeboard.org/courses/ap-physics-1",
    alignmentNotes:
      "Unit names match the published course outline. Topics, objectives, lessons, exercises and questions are original AceAP content written to address each unit; they do not reproduce College Board text. OpenStax College Physics for AP Courses (CC BY 4.0) informed topic scope only.",
  },
  provenance: {
    author: "AceAP curriculum team",
    origin: "ai_assisted_original",
    reviewedBy: "Automated answer validation; human subject-matter review pending",
    notes: "Every numeric answer and answer key is machine-checked by content:validate.",
  },
  units: parts.flatMap((p) => p.units),
  skills: parts.flatMap((p) => p.skills),
  misconceptions: parts.flatMap((p) => p.misconceptions),
  questions: parts.flatMap((p) => p.questions),
  assessments: parts.flatMap((p) => p.assessments),
  simulations: parts.flatMap((p) => p.simulations ?? []),
});
