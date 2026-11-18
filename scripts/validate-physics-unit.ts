/**
 * Validate ONE AP Physics 1 unit file on its own, so a unit can be checked
 * while other unit files are still being written:
 *   npx tsx scripts/validate-physics-unit.ts 3
 *
 * Builds a course from that unit alone and runs the full content validator
 * (schema, references, every answer key through the real grader, KaTeX,
 * coverage, exercise rules). Prerequisites that point at skills in OTHER units
 * are listed and dropped for this check only; the full course validation
 * (`npm run content:validate`) checks them for real.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateCourseContent } from "@/modules/content/validate";
import type { UnitPart } from "../content/courses/physics-1/shared";

async function main() {
  const n = Number(process.argv[2]);
  if (!Number.isInteger(n) || n < 1 || n > 8) throw new Error("Usage: npx tsx scripts/validate-physics-unit.ts <1-8>");
  const file = path.resolve(`content/courses/physics-1/unit-${n}.ts`);
  const mod = await import(pathToFileURL(file).href);
  const part = (mod[`unit${n}`] ?? mod.default?.[`unit${n}`]) as UnitPart | undefined;
  if (!part) throw new Error(`${file} does not export unit${n}`);

  const own = new Set(part.skills.map((s) => s.id));
  const crossUnit = new Set<string>();
  const skills = part.skills.map((s) => {
    const prerequisites = (s.prerequisites ?? []).filter((p) => {
      if (own.has(p)) return true;
      crossUnit.add(p);
      return false;
    });
    return { ...s, prerequisites };
  });

  const result = validateCourseContent({
    courseId: "physics-1",
    version: { id: "physics-1@unit-check", label: "unit check", alignmentSourceUrl: "https://apcentral.collegeboard.org/courses/ap-physics-1", alignmentNotes: "unit check" },
    provenance: { author: "unit check", origin: "ai_assisted_original" },
    units: part.units,
    skills,
    misconceptions: part.misconceptions,
    questions: part.questions,
    assessments: part.assessments,
    simulations: part.simulations ?? [],
  });

  const errors = result.issues.filter((i) => i.level === "error");
  const warnings = result.issues.filter((i) => i.level === "warning");
  const c = result.content;
  const lessons = c ? c.units.flatMap((u) => u.topics.flatMap((t) => t.lessons)).length : 0;
  const exercises = c ? c.assessments.filter((a) => a.kind === "exercise").length : 0;
  console.log(
    `physics-1 unit ${n}: ${errors.length ? "FAILED" : "ok"}` +
      (c ? ` — ${c.skills.length} skills, ${c.questions.length} questions, ${lessons} lessons, ${exercises} exercises, ${c.assessments.length} assessments` : ""),
  );
  for (const chk of result.checks) console.log(`  ${chk.passed ? "✓" : "✗"} ${chk.name}${chk.detail ? ` (${chk.detail})` : ""}`);
  if (crossUnit.size) console.log(`  info  cross-unit prerequisites (checked in the full course): ${[...crossUnit].join(", ")}`);
  for (const i of errors) console.log(`  ERROR ${i.where}: ${i.message}`);
  for (const i of warnings) console.log(`  warn  ${i.where}: ${i.message}`);
  process.exit(errors.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
