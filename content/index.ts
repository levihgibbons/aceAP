/**
 * Authored content registry. Adding a course = add its file here; no
 * application code changes are needed (see docs/CONTENT_PIPELINE.md).
 */
import type { CourseContentInput } from "@/modules/content/schema";
import catalogJson from "./catalog/ap-catalog.json";
import calculusAb from "./courses/calculus-ab";
import physics1 from "./courses/physics-1";
import microeconomics from "./courses/microeconomics";

export const COURSE_CONTENT: CourseContentInput[] = [calculusAb, microeconomics, physics1];

export interface CatalogCourse {
  id: string;
  name: string;
  category: string;
  availability: "active" | "upcoming";
  availabilityNote: string | null;
  sourceUrl: string;
  description: string;
  outlineVerified: boolean;
  units: { number: number; title: string }[];
}

export interface Catalog {
  schemaVersion: number;
  verifiedOn: string;
  indexSourceUrl: string;
  notes: string;
  courses: CatalogCourse[];
}

export const CATALOG = catalogJson as Catalog;

export const CATEGORY_LABELS: Record<string, string> = {
  arts: "Arts",
  english: "English",
  "history-social-science": "History and Social Sciences",
  "math-cs": "Mathematics and Computer Science",
  sciences: "Sciences",
  "world-languages": "World Languages and Cultures",
  capstone: "AP Capstone",
  "career-kickstart": "AP Career Kickstart",
};
export const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS);
