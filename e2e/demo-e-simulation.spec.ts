/**
 * Demonstration E — a native simulation inside a lesson. Changing the Motion
 * Lab's acceleration updates its readouts and graph labels; interacting
 * records only a simulation engagement event (never a response). Answering
 * the lab-based check question correctly then produces feedback with a
 * mastery update, and the skill now has evidence.
 */
import { expect, test, type Request } from "@playwright/test";
import { KE8 } from "./helpers/answers";
import { signInAs } from "./helpers/auth";
import { checkAnswer, dtValue, enterAnswer, identify, questionCard } from "./helpers/ui";

const LESSON = "physics-1.l.kinematic-equations";
const LESSON_TITLE = "The constant-acceleration equations";
const SKILL = { id: "physics-1.kinematic-equations", name: "Constant-acceleration equations" };

test("Demo E: the Motion Lab responds to the acceleration slider, and only the answer creates evidence", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signInAs(page, "alex");

  const writes: Request[] = [];
  page.on("request", (req) => {
    const path = new URL(req.url()).pathname;
    if (
      req.method() !== "GET" &&
      path.startsWith("/api/") &&
      !path.startsWith("/api/activity/heartbeat") &&
      path !== "/api/activity/session"
    )
      writes.push(req);
  });
  const paths = () => writes.map((r) => new URL(r.url()).pathname);

  await page.goto(`/app/learn/${LESSON}`);
  await expect(page.getByRole("heading", { level: 1, name: LESSON_TITLE })).toBeVisible();
  const skills = page.getByRole("region", { name: "Skills in this lesson" });
  await expect(skills.locator("li").filter({ hasText: SKILL.name })).toContainText("Not started");

  // The lesson's own lab block ("Predict, then check": x0 = 4 m, v0 = −6 m/s, a = 1.5 m/s², 8 s).
  const block = page.getByRole("region", { name: "Predict, then check" });
  const lab = block.getByRole("region", { name: "Motion Lab" });
  const accel = lab.getByLabel("Acceleration a");
  await expect(accel).toBeVisible(); // the lab is a client-only dynamic import
  await expect(accel).toHaveValue("1.5");

  await test.step("move the clock to the end of the run, then change the acceleration", async () => {
    const simEvent = page.waitForRequest(
      (r) => new URL(r.url()).pathname === "/api/activity/simulation",
    );
    await lab.getByLabel("Time t").focus();
    await page.keyboard.press("End");
    await expect(dtValue(lab, "Time t")).toHaveText("8.00 s");
    // v = v0 + a·t = −6 + 1.5·8 = 6 m/s;  x = 4 − 6·8 + ½·1.5·64 = 4 m.
    await expect(dtValue(lab, "Velocity v")).toHaveText("6.00 m/s");
    await expect(dtValue(lab, "Position x")).toHaveText("4.00 m");

    const req = await simEvent;
    expect(req.postDataJSON()).toEqual({ simId: "motion-lab", lessonId: LESSON });

    await accel.focus();
    await page.keyboard.press("ArrowRight"); // step 0.25 → a = 1.75 m/s²
    await expect(accel).toHaveValue("1.75");
    await expect(lab.getByText("1.75 m/s²", { exact: true })).toBeVisible();
    // v = −6 + 1.75·8 = 8 m/s;  x = 4 − 48 + ½·1.75·64 = 12 m.
    await expect(dtValue(lab, "Velocity v")).toHaveText("8.00 m/s");
    await expect(dtValue(lab, "Position x")).toHaveText("12.00 m");
    // The graph labels follow the readouts.
    await expect(
      lab
        .locator("svg text")
        .filter({ hasText: /^8\.00 m\/s$/ })
        .first(),
    ).toBeAttached();
    await expect(
      lab
        .locator("svg text")
        .filter({ hasText: /^12\.00 m$/ })
        .first(),
    ).toBeAttached();
  });

  await test.step("interacting produced only a simulation engagement event — no response submission", async () => {
    expect(paths().every((p) => p === "/api/activity/simulation")).toBe(true);
    expect(paths()).toContain("/api/activity/simulation");
    expect(paths().some((p) => p.includes("/responses"))).toBe(false);
    // Exploring didn't change the skill.
    await expect(skills.locator("li").filter({ hasText: SKILL.name })).toContainText("Not started");
  });

  await test.step("answer the lab-based check (turnaround time) correctly and see a mastery update", async () => {
    const card = questionCard(page, "Use the Motion Lab to find a turnaround");
    expect((await identify(card, [KE8])).id).toBe(KE8.id);
    await enterAnswer(card, KE8.key.type, KE8.key.correct);
    const responsePosted = page.waitForResponse((r) =>
      /\/api\/attempts\/[^/]+\/responses$/.test(new URL(r.url()).pathname),
    );
    const feedback = await checkAnswer(card);
    expect((await responsePosted).ok()).toBe(true);
    await expect(feedback).toHaveAccessibleName("Correct");
    await expect(feedback).toContainText("Mastery update");
    await expect(feedback).toContainText(SKILL.name);
    await expect(feedback).toContainText(/Not started.*Developing/);
    expect(paths().filter((p) => p.includes("/responses"))).toHaveLength(1);
  });

  await test.step("the skill page now shows evidence", async () => {
    await page.goto(`/app/skills/${SKILL.id}`);
    const state = page.getByRole("region", { name: "Your current level" });
    await expect(state).not.toContainText("Not started");
    await expect(
      dtValue(
        page.getByRole("region", { name: "The evidence behind this level" }),
        "Graded answers",
      ),
    ).toHaveText("1");
  });
});
