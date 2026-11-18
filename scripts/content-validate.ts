/**
 * `npm run content:validate` — run authored courses through the validator.
 * With no arguments it checks every registered course; pass one or more
 * course file paths to check files that are not registered yet:
 *   npx tsx scripts/content-validate.ts content/courses/physics-1/index.ts
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateCourseContent } from "@/modules/content/validate";
import type { CourseContentInput } from "@/modules/content/schema";

async function load(): Promise<CourseContentInput[]> {
  const files = process.argv.slice(2);
  if (files.length === 0) return (await import("@content/index")).COURSE_CONTENT;
  const out: CourseContentInput[] = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(path.resolve(f)).href);
    out.push((mod.default?.default ?? mod.default) as CourseContentInput);
  }
  return out;
}

async function main() {
  let failed = false;
  for (const course of await load()) {
    const result = validateCourseContent(course);
    const errors = result.issues.filter((i) => i.level === "error");
    const warnings = result.issues.filter((i) => i.level === "warning");
    const c = result.content;
    const lessons = c ? c.units.flatMap((u) => u.topics.flatMap((t) => t.lessons)).length : 0;
    console.log(`\n${course.courseId}: ${errors.length ? "FAILED" : "ok"}` + (c ? ` — ${c.skills.length} skills, ${c.questions.length} questions, ${lessons} lessons, ${c.assessments.length} assessments` : ""));
    for (const chk of result.checks) console.log(`  ${chk.passed ? "✓" : "✗"} ${chk.name}${chk.detail ? ` (${chk.detail})` : ""}`);
    for (const i of errors) console.log(`  ERROR ${i.where}: ${i.message}`);
    for (const i of warnings) console.log(`  warn  ${i.where}: ${i.message}`);
    if (errors.length) failed = true;
  }
  process.exit(failed ? 1 : 0);
}
main();
