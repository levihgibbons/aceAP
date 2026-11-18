/**
 * Smoke: every main navigation page renders (an <h1>, no error boundary) for
 * each role; the catalog lists all 43 AP courses with Networking marked
 * Upcoming; the web app manifest is served; phone-width layouts don't scroll
 * sideways.
 */
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type AccountKey } from "./helpers/auth";

const NAV: Record<
  "alex" | "teacher" | "admin",
  { nav: string; pages: { href: string; label: string }[] }
> = {
  alex: {
    nav: "Student navigation",
    pages: [
      { href: "/app", label: "Home" },
      { href: "/app/courses", label: "My courses" },
      { href: "/app/exam-prep", label: "Exam prep" },
      { href: "/app/progress", label: "Progress" },
      { href: "/app/vault", label: "Knowledge vault" },
      { href: "/app/assignments", label: "Assignments" },
    ],
  },
  teacher: {
    nav: "Teaching navigation",
    pages: [
      { href: "/teacher", label: "Overview" },
      { href: "/teacher/classes", label: "Classes" },
      { href: "/teacher/assignments", label: "Assignments" },
      { href: "/teacher/gradebook", label: "Gradebook" },
      { href: "/teacher/integrations", label: "Integrations" },
    ],
  },
  admin: {
    nav: "Platform admin navigation",
    pages: [
      { href: "/admin", label: "Overview" },
      { href: "/admin/content", label: "Content review" },
      { href: "/admin/licensing", label: "Licensing" },
      { href: "/admin/audit", label: "Audit log" },
      { href: "/admin/policies", label: "Mastery policy" },
      { href: "/teacher", label: "Teaching tools" },
    ],
  },
};

/** Extra signed-in pages reachable from the main ones. */
const EXTRA: Partial<Record<AccountKey, string[]>> = {
  alex: [
    "/app/search?q=chain+rule",
    "/app/vault/graph",
    "/app/vault/export",
    "/app/courses/calculus-ab",
    "/app/exam-prep/calculus-ab",
  ],
};

async function expectHealthyPage(page: Page, url: string) {
  await expect(page.getByRole("heading", { level: 1 }).first(), `${url} has an h1`).toBeVisible();
  await expect(
    page.getByText("Something went wrong"),
    `${url} shows no error boundary`,
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toHaveCount(0);
}

for (const who of ["alex", "teacher", "admin"] as const) {
  test(`every main nav page renders for ${who}`, async ({ page }) => {
    test.setTimeout(120_000);
    await signInAs(page, who);
    const { nav, pages } = NAV[who];
    const sidebar = page.getByRole("navigation", { name: nav, exact: true });
    await expect(sidebar).toBeVisible();
    for (const p of pages) {
      await test.step(p.href, async () => {
        // The link is in the navigation…
        const link = page.locator(`nav a[href="${p.href}"]`).filter({ hasText: p.label }).first();
        await expect(link).toBeAttached();
        // …and its page renders.
        const res = await page.goto(p.href);
        expect(res?.status(), `${p.href} status`).toBeLessThan(400);
        await expectHealthyPage(page, p.href);
      });
    }
    for (const href of EXTRA[who] ?? []) {
      await test.step(href, async () => {
        const res = await page.goto(href);
        expect(res?.status(), `${href} status`).toBeLessThan(400);
        await expectHealthyPage(page, href);
      });
    }
  });
}

test("the catalog lists all 43 AP courses, with AP Networking marked Upcoming", async ({
  page,
}) => {
  await signInAs(page, "alex");
  await page.goto("/app/courses/browse");
  await expect(page.getByRole("heading", { level: 1, name: "AP courses" })).toBeVisible();
  await expect(page.getByText(/^All 43 AP courses College Board publishes\./)).toBeVisible();
  await expect(page.getByText(/^43 courses in \d+ categories\.$/)).toBeVisible();
  await expect(page.locator('main a[href^="/app/courses/"]')).toHaveCount(43);
  const networking = page
    .locator("li")
    .filter({ has: page.getByRole("link", { name: "AP Networking", exact: true }) });
  await expect(networking).toHaveCount(1);
  await expect(networking.getByText("Upcoming", { exact: true })).toBeVisible();
});

test("the web app manifest is served as JSON", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toMatch(/json/);
  const manifest = (await res.json()) as { name: string; start_url: string; icons: unknown[] };
  expect(manifest.name).toBe("AceAP");
  expect(manifest.start_url).toBe("/app");
  expect(manifest.icons.length).toBeGreaterThan(0);
});

for (const [who, url] of [
  ["alex", "/app"],
  ["teacher", "/teacher"],
] as const) {
  test(`${url} has no horizontal scroll at 360 px`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await signInAs(page, who);
    if (who === "alex") {
      // Home lists recent notes in one-line truncated rows; a long note used to widen the page
      // (grid track sized to the nowrap text). Make sure one exists whatever ran before.
      const res = await page.request.post("/api/vault/notes", {
        data: {
          title: `Smoke ${Date.now()}: a deliberately long note title that would never fit on a phone screen`,
          body: "A long first line so the excerpt is long too: ".repeat(6),
        },
      });
      expect(res.ok()).toBe(true);
    }
    await page.goto(url);
    await expectHealthyPage(page, url);
    const { scrollWidth, clientWidth, offenders } = await page.evaluate(() => {
      const cw = document.documentElement.clientWidth;
      // Innermost elements that stick out past the viewport, for a useful failure message.
      const wide = [...document.querySelectorAll<HTMLElement>("body *")].filter(
        (el) => el.getBoundingClientRect().right > cw + 1,
      );
      const leaves = wide.filter((el) => !wide.some((other) => other !== el && el.contains(other)));
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: cw,
        offenders: leaves
          .slice(0, 5)
          .map(
            (el) =>
              `<${el.tagName.toLowerCase()} class="${el.className}"> right=${Math.round(el.getBoundingClientRect().right)} "${(el.textContent ?? "").trim().slice(0, 60)}"`,
          ),
      };
    });
    expect(
      scrollWidth,
      `${url}: scrollWidth ${scrollWidth} vs clientWidth ${clientWidth}\n${offenders.join("\n")}`,
    ).toBeLessThanOrEqual(clientWidth + 1);
  });
}

test("my courses are one click away and each course is a numbered roadmap", async ({ page }) => {
  await signInAs(page, "alex");
  await page.goto("/app");
  // The sidebar lists the student's own courses.
  const yourCourses = page.locator('nav[aria-label="Student navigation"]').getByRole("list", { name: "Your courses" });
  await expect(yourCourses.getByRole("link", { name: /Calculus AB/ })).toBeVisible();

  await page.getByRole("navigation", { name: "Student navigation" }).getByRole("link", { name: "My courses" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "My courses" })).toBeVisible();
  const card = page.getByRole("article", { name: "AP Calculus AB" });
  await expect(card.getByRole("link", { name: /Open the AP Calculus AB roadmap/ })).toBeVisible();

  await card.getByRole("link", { name: /Open the AP Calculus AB roadmap/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Roadmap" })).toBeVisible();
  const roadmap = page.getByRole("list", { name: "AP Calculus AB roadmap" });
  await expect(roadmap.getByRole("link", { name: /Lesson 3\.2: The chain rule/ })).toBeVisible();
  // Outline-only units are listed, but say plainly that lessons come later.
  await expect(roadmap.getByText("Lessons coming later").first()).toBeVisible();
  // Exactly one "up next" step on the path.
  await expect(roadmap.getByText("Up next", { exact: true })).toHaveCount(1);
});
