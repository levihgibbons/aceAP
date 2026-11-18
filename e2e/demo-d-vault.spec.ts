/**
 * Demonstration D — the knowledge vault: notes with [[wiki links]] to a
 * curriculum concept and to another note, saved with Ctrl+S, rendered as
 * resolved links in the preview; the concept page shows the backlink and the
 * student's mastery; the graph contains the note; the JSON export includes it.
 */
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { SKILLS } from "./helpers/answers";
import { signInAs } from "./helpers/auth";

test.describe.configure({ mode: "serial" });

const CHEAT_SHEET = "Derivatives cheat sheet";
const RATES = "Rates of change";
const LEVELS = /Not started|Developing|Approaching mastery|Proficient|Mastered/;

async function createNote(page: Page, title: string, body: string): Promise<string> {
  await page.goto("/app/vault");
  await page.getByRole("link", { name: "New note" }).first().click();
  await expect(page).toHaveURL(/\/app\/vault\/new/);
  await expect(page.getByRole("heading", { level: 1, name: "New note" })).toBeVisible();
  await page.getByLabel("Title", { exact: true }).fill(title);
  const editor = page.getByLabel("Note text (Markdown)");
  await editor.fill(body);
  const saved = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/vault/notes" && r.request().method() === "POST",
  );
  await editor.press("ControlOrMeta+s");
  const res = await saved;
  expect(res.ok()).toBe(true);
  const { note } = (await res.json()) as { note: { id: string; href: string } };
  // SaveIndicator reads "Saved· 10:42 AM" (textContent; the time is in a span).
  await expect(page.locator("p").filter({ hasText: /^Saved/ })).toBeVisible();
  // The editor moves to the note's own URL after the first save.
  await expect(page).toHaveURL(new RegExp(`${note.id}`));
  return note.id;
}

test("Demo D: Alex builds linked notes, sees backlinks and the graph, and exports the vault", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await signInAs(page, "alex");

  await page.getByRole("link", { name: "Knowledge vault" }).first().click();
  await expect(page).toHaveURL(/\/app\/vault$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  let ratesId = "";
  let cheatId = "";
  await test.step("create the two notes; the cheat sheet links a concept and the other note", async () => {
    ratesId = await createNote(
      page,
      RATES,
      "A derivative is an instantaneous **rate of change**: how fast the output moves per unit of input.\n",
    );
    cheatId = await createNote(
      page,
      CHEAT_SHEET,
      `# Derivative rules\n\n- Powers of functions: [[${SKILLS.chainPolynomial.name}]] — outside derivative times inside derivative.\n- Why it matters: [[${RATES}]]\n`,
    );
  });

  await test.step("the preview renders both links as resolved links", async () => {
    const preview = page.getByRole("region", { name: "Preview" });
    const concept = preview.getByRole("link", { name: SKILLS.chainPolynomial.name });
    await expect(concept).toHaveAttribute(
      "href",
      `/app/vault/concepts/${SKILLS.chainPolynomial.id}`,
    );
    const note = preview.getByRole("link", { name: RATES });
    await expect(note).toHaveAttribute("href", new RegExp(`/app/vault/notes/${ratesId}`));
    // Nothing points at the "create note" target (i.e. no unresolved links).
    await expect(preview.locator('a[href^="/app/vault/new"]')).toHaveCount(0);
  });

  await test.step("the concept page shows the backlink and Alex's mastery", async () => {
    await page
      .getByRole("region", { name: "Preview" })
      .getByRole("link", { name: SKILLS.chainPolynomial.name })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/app/vault/concepts/${SKILLS.chainPolynomial.id.replace(".", "\\.")}$`),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: SKILLS.chainPolynomial.name }),
    ).toBeVisible();
    const mastery = page.getByRole("region", { name: "Where you are" });
    await expect(mastery).toBeVisible();
    await expect(mastery.locator("span.rounded-full").first()).toHaveText(LEVELS);
    await expect(mastery.getByRole("link", { name: /Skill details/ })).toBeVisible();
    const notes = page.getByRole("region", { name: "Your notes" });
    await expect(notes.getByRole("link", { name: CHEAT_SHEET })).toHaveAttribute(
      "href",
      new RegExp(cheatId),
    );
    await expect(notes).toContainText("1 linking here");
  });

  await test.step("the knowledge graph contains the note (list view and canvas)", async () => {
    await page.goto("/app/vault/graph");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "List view" }).click();
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const yourNotes = page.getByRole("region", { name: /^Your notes/ });
    // Each note is a list entry (link + "Details" button); its connections link the other note.
    await expect(
      yourNotes.getByRole("button", { name: `Details for ${CHEAT_SHEET}` }),
    ).toBeVisible();
    await expect(
      yourNotes.getByRole("link", { name: CHEAT_SHEET, exact: true }).first(),
    ).toHaveAttribute("href", new RegExp(cheatId));
    await expect(yourNotes.getByRole("button", { name: `Details for ${RATES}` })).toBeVisible();
    const conns = yourNotes.getByRole("list", { name: `Connections of ${CHEAT_SHEET}` });
    await expect(conns).toContainText(SKILLS.chainPolynomial.name);
    await expect(conns).toContainText(RATES);
    // The canvas view renders the same note as a node.
    await page.getByRole("button", { name: "Graph", exact: true }).click();
    await expect(page.getByText(CHEAT_SHEET).first()).toBeVisible();
  });

  await test.step("export the vault as JSON: versioned schema, note included", async () => {
    await page.goto("/app/vault/export");
    await expect(page.getByRole("heading", { level: 1, name: "Export your vault" })).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Download JSON" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.json$/);
    const path = await download.path();
    const data = JSON.parse(await readFile(path, "utf8")) as {
      schema: string;
      schemaVersion: string;
      notes: {
        id: string;
        title: string;
        body: string;
        links: { targetType: string; targetId: string; label: string }[];
      }[];
      concepts: { skillId: string }[];
    };
    expect(data.schema).toBe("aceap.vault-export");
    expect(data.schemaVersion).toMatch(/^1\.\d+\.\d+$/);
    const note = data.notes.find((n) => n.title === CHEAT_SHEET);
    expect(note, "cheat sheet note in export").toBeTruthy();
    expect(note!.id).toBe(cheatId);
    expect(note!.body).toContain(`[[${RATES}]]`);
    expect(note!.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ targetType: "skill", targetId: SKILLS.chainPolynomial.id }),
        expect.objectContaining({ targetType: "note", targetId: ratesId }),
      ]),
    );
    expect(data.notes.some((n) => n.title === RATES)).toBe(true);
    expect(data.concepts.some((c) => c.skillId === SKILLS.chainPolynomial.id)).toBe(true);
  });
});
