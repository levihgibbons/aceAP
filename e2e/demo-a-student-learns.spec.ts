/**
 * Demonstration A — a student learns the chain rule and the evidence moves
 * their mastery: lesson (worked example + checks with accurate feedback) →
 * quiz (drafts, confirm, results) → skill page with an evidence-backed level
 * that persists → a home recommendation with a reason.
 *
 * Alex Morgan is seeded with NO chain-rule evidence.
 */
import { expect, test } from "@playwright/test";
import { CHAIN_QUIZ, CP1, CP2, SKILLS } from "./helpers/answers";
import { signInAs } from "./helpers/auth";
import {
  checkAnswer,
  dtValue,
  enterAnswer,
  identify,
  questionCard,
  sectionByHeading,
  statTile,
} from "./helpers/ui";

test.describe.configure({ mode: "serial" });

test("Demo A: Alex learns the chain rule and mastery moves with evidence", async ({ page }) => {
  test.setTimeout(180_000);
  await signInAs(page, "alex");

  await test.step("open AP Calculus AB from home and click through to the chain-rule lesson", async () => {
    await page
      .locator("#my-courses")
      .getByRole("link", { name: "AP Calculus AB", exact: true })
      .click();
    await expect(page).toHaveURL(/\/app\/courses\/calculus-ab$/);
    await expect(page.getByRole("heading", { level: 1, name: "AP Calculus AB" })).toBeVisible();
    await page.locator('a[href="/app/learn/calculus-ab.l.chain-rule"]').first().click();
    await expect(page).toHaveURL(/\/app\/learn\/calculus-ab\.l\.chain-rule$/);
    await expect(page.getByRole("heading", { level: 1, name: "The chain rule" })).toBeVisible();
    // Before any answer the lesson's skill reads Not started.
    const skills = page.getByRole("region", { name: "Skills in this lesson" });
    await expect(skills).toContainText(SKILLS.chainPolynomial.name);
    await expect(skills).toContainText("Not started");
  });

  await test.step("reveal a worked-example step", async () => {
    const example = page.getByRole("region", { name: "A power of a polynomial" });
    await expect(example.getByText("0 of 5 steps shown")).toBeVisible();
    await example.getByRole("button", { name: "Show first step" }).click();
    await expect(example.getByText("1 of 5 steps shown")).toBeVisible();
    await expect(example.getByText("Name the layers")).toBeVisible();
    await example.getByRole("button", { name: "Show next step" }).click();
    await expect(example.getByText("Differentiate the outside")).toBeVisible();
    await expect(example.getByText("2 of 5 steps shown")).toBeVisible();
  });

  await test.step("answer check cp-1 correctly and see accurate feedback with a mastery update", async () => {
    const card = questionCard(page, "Check for understanding 1 of 2");
    expect((await identify(card, [CP1, CP2])).id).toBe(CP1.id);
    await enterAnswer(card, CP1.key.type, CP1.key.correct);
    const feedback = await checkAnswer(card);
    await expect(feedback).toHaveAccessibleName("Correct");
    await expect(card.getByText("Correct", { exact: true }).first()).toBeVisible();
    await expect(feedback).toContainText("Mastery update");
    await expect(feedback).toContainText(SKILLS.chainPolynomial.name);
    await expect(feedback).toContainText(/Not started\s*to\s*Developing|Not started.*Developing/);
    // A correct first try doesn't offer a retry.
    await expect(card.getByRole("button", { name: "Try again" })).toHaveCount(0);
  });

  await test.step("answer check cp-2 wrongly and see feedback naming the misconception", async () => {
    const card = questionCard(page, "Check for understanding 2 of 2");
    expect((await identify(card, [CP1, CP2])).id).toBe(CP2.id);
    await enterAnswer(card, CP2.key.type, CP2.key.wrong!.value);
    const feedback = await checkAnswer(card);
    await expect(feedback).toHaveAccessibleName("Not quite");
    await expect(feedback).toContainText(`Possible misconception: ${CP2.key.wrong!.misconception}`);
    await expect(feedback).toContainText("Multiply by the derivative of the inside");
    await expect(card.getByText("Incorrect", { exact: true })).toBeVisible();
    await expect(card.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  let attemptUrl = "";
  await test.step("take the chain-rule quiz: answers save as drafts, submit through the confirm dialog", async () => {
    await page.goto("/app/assessments/calculus-ab.quiz.chain");
    await expect(
      page.getByRole("heading", { level: 1, name: "Quiz: the chain rule" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await page.waitForURL(/\/app\/attempts\/[0-9a-f-]+$/);
    attemptUrl = page.url();
    await expect(page.getByText("0 of 6 answered", { exact: true })).toBeVisible();

    const seen = new Set<string>();
    for (let i = 1; i <= 6; i++) {
      const card = questionCard(page, `Question ${i} of 6`);
      await expect(card).toBeVisible();
      const q = await identify(card, CHAIN_QUIZ);
      seen.add(q.id);
      // ci-2 is answered with its authored wrong answer (g'(1) instead of g'(3)); the rest correctly.
      const value = q.id === "calculus-ab.q.ci-2" ? q.key.wrong!.value : q.key.correct;
      await enterAnswer(card, q.key.type, value);
      await expect(card.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible();
      await expect(card.getByText("Answered", { exact: true })).toBeVisible();
      // No feedback before submitting.
      await expect(card.getByRole("group", { name: /^(Correct|Not quite)/ })).toHaveCount(0);
      if (i < 6) await page.getByRole("button", { name: "Next question" }).click();
    }
    expect(seen.size).toBe(6);
    await expect(page.getByText("6 of 6 answered", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Review answers" }).click();
    await expect(page.getByRole("heading", { name: "Review your answers" })).toBeVisible();
    await expect(page.getByText("Every question has a saved answer.")).toBeVisible();
    await page.getByRole("button", { name: "Submit answers" }).click();
    const dialog = page.getByRole("dialog", { name: "Submit your answers?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Submit", exact: true }).click();
  });

  await test.step("results show the score and mastery changes", async () => {
    await expect(page.getByText("Submitted", { exact: true }).first()).toBeVisible();
    await expect(statTile(page, "Score")).toHaveText("5 / 6");
    await expect(statTile(page, "Answered")).toHaveText("6 / 6");
    const changes = sectionByHeading(page, "Mastery changes");
    await expect(changes.getByRole("link", { name: SKILLS.chainPolynomial.name })).toBeVisible();
    await expect(changes).toContainText("Chain rule: trigonometric functions");
    // The wrong table answer is flagged as a misconception pattern.
    await expect(sectionByHeading(page, "Patterns worth fixing")).toContainText(
      CHAIN_QUIZ[5].key.wrong!.misconception,
    );
    // Reloading the attempt keeps the results (it's submitted, not re-openable).
    await page.goto(attemptUrl);
    await expect(statTile(page, "Score")).toHaveText("5 / 6");
  });

  let levelText = "";
  await test.step("the skill page shows an evidence-backed level with explanation counts", async () => {
    await sectionByHeading(page, "Mastery changes")
      .getByRole("link", { name: SKILLS.chainPolynomial.name })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/app/skills/${SKILLS.chainPolynomial.id.replace(".", "\\.")}$`),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: SKILLS.chainPolynomial.name }),
    ).toBeVisible();
    const state = page.getByRole("region", { name: "Your current level" });
    await expect(state).toBeVisible();
    await expect(state).not.toContainText("Not started");
    levelText = (await state.locator("span.rounded-full").first().innerText()).trim();
    expect(levelText).toMatch(/Developing|Approaching mastery|Proficient/);

    const evidence = page.getByRole("region", { name: "The evidence behind this level" });
    // cp-1 (correct), cp-2 (wrong) in the lesson, cp-4 (correct) in the quiz.
    await expect(dtValue(evidence, "Graded answers")).toHaveText("3");
    await expect(dtValue(evidence, "Correct without help")).toHaveText("2 of 3");
    await expect(dtValue(evidence, "Correct on a quiz or test")).toHaveText("1");
    await expect(page.getByRole("heading", { name: "Graded answers" })).toBeVisible();
  });

  await test.step("the level persists across a reload", async () => {
    await page.reload();
    const state = page.getByRole("region", { name: "Your current level" });
    await expect(state.locator("span.rounded-full").first()).toHaveText(levelText);
    await expect(
      dtValue(
        page.getByRole("region", { name: "The evidence behind this level" }),
        "Graded answers",
      ),
    ).toHaveText("3");
  });

  await test.step("home shows a recommendation with its reason", async () => {
    await page.goto("/app");
    const today = page.locator("#today");
    await expect(today.getByRole("heading", { name: "Today's learning" })).toBeVisible();
    const first = today.locator("ol > li").first();
    await expect(first).toBeVisible();
    await expect(first.getByRole("heading")).not.toBeEmpty();
    const reason = first.locator("p").filter({ hasText: "Why:" });
    await expect(reason).toBeVisible();
    expect(((await reason.innerText()) ?? "").trim().length).toBeGreaterThan(15);
    await expect(first.getByRole("link").last()).toBeVisible();
  });
});
