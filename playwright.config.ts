import { defineConfig, devices } from "@playwright/test";

/**
 * Browser end-to-end tests against a production build with a freshly seeded,
 * isolated embedded database (.data/e2e). Run `npm run build:e2e` first, then
 * `npm run test:e2e`.
 * Uses the locally installed Google Chrome (channel "chrome"); set
 * PW_CHANNEL="" to use Playwright's bundled Chromium after `npx playwright install chromium`.
 */
const PORT = Number(process.env.E2E_PORT ?? 3200);
// Overridable so several suites can run side by side without sharing a build or database.
const DIST_DIR = process.env.E2E_DIST_DIR ?? ".next-e2e";
const DATA_DIR = process.env.E2E_DATA_DIR ?? ".data/e2e";
const channel = process.env.PW_CHANNEL ?? "chrome";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // The production build registers /sw.js; block it so network assertions
    // (page.waitForRequest/route) always see the page's own requests.
    serviceWorkers: "block",
    ...(channel ? { channel } : {}),
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], ...(channel ? { channel } : {}) } },
  ],
  webServer: {
    command: `npx tsx scripts/seed.ts --reset && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 240_000,
    reuseExistingServer: false,
    stdout: "pipe",
    env: {
      ACEAP_DATA_DIR: DATA_DIR,
      NEXT_DIST_DIR: DIST_DIR,
      ACEAP_INSECURE_COOKIES: "1",
      ACEAP_DEMO_LOGIN: "1",
      DATABASE_URL: "",
      AI_PROVIDER: "none",
      // Dev email outbox in this production build, so e2e/account.spec.ts can
      // read reset links at /dev/outbox. Test-only — never set in a deployment.
      ACEAP_DEV_OUTBOX: "1",
      EMAIL_PROVIDER: "outbox",
    },
  },
});
