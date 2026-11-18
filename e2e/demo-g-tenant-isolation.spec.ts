/**
 * Demonstration G — tenant isolation. A teacher at another school (Lakeview)
 * requesting a Northfield class, its heatmap, a Northfield student's profile
 * and evidence, its gradebook and the gradebook CSV gets a not-found /
 * not-available state with none of the other school's data in the HTML (RSC
 * payload included). A student can't read, change or delete a classmate's
 * vault note through the API.
 */
import { expect, test } from "@playwright/test";
import { SKILLS } from "./helpers/answers";
import { ACCOUNTS, signInAs } from "./helpers/auth";

test.describe.configure({ mode: "serial" });

const NORTHFIELD_CLASS = "AP Calculus AB — Period 2";
const LEAKS = [
  ACCOUNTS.riley.name,
  NORTHFIELD_CLASS,
  "Northfield",
  ACCOUNTS.teacher.name,
  "riley@demo.aceap.test",
];

let classId = "";
let rileyId = "";
let alexNoteId = "";
const NOTE_TITLE = "Isolation check: Alex's private note";
const NOTE_SECRET = "only-alex-should-read-this-7f3a";

test("setup: read a Northfield class id and Riley's student id as their teacher", async ({
  page,
}) => {
  await signInAs(page, "teacher");
  await page.goto("/teacher/classes");
  await page.getByRole("link", { name: NORTHFIELD_CLASS, exact: true }).click();
  await expect(page).toHaveURL(/\/teacher\/classes\/[0-9a-f-]+$/);
  classId = new URL(page.url()).pathname.split("/").pop()!;
  const href = (await page
    .getByRole("link", { name: ACCOUNTS.riley.name, exact: true })
    .first()
    .getAttribute("href"))!;
  rileyId = new URL(href, page.url()).pathname.split("/").pop()!;
  expect(classId).toMatch(/^[0-9a-f-]{36}$/);
  expect(rileyId).toMatch(/^[0-9a-f-]{36}$/);
  // Sanity: the owning teacher can open these pages.
  await page.goto(`/teacher/students/${rileyId}?class=${classId}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(ACCOUNTS.riley.name);
  const csv = await page.request.get(`/api/teacher/gradebook/export?class=${classId}`);
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain(ACCOUNTS.riley.name);
});

test("setup: Alex creates a private note", async ({ page }) => {
  await signInAs(page, "alex");
  const res = await page.request.post("/api/vault/notes", {
    data: { title: NOTE_TITLE, body: `Secret: ${NOTE_SECRET}` },
  });
  expect(res.ok()).toBe(true);
  alexNoteId = ((await res.json()) as { note: { id: string } }).note.id;
  const own = await page.request.get(`/api/vault/notes/${alexNoteId}`);
  expect(own.status()).toBe(200);
  expect(await own.text()).toContain(NOTE_SECRET);
});

test("a Lakeview teacher gets not-found for Northfield pages, with no Northfield data in the HTML", async ({
  page,
}) => {
  expect(classId && rileyId, "setup tests ran").toBeTruthy();
  await signInAs(page, "teacher2");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const pages = [
    `/teacher/classes/${classId}`,
    `/teacher/classes/${classId}/mastery`,
    `/teacher/classes/${classId}/engagement`,
    `/teacher/students/${rileyId}`,
    `/teacher/students/${rileyId}?class=${classId}`,
    `/teacher/students/${rileyId}/skills/${SKILLS.chainPolynomial.id}?class=${classId}`,
  ];
  for (const url of pages) {
    await test.step(url, async () => {
      await page.goto(url);
      await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
      const html = await page.content();
      for (const leak of LEAKS)
        expect(html, `${url} must not contain "${leak}"`).not.toContain(leak);
    });
  }

  await test.step("gradebook page for the Northfield class", async () => {
    await page.goto(`/teacher/gradebook?class=${classId}`);
    await expect(page.getByRole("heading", { name: "Class not available" })).toBeVisible();
    await expect(page.getByText("That class doesn't exist or isn't one of yours.")).toBeVisible();
    const html = await page.content();
    for (const leak of LEAKS)
      expect(html, `gradebook must not contain "${leak}"`).not.toContain(leak);
  });

  await test.step("gradebook CSV API", async () => {
    const res = await page.request.get(`/api/teacher/gradebook/export?class=${classId}`);
    expect([403, 404]).toContain(res.status());
    const body = await res.text();
    for (const leak of LEAKS) expect(body).not.toContain(leak);
  });
});

test("a classmate cannot read, edit or delete Alex's note through the API", async ({ page }) => {
  expect(alexNoteId, "setup tests ran").toBeTruthy();
  await signInAs(page, "avery");

  const get = await page.request.get(`/api/vault/notes/${alexNoteId}`);
  expect([403, 404]).toContain(get.status());
  const getBody = await get.text();
  expect(getBody).not.toContain(NOTE_SECRET);
  expect(getBody).not.toContain(NOTE_TITLE);

  const put = await page.request.put(`/api/vault/notes/${alexNoteId}`, {
    data: { body: "overwritten by Avery" },
  });
  expect([403, 404]).toContain(put.status());
  const del = await page.request.delete(`/api/vault/notes/${alexNoteId}`);
  expect([403, 404]).toContain(del.status());

  // The note page itself is not reachable either.
  await page.goto(`/app/vault/notes/${alexNoteId}`);
  expect(await page.content()).not.toContain(NOTE_SECRET);

  // Alex's note is intact.
  await signInAs(page, "alex");
  const own = await page.request.get(`/api/vault/notes/${alexNoteId}`);
  expect(own.status()).toBe(200);
  const text = await own.text();
  expect(text).toContain(NOTE_SECRET);
  expect(text).not.toContain("overwritten by Avery");
});
