/**
 * Demonstration C — mastery is evidence, not engagement.
 *
 *  1. Idle time is not active time. With Playwright's fake clock the lesson
 *     tab sits visible and untouched for 10 minutes; the browser meter's
 *     heartbeats (intercepted, so the server's wall-clock clamp doesn't mask
 *     the measurement) report ~10 min open but at most the 60 s inactivity
 *     threshold as active. One click makes time count again.
 *  2. Marking a lesson complete without answering its checks leaves its
 *     skills at "Not started".
 *
 * Uses a Physics 1 lesson: Alex has no Physics evidence, and no other spec
 * answers questions on these skills.
 */
import { expect, test, type Request } from "@playwright/test";
import { signInAs } from "./helpers/auth";

const LESSON = "physics-1.l.position-displacement";
const LESSON_TITLE = "Position, displacement and distance";
const LESSON_SKILLS = [
  { id: "physics-1.position-displacement", name: "Position and displacement" },
  { id: "physics-1.distance-vs-displacement", name: "Distance vs displacement" },
];

interface Beat {
  sessionId: string;
  openMs: number;
  activeMs: number;
}

const MIN = 60_000;
const IDLE_THRESHOLD_MS = 60_000;

test("Demo C1: a lesson left open and idle for 10 minutes records at most the 60 s threshold as active", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await signInAs(page, "alex");

  const beats: Beat[] = [];
  const onRequest = (req: Request) => {
    if (req.method() === "POST" && new URL(req.url()).pathname === "/api/activity/heartbeat")
      beats.push(req.postDataJSON() as Beat);
  };
  page.on("request", onRequest);
  const sum = (key: "openMs" | "activeMs", list = beats) => list.reduce((n, b) => n + b[key], 0);

  await page.clock.install();
  const session = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/activity/session" && r.request().method() === "POST",
  );
  await page.goto(`/app/learn/${LESSON}`);
  await expect(page.getByRole("heading", { level: 1, name: LESSON_TITLE })).toBeVisible();
  expect((await session).ok()).toBe(true);

  // Ten minutes pass with the tab visible and no interaction at all.
  await page.clock.runFor(10 * MIN);
  await expect
    .poll(() => sum("openMs"), { message: "open time reported by heartbeats" })
    .toBeGreaterThanOrEqual(9.5 * MIN);

  const idleOpen = sum("openMs");
  const idleActive = sum("activeMs");
  expect(beats.length).toBeGreaterThanOrEqual(35); // ~every 15 s
  expect(new Set(beats.map((b) => b.sessionId)).size).toBe(1);
  for (const b of beats) expect(b.activeMs).toBeLessThanOrEqual(b.openMs);
  // Active time stops one threshold after the last interaction (opening the page).
  expect(idleActive).toBeLessThanOrEqual(IDLE_THRESHOLD_MS + 2_000);
  expect(idleActive).toBeLessThan(idleOpen / 5);
  // After the first minute, every heartbeat is open-but-idle.
  const late = beats.slice(5);
  expect(sum("activeMs", late)).toBe(0);
  expect(sum("openMs", late)).toBeGreaterThan(8 * MIN);

  // A real interaction makes time count as active again.
  const before = beats.length;
  await page.getByRole("heading", { level: 1, name: LESSON_TITLE }).click();
  await page.clock.runFor(30_000);
  await expect.poll(() => beats.length).toBeGreaterThanOrEqual(before + 2);
  const last = beats[beats.length - 1];
  expect(last.activeMs).toBeGreaterThanOrEqual(14_000);
  expect(last.activeMs).toBeLessThanOrEqual(last.openMs);

  page.off("request", onRequest);
});

test("Demo C2: completing a lesson without answering its checks creates no mastery", async ({
  page,
}) => {
  await signInAs(page, "alex");
  await page.goto(`/app/learn/${LESSON}`);
  await expect(page.getByRole("heading", { level: 1, name: LESSON_TITLE })).toBeVisible();

  const skills = page.getByRole("region", { name: "Skills in this lesson" });
  for (const s of LESSON_SKILLS)
    await expect(skills.locator("li").filter({ hasText: s.name })).toContainText("Not started");

  // The checks are left untouched.
  await expect(
    page.locator("article").first().getByRole("button", { name: "Check answer" }),
  ).toBeVisible();

  const completion = page
    .locator("section")
    .filter({ has: page.locator("#lesson-complete-title") });
  await expect(completion.getByText(/doesn.t change your mastery/)).toBeVisible();
  await completion.getByRole("button", { name: "Mark lesson complete" }).click();
  await expect(
    completion.getByRole("heading", { name: "Lesson complete — nice work" }),
  ).toBeVisible();

  // Completion is recorded (and persists)…
  await page.reload();
  await expect(page.getByText("Completed", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "You've completed this lesson" })).toBeVisible();
  // …but the lesson's skills are still Not started.
  for (const s of LESSON_SKILLS)
    await expect(
      page
        .getByRole("region", { name: "Skills in this lesson" })
        .locator("li")
        .filter({ hasText: s.name }),
    ).toContainText("Not started");

  for (const s of LESSON_SKILLS) {
    await page.goto(`/app/skills/${s.id}`);
    await expect(page.getByRole("heading", { level: 1, name: s.name })).toBeVisible();
    const state = page.getByRole("region", { name: "Your current level" });
    await expect(state).toContainText("Not started");
    await expect(state).toContainText("You haven't answered a graded question on this skill yet");
    await expect(page.getByRole("region", { name: "The evidence behind this level" })).toHaveCount(
      0,
    );
  }
});
