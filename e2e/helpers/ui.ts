/** Small locator helpers for recurring AceAP markup. */
import { expect, type Locator, type Page } from "@playwright/test";
import type { AnswerKey, KnownQuestion } from "./answers";

/** Value of a <StatTile label=…> (label <p> inside a header div, value is the next <p>). */
export function statTile(scope: Page | Locator, label: string): Locator {
  return scope.locator(
    `xpath=.//p[normalize-space(.)="${label}"]/parent::div/following-sibling::p[1]`,
  );
}

/** Value of a <dt>label</dt><dd>value</dd> pair. */
export function dtValue(scope: Page | Locator, label: string): Locator {
  return scope.locator(`xpath=.//dt[normalize-space(.)="${label}"]/following-sibling::dd[1]`);
}

/** A QuestionCard (<article>) whose label/lead/prompt contains `text`. */
export function questionCard(scope: Page | Locator, text: string | RegExp): Locator {
  return scope.locator("article").filter({ hasText: text });
}

/** Fill a QuestionCard's input with a value of the given answer type. */
export async function enterAnswer(
  card: Locator,
  type: AnswerKey["type"],
  value: string,
): Promise<void> {
  if (type === "multiple_choice") {
    await card.locator(`input[type="radio"][value="${value}"]`).check();
  } else {
    await card.getByLabel("Your answer").fill(value);
  }
}

/** Which known question is this card showing? Matches the KaTeX source kept in the DOM. */
export async function identify(card: Locator, candidates: KnownQuestion[]): Promise<KnownQuestion> {
  const html = await card.innerHTML();
  const decoded = html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;|&#39;/g, "'");
  const hit = candidates.find((q) => decoded.includes(q.marker));
  if (!hit)
    throw new Error(
      `Couldn't identify the question in this card:\n${(await card.innerText()).slice(0, 400)}`,
    );
  return hit;
}

/** Submit an immediate-feedback card ("Check answer") and wait for the feedback panel. */
export async function checkAnswer(card: Locator): Promise<Locator> {
  await card.getByRole("button", { name: "Check answer" }).click();
  // FeedbackPanel is role=group, labelled by its verdict.
  const feedback = card.getByRole("group", { name: /^(Correct|Not quite|Partly correct.*)$/ });
  await expect(feedback).toBeVisible();
  return feedback;
}

/** A <section> whose heading has this exact text (for Sections without an id/accessible name). */
export function sectionByHeading(scope: Page, name: string): Locator {
  return scope
    .locator("section")
    .filter({ has: scope.getByRole("heading", { name, exact: true }) })
    .last();
}
