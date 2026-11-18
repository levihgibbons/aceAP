import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src"), "@content": path.resolve(import.meta.dirname, "content") } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Every test file gets its own in-memory embedded Postgres.
    env: { ACEAP_DATA_DIR: "memory", DATABASE_URL: "" },
  },
});
