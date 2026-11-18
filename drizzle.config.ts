import { defineConfig } from "drizzle-kit";

// drizzle-kit is only used to *generate* SQL migrations from the schema.
// Migrations are applied by `npm run db:migrate` (src/db/migrate.ts), which
// works against both embedded PGlite and a real PostgreSQL server.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
