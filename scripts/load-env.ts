/**
 * Load .env.local and .env for CLI scripts (Next.js does this for the app).
 * Variables already set in the environment win, so test/CI overrides work.
 * Import this first in every script.
 */
import fs from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

for (const file of [".env.local", ".env"]) {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) continue;
  const parsed = parseEnv(fs.readFileSync(full, "utf8"));
  for (const [k, v] of Object.entries(parsed)) if (process.env[k] === undefined && typeof v === "string") process.env[k] = v;
}
