/**
 * Print session cookies for demo accounts, for curl-based page checks:
 *   ACEAP_DATA_DIR=.data/x npx tsx scripts/dev-session.ts student@demo.aceap.test teacher@demo.aceap.test
 * Prints: <email> aceap_session=<token>
 * Run it while the dev server for that data dir is STOPPED (PGlite is single-process).
 * Development helper only — refuses to run when NODE_ENV=production.
 */
import "./load-env";
import { sql } from "drizzle-orm";
import { closeDatabase, getDb } from "@/db/client";
import * as t from "@/db/schema";
import { createSession } from "@/modules/auth/service";

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("dev-session is a development helper.");
  const db = await getDb();
  for (const email of process.argv.slice(2)) {
    const [u] = await db.select({ id: t.users.id, isDemo: t.users.isDemo }).from(t.users).where(sql`lower(${t.users.email}) = ${email.toLowerCase()}`);
    if (!u?.isDemo) {
      console.log(`${email} NOT_FOUND_OR_NOT_DEMO`);
      continue;
    }
    const { token } = await createSession(u.id);
    console.log(`${email} aceap_session=${token}`);
  }
  await closeDatabase();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
