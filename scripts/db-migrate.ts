/** `npm run db:migrate` — apply SQL migrations (embedded PGlite or DATABASE_URL). */
import "./load-env";
import { closeDatabase, migrateDatabase } from "@/db/client";

migrateDatabase()
  .then(async () => {
    console.log("Migrations applied.");
    await closeDatabase();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
