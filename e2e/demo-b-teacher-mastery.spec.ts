/**
 * Demonstration B — a teacher reads mastery evidence and acts on it:
 * class → heatmap → CALC-3.B cell for Riley (drawer with attempts and a
 * misconception) → Riley's profile → skill evidence page with the actual
 * responses → targeted practice assigned to Riley only → Riley sees it,
 * a classmate (Avery) does not.
 *
 * Relies on the seeded history (Riley struggles with the chain rule).
 */
import { expect, test } from "@playwright/test";
import { SKILLS } from "./helpers/answers";
import { ACCOUNTS, signInAs } from "./helpers/auth";

test.describe.configure({ mode: "serial" });

const CLASS_NAME = "AP Calculus AB — Period 2";
const ASSIGNMENT_TITLE = "E2E targeted practice: powers of functions (Riley)";

test("Demo B: teacher drills into Riley's chain-rule evidence and assigns targeted practice", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const riley = ACCOUNTS.riley.name;

  await signInAs(page, "teacher");

  await test.step("open the Calculus class and its mastery heatmap", async () => {
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Classes", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/teacher\/classes$/);
    await page.getByRole("link", { name: CLASS_NAME, exact: true }).click();
    await expect(page).toHaveURL(/\/teacher\/classes\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(CLASS_NAME);
    await page.getByRole("link", { name: "Mastery", exact: true }).click();
    await expect(page).toHaveURL(/\/teacher\/classes\/[0-9a-f-]+\/mastery$/);
    await expect(page.getByRole("heading", { level: 1, name: "Mastery heatmap" })).toBeVisible();
  });

  await test.step("find the CALC-3.B column and open Riley's cell", async () => {
    const heatmap = page.getByRole("region", { name: "Mastery heatmap (scrolls horizontally)" });
    await expect(heatmap.getByRole("columnheader", { name: /^Unit 3 CALC-3\.B\b/ })).toBeVisible();
    const cell = heatmap.getByRole("button", {
      name: new RegExp(`^${riley}, objective CALC-3\\.B: `),
    });
    await expect(cell).toBeVisible();
    // Riley has evidence on this objective (it is not an empty, dashed cell).
    await expect(cell).not.toHaveAccessibleName(/no evidence yet/);
    await cell.click();

    const drawer = page.getByRole("dialog", { name: `${riley} · CALC-3.B` });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("region", { name: "Skills in this objective" })).toBeVisible();
    // The actual attempts behind the level…
    const responses = drawer.getByRole("region", {
      name: `Responses for ${SKILLS.chainPolynomial.name}`,
    });
    await expect(responses).toBeVisible();
    await expect(responses.getByText("Student answer").first()).toBeVisible();
    await expect(responses.getByText("Correct answer").first()).toBeVisible();
    // …and the misconception they point to.
    const misconceptions = drawer.getByRole("region", {
      name: `Misconceptions for ${SKILLS.chainPolynomial.name}`,
    });
    await expect(misconceptions).toContainText("Omitted the derivative of the inner function");
    await expect(misconceptions).toContainText("Possible misconception");
    await expect(drawer.getByRole("link", { name: "Assign targeted practice" })).toBeVisible();

    await drawer.getByRole("link", { name: `Open ${riley}'s profile` }).click();
  });

  await test.step("Riley's profile and the skill evidence page show the real attempts", async () => {
    await expect(page).toHaveURL(/\/teacher\/students\/[0-9a-f-]+/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(riley);
    await expect(page.getByRole("heading", { name: "Mastery by objective" })).toBeVisible();
    await page.locator(`a[href*="/skills/${SKILLS.chainPolynomial.id}"]`).first().click();

    await expect(page).toHaveURL(
      new RegExp(`/skills/${SKILLS.chainPolynomial.id.replace(".", "\\.")}`),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: SKILLS.chainPolynomial.name }),
    ).toBeVisible();
    const sufficiency = page.getByRole("region", {
      name: `Evidence sufficiency for ${SKILLS.chainPolynomial.name}`,
    });
    await expect(sufficiency).toContainText(/Answers graded\s*\d+ of \d+ correct/);
    const responses = page.getByRole("region", {
      name: `Responses for ${SKILLS.chainPolynomial.name}`,
    });
    await expect(responses.getByRole("heading", { name: /^Responses/ })).toBeVisible();
    expect(await responses.locator("ol > li").count()).toBeGreaterThan(3);
    await expect(responses.getByText("Matched error").first()).toBeVisible();
    await expect(responses).toContainText("Omitted the derivative of the inner function");
  });

  await test.step("assign targeted practice to Riley only", async () => {
    await page.getByRole("link", { name: "Assign targeted practice" }).first().click();
    await expect(page).toHaveURL(/\/teacher\/assignments\/new\?/);
    await expect(page.getByRole("heading", { level: 1, name: "New assignment" })).toBeVisible();

    // Prefilled from the evidence page: the skill and Riley are selected, whole class is off.
    await expect(page.getByLabel(SKILLS.chainPolynomial.name, { exact: true })).toBeChecked();
    const whole = page.getByRole("radio", { name: /Whole class/ });
    const selected = page.getByRole("radio", { name: /Selected students/ });
    if (await whole.isChecked()) await selected.check();
    await expect(whole).not.toBeChecked();
    await expect(selected).toBeChecked();
    const rileyBox = page.getByRole("checkbox", { name: riley, exact: true });
    if (!(await rileyBox.isChecked())) await rileyBox.check();
    await expect(rileyBox).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: ACCOUNTS.avery.name, exact: true }),
    ).not.toBeChecked();
    await expect(page.getByText("Assigned to 1 student", { exact: true })).toBeVisible();

    await page.getByLabel("Title").fill(ASSIGNMENT_TITLE);
    await page.getByRole("button", { name: "Assign", exact: true }).click();
    await page.waitForURL(/\/teacher\/assignments\/[0-9a-f-]+\?created=1/);
    await expect(page.getByRole("heading", { level: 1, name: ASSIGNMENT_TITLE })).toBeVisible();
  });

  await test.step("Riley sees the assignment", async () => {
    await signInAs(page, "riley");
    await page.goto("/app/assignments");
    await expect(page.getByRole("heading", { level: 1, name: "Assignments" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: new RegExp(ASSIGNMENT_TITLE.replace(/[().:]/g, "\\$&")) }),
    ).toBeVisible();
  });

  await test.step("a classmate (Avery) does not", async () => {
    await signInAs(page, "avery");
    await page.goto("/app/assignments");
    await expect(page.getByRole("heading", { level: 1, name: "Assignments" })).toBeVisible();
    // Avery does see whole-class work, so the page is populated — just not Riley's targeted set.
    await expect(page.getByText("Chain rule quiz").first()).toBeVisible();
    await expect(page.getByText(ASSIGNMENT_TITLE)).toHaveCount(0);
  });
});
