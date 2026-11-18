/**
 * Demonstration F — the grade is derived from mastery through a configurable
 * policy; changing the policy changes grades but never the evidence.
 * Gradebook (mastery-graded targeted practice) → grading policy → change one
 * level→grade mapping → live preview → publish (confirm) → gradebook shows the
 * new value → Riley's evidence is unchanged.
 */
import { expect, test, type Page } from "@playwright/test";
import { SKILLS } from "./helpers/answers";
import { ACCOUNTS, signInAs } from "./helpers/auth";

test.describe.configure({ mode: "serial" });

const CLASS_NAME = "AP Calculus AB — Period 2";
const ASSIGNMENT = "Targeted practice: chain rule with powers"; // seeded, gradingMethod "mastery", Riley + Taylor
const DEFAULT_LEVEL_GRADES: Record<number, { label: string; next: number }> = {
  0: { label: "Not started", next: 10 },
  60: { label: "Developing", next: 65 },
  75: { label: "Approaching mastery", next: 80 },
  90: { label: "Proficient", next: 95 },
  100: { label: "Mastered", next: 98 },
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function gradeCell(page: Page, student: string) {
  return page.getByRole("button", {
    name: new RegExp(`^${escape(student)}, ${escape(ASSIGNMENT)}: `),
  });
}

async function cellPercent(page: Page, student: string): Promise<number> {
  const label = (await gradeCell(page, student).getAttribute("aria-label")) ?? "";
  const m = label.match(/: (\d+(?:\.\d+)?)%,/);
  expect(m, `percent in "${label}"`).toBeTruthy();
  return Number(m![1]);
}

/** Riley's evidence on the skill, as the teacher sees it. */
async function evidenceSnapshot(
  page: Page,
  studentHref: string,
): Promise<{ sufficiency: string; responses: number }> {
  await page.goto(studentHref);
  await page.locator(`a[href*="/skills/${SKILLS.chainPolynomial.id}"]`).first().click();
  await expect(
    page.getByRole("heading", { level: 1, name: SKILLS.chainPolynomial.name }),
  ).toBeVisible();
  const sufficiency = page.getByRole("region", {
    name: `Evidence sufficiency for ${SKILLS.chainPolynomial.name}`,
  });
  await expect(sufficiency).toContainText("Answers graded");
  const responses = page.getByRole("region", {
    name: `Responses for ${SKILLS.chainPolynomial.name}`,
  });
  return {
    sufficiency: (await sufficiency.innerText()).trim(),
    responses: await responses.locator("ol > li").count(),
  };
}

test("Demo F: changing the grading policy changes Riley's grade but not the evidence", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const riley = ACCOUNTS.riley.name;
  await signInAs(page, "teacher");

  // Find the class and Riley's profile link.
  await page.goto("/teacher/classes");
  await page.getByRole("link", { name: CLASS_NAME, exact: true }).click();
  await expect(page).toHaveURL(/\/teacher\/classes\/[0-9a-f-]+$/);
  const classId = new URL(page.url()).pathname.split("/").pop()!;
  const rileyHref = (await page
    .getByRole("link", { name: riley, exact: true })
    .first()
    .getAttribute("href"))!;
  expect(rileyHref).toMatch(/^\/teacher\/students\/[0-9a-f-]+/);

  const before = await evidenceSnapshot(page, rileyHref);
  expect(before.responses).toBeGreaterThan(0);

  let oldPercent = 0;
  let mapping = DEFAULT_LEVEL_GRADES[60];
  await test.step("the gradebook shows Riley's mastery-graded targeted practice", async () => {
    await page.goto(`/teacher/classes/${classId}`);
    await page.getByRole("link", { name: "Gradebook", exact: true }).last().click();
    await expect(page).toHaveURL(new RegExp(`/teacher/gradebook\\?class=${classId}`));
    await expect(page.getByRole("heading", { level: 1, name: "Gradebook" })).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: new RegExp(escape(ASSIGNMENT)) }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /^Policy v1: Mastered 100% · Proficient 90% · Approaching 75% · Developing 60%/,
      ),
    ).toBeVisible();
    oldPercent = await cellPercent(page, riley);
    expect(Object.keys(DEFAULT_LEVEL_GRADES).map(Number)).toContain(oldPercent);
    mapping = DEFAULT_LEVEL_GRADES[oldPercent];
    await expect(gradeCell(page, riley)).toContainText(`${oldPercent}%`);
  });

  await test.step("change the matching level→grade mapping and see the live preview", async () => {
    await page.getByRole("link", { name: "Grading policy" }).click();
    await expect(page).toHaveURL(new RegExp(`/teacher/gradebook/policy\\?class=${classId}`));
    await expect(page.getByRole("heading", { level: 1, name: "Grading policy" })).toBeVisible();
    const input = page.getByLabel(mapping.label, { exact: true });
    await expect(input).toHaveValue(String(oldPercent));
    await input.fill(String(mapping.next));

    const preview = page.getByRole("region", { name: ASSIGNMENT });
    const row = preview.getByRole("row", { name: new RegExp(`^${escape(riley)}`) });
    await expect(row).toBeVisible();
    await expect(row.getByRole("cell").nth(0)).toHaveText(`${oldPercent}%`);
    await expect(row.getByRole("cell").nth(1)).toHaveText(`${mapping.next}%`);
    await expect(row.getByRole("cell").nth(2)).toContainText(
      `${mapping.next > oldPercent ? "+" : ""}${mapping.next - oldPercent}`,
    );
    await expect(page.getByText("Grades that change")).toBeVisible();
  });

  await test.step("publish through the confirm dialog", async () => {
    await page.getByRole("button", { name: "Publish new version" }).click();
    const dialog = page.getByRole("dialog", { name: "Publish this grading policy?" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("becomes version 2");
    await expect(dialog).toContainText(
      "Student responses, mastery levels and evidence are not changed",
    );
    await dialog.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Grading policy published")).toBeVisible();
    await expect(page.getByText("These settings match the active version (v2).")).toBeVisible();
  });

  await test.step("the gradebook shows the new value", async () => {
    await page.goto(`/teacher/gradebook?class=${classId}`);
    await expect(page.getByText(/^Policy v2:/)).toBeVisible();
    await expect(gradeCell(page, riley)).toContainText(`${mapping.next}%`);
    expect(await cellPercent(page, riley)).toBe(mapping.next);
  });

  await test.step("Riley's attempts and evidence are unchanged", async () => {
    const after = await evidenceSnapshot(page, rileyHref);
    expect(after.responses).toBe(before.responses);
    expect(after.sufficiency).toBe(before.sufficiency);
  });
});
