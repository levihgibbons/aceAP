/** `npm run content:sync` — validate authored content and publish it to the database. */
import "./load-env";
import { closeDatabase, getDb } from "@/db/client";
import { syncContent } from "@/modules/content/sync";

async function main() {
  const report = await syncContent(await getDb());
  console.log(`Catalog: ${report.courses} courses. Pilot courses published: ${report.pilotCourses.join(", ") || "none"}.`);
  console.log(`New lesson versions: ${report.newLessonVersions}. New question versions: ${report.newQuestionVersions}.`);
  for (const s of report.skipped) {
    console.log(`SKIPPED ${s.courseId} — validation errors:`);
    for (const i of s.issues) console.log(`  ${i.where}: ${i.message}`);
  }
  await closeDatabase();
  if (report.skipped.length) process.exit(1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
