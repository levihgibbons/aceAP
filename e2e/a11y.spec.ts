/**
 * Accessibility: automated axe-core scans (WCAG 2.0/2.1 A + AA) of the main
 * screens for every role, in the light theme and — for a representative
 * subset — the dark theme, plus keyboard checks of the critical paths.
 *
 * Serious/critical findings fail; moderate/minor are printed and attached as
 * JSON (see e2e/helpers/a11y.ts). Results and known gaps: docs/ACCESSIBILITY.md.
 *
 * State: student flows that create evidence run as Casey Fox (independent
 * learner, not used by other specs) so the demo specs' seeded expectations for
 * Alex are untouched.
 */
import { expect, test, type Page } from "@playwright/test";
import { A11yAudit, setTheme, type Theme } from "./helpers/a11y";
import { CHAIN_QUIZ, CP1, SKILLS } from "./helpers/answers";
import { signInAs } from "./helpers/auth";
import { checkAnswer, enterAnswer, identify, questionCard } from "./helpers/ui";

const CLASS_NAME = "AP Calculus AB — Period 2";
const LESSON = "calculus-ab.l.chain-rule";

test.use({ reducedMotion: "reduce" });

/** Run `body` once per theme; the theme persists across navigations via localStorage. */
async function inThemes(page: Page, themes: Theme[], body: (theme: Theme) => Promise<void>) {
  for (const theme of themes) {
    await setTheme(page, theme);
    await test.step(`${theme} theme`, () => body(theme));
  }
  await setTheme(page, "light");
}

async function h1(page: Page) {
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
}

test.describe("axe scans", () => {
  test("public pages", async ({ page }, testInfo) => {
    const audit = new A11yAudit(testInfo);
    await page.goto("/");
    await inThemes(page, ["light", "dark"], async () => {
      await page.goto("/");
      await h1(page);
      await audit.scan(page, "landing");
      // Auth pages belong to the account-lifecycle workstream: reported, not enforced.
      await page.goto("/login");
      await h1(page);
      await audit.scan(page, "login", { enforce: false });
      await page.goto("/signup");
      await h1(page);
      await audit.scan(page, "signup", { enforce: false });
    });
    // Other workstreams' pages (account lifecycle, LTI): reported, not enforced.
    for (const [name, url] of [
      ["forgot password", "/forgot-password"],
      ["reset password (no token)", "/reset-password"],
      ["LTI account link (no token)", "/lti/link"],
    ] as const) {
      await page.goto(url);
      await audit.scan(page, name, { enforce: false });
    }
    await audit.finish();
  });

  test("student: learning, practice, quiz, progress", async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    const audit = new A11yAudit(testInfo);
    await signInAs(page, "indie");

    await inThemes(page, ["light", "dark"], async (theme) => {
      await page.goto("/app");
      await h1(page);
      await audit.scan(page, "student home");
      if (theme === "dark") return; // the rest of the dark subset runs below
      await page.goto("/app/courses");
      await h1(page);
      await audit.scan(page, "my courses");
      await page.goto("/app/courses/browse");
      await h1(page);
      await audit.scan(page, "catalog");
    });

    await page.goto("/app/courses/calculus-ab");
    await h1(page);
    await audit.scan(page, "course page");
    const unitHref = await page
      .locator('main a[href^="/app/courses/calculus-ab/units/"]')
      .first()
      .getAttribute("href");
    await page.goto(unitHref!);
    await h1(page);
    await audit.scan(page, "unit page");

    // Lesson: KaTeX, a simulation, and a check question with feedback showing.
    await page.goto(`/app/learn/${LESSON}`);
    await h1(page);
    const first = questionCard(page, /./)
      .filter({ has: page.getByLabel("Your answer") })
      .first();
    await identify(first, [CP1]); // the lesson's first check is cp-1
    await enterAnswer(first, CP1.key.type, CP1.key.wrong!.value);
    await checkAnswer(first);
    await inThemes(page, ["light", "dark"], async () => {
      await audit.scan(page, "chain-rule lesson (simulation + check feedback)");
    });

    // Guided practice with immediate feedback.
    await page.goto(`/app/practice/${SKILLS.chainPolynomial.id}`);
    await h1(page);
    await audit.scan(page, "practice intro");
    await page
      .getByRole("button", { name: /^(Start|Resume)/ })
      .first()
      .click();
    await page.waitForURL(/\/app\/attempts\/[0-9a-f-]+$/);
    const pq = page.locator("article").first();
    await expect(pq).toBeVisible();
    if (await pq.locator('input[type="radio"]').count())
      await pq.locator('input[type="radio"]').first().check();
    else await pq.getByLabel("Your answer").fill("1");
    await checkAnswer(pq);
    await inThemes(page, ["light", "dark"], async () => {
      await audit.scan(page, "practice attempt with feedback");
    });

    // Quiz: review screen, confirm dialog, results.
    await page.goto("/app/assessments/calculus-ab.quiz.chain");
    await h1(page);
    await audit.scan(page, "quiz intro");
    await page
      .getByRole("button", { name: /^(Start|Resume)/ })
      .first()
      .click();
    await page.waitForURL(/\/app\/attempts\/[0-9a-f-]+$/);
    await audit.scan(page, "quiz question");
    for (let i = 1; i <= 6; i++) {
      const q = questionCard(page, `Question ${i} of 6`);
      await expect(q).toBeVisible();
      const known = await identify(q, CHAIN_QUIZ);
      await enterAnswer(q, known.key.type, known.key.correct);
      await expect(q.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible();
      if (i < 6) await page.getByRole("button", { name: "Next question" }).click();
    }
    await page.getByRole("button", { name: "Review answers" }).click();
    await expect(page.getByRole("heading", { name: "Review your answers" })).toBeVisible();
    await audit.scan(page, "quiz review screen");
    await page.getByRole("button", { name: "Submit answers" }).click();
    const dialog = page.getByRole("dialog", { name: "Submit your answers?" });
    await expect(dialog).toBeVisible();
    await audit.scan(page, "quiz submit dialog");
    await dialog.getByRole("button", { name: "Submit", exact: true }).click();
    await expect(page.getByText("Submitted", { exact: true }).first()).toBeVisible();
    await inThemes(page, ["light", "dark"], async () => {
      await audit.scan(page, "quiz results");
    });

    for (const [name, url] of [
      ["skill page", `/app/skills/${SKILLS.chainPolynomial.id}`],
      ["progress", "/app/progress"],
      ["search results", "/app/search?q=chain+rule"],
      ["exam prep", "/app/exam-prep"],
      ["exam prep course", "/app/exam-prep/calculus-ab"],
      ["assignments", "/app/assignments"],
    ] as const) {
      await page.goto(url);
      await h1(page);
      await audit.scan(page, name);
    }
    await page.goto("/app/settings");
    await h1(page);
    await audit.scan(page, "account settings (student)", { enforce: false });
    await audit.finish();
  });

  test("student: knowledge vault", async ({ page }, testInfo) => {
    test.setTimeout(150_000);
    const audit = new A11yAudit(testInfo);
    await signInAs(page, "indie");
    // Casey starts with an empty vault: add two linked notes so the workspace, preview,
    // backlinks and graph have content.
    for (const [title, body] of [
      [
        "A11y: chain rule summary",
        "Differentiate the outer function, keep the inner, multiply by $g'(x)$. See [[A11y: worked examples]].",
      ],
      [
        "A11y: worked examples",
        "$\\frac{d}{dx}(x^2+1)^3 = 6x(x^2+1)^2$ — links back to [[A11y: chain rule summary]].",
      ],
    ]) {
      const res = await page.request.post("/api/vault/notes", { data: { title, body } });
      expect(res.ok()).toBe(true);
    }

    // Finishing a lesson fills "My knowledge" (the vault home) with its ideas and formulas.
    const done = await page.request.post("/api/lessons/calculus-ab.l.chain-rule/complete");
    expect(done.ok()).toBe(true);
    await page.goto("/app/vault");
    await h1(page);
    await expect(page.getByRole("heading", { level: 2, name: /^Unit \d+:/ }).first()).toBeVisible();
    await inThemes(page, ["light", "dark"], async () => {
      await page.goto("/app/vault");
      await h1(page);
      await audit.scan(page, "vault: my knowledge");
      await page.goto("/app/vault/notes");
      await h1(page);
      await audit.scan(page, "vault workspace");
    });

    // Open a note's preview pane, then the note itself.
    await page.locator('main a[href*="note="]').first().click();
    const open = page.locator('main a[href^="/app/vault/notes/"]').first();
    await expect(open).toBeVisible();
    await audit.scan(page, "vault workspace (note preview)");
    const noteHref = await open.getAttribute("href");
    await page.goto(noteHref!);
    await h1(page);
    await audit.scan(page, "note editor");

    await page.goto("/app/vault/new");
    await h1(page);
    await audit.scan(page, "new note");

    await page.goto(`/app/vault/concepts/${SKILLS.chainPolynomial.id}`);
    await h1(page);
    await audit.scan(page, "concept page");

    await page.goto("/app/vault/graph");
    await expect(page.locator(".react-flow__node").first()).toBeVisible();
    await inThemes(page, ["light", "dark"], async () => {
      await audit.scan(page, "vault graph (canvas)");
    });
    await page.getByRole("button", { name: "List view" }).click();
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await audit.scan(page, "vault graph (list view)");

    await page.goto("/app/vault/export");
    await h1(page);
    await audit.scan(page, "vault export");
    await audit.finish();
  });

  test("teacher", async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    const audit = new A11yAudit(testInfo);
    await signInAs(page, "teacher");

    await inThemes(page, ["light", "dark"], async () => {
      await page.goto("/teacher");
      await h1(page);
      await audit.scan(page, "teacher overview");
    });

    await page.goto("/teacher/classes");
    await h1(page);
    await audit.scan(page, "classes");
    await page.getByRole("link", { name: CLASS_NAME, exact: true }).click();
    await expect(page).toHaveURL(/\/teacher\/classes\/[0-9a-f-]+$/);
    const classUrl = new URL(page.url()).pathname;
    const classId = classUrl.split("/").pop()!;
    await h1(page);
    await audit.scan(page, "class page");

    await page.goto(`${classUrl}/mastery`);
    await h1(page);
    const heatmap = page.getByRole("region", { name: "Mastery heatmap (scrolls horizontally)" });
    await inThemes(page, ["light", "dark"], async () => {
      await audit.scan(page, "mastery heatmap");
      await heatmap
        .getByRole("button", { name: /, objective .*: (?!no evidence)/ })
        .first()
        .click();
      const drawer = page.getByRole("dialog");
      await expect(drawer).toBeVisible();
      await audit.scan(page, "heatmap evidence drawer");
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
    });

    for (const sub of ["engagement", "interventions", "notes", "settings", "canvas-roster"]) {
      await page.goto(`${classUrl}/${sub}`);
      await h1(page);
      await audit.scan(page, `class ${sub}`);
    }

    // Student profile, via the heatmap drawer's profile link.
    await page.goto(`${classUrl}/mastery`);
    await heatmap
      .getByRole("button", { name: /, objective .*: (?!no evidence)/ })
      .first()
      .click();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: /^Open .*'s profile$/ })
      .click();
    await expect(page).toHaveURL(/\/teacher\/students\/[0-9a-f-]+/);
    await h1(page);
    await audit.scan(page, "student profile");
    await page.locator('main a[href*="/skills/"]').first().click();
    await expect(page).toHaveURL(/\/teacher\/students\/[0-9a-f-]+\/skills\//);
    await h1(page);
    await audit.scan(page, "student skill evidence");

    await page.goto(`/teacher/gradebook?class=${classId}`);
    await h1(page);
    await inThemes(page, ["light", "dark"], async () => {
      await audit.scan(page, "gradebook");
      await page.getByRole("button", { name: /%,/ }).first().click();
      const drawer = page.getByRole("dialog");
      await expect(drawer).toBeVisible();
      await audit.scan(page, "gradebook grade drawer");
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
    });

    await page.goto(`/teacher/gradebook/policy?class=${classId}`);
    await h1(page);
    await audit.scan(page, "grading policy");

    await page.goto("/teacher/assignments");
    await h1(page);
    await audit.scan(page, "assignments");
    await page.goto("/teacher/assignments/new");
    await h1(page);
    await audit.scan(page, "new assignment");
    await page.goto("/teacher/classes/new");
    await h1(page);
    await audit.scan(page, "new class");

    // Integrations belong to the LMS workstream: reported, not enforced.
    await page.goto("/teacher/integrations");
    await h1(page);
    await audit.scan(page, "integrations", { enforce: false });
    await page.goto("/teacher/settings");
    await h1(page);
    await audit.scan(page, "account settings (teacher)", { enforce: false });
    await audit.finish();
  });

  test("admin", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const audit = new A11yAudit(testInfo);
    await signInAs(page, "admin");
    await inThemes(page, ["light", "dark"], async () => {
      await page.goto("/admin");
      await h1(page);
      await audit.scan(page, "admin overview");
    });
    for (const [name, url] of [
      ["admin content review", "/admin/content"],
      ["admin licensing", "/admin/licensing"],
      ["admin audit log", "/admin/audit"],
      ["admin mastery policy", "/admin/policies"],
    ] as const) {
      await page.goto(url);
      await h1(page);
      await audit.scan(page, name);
    }
    await audit.finish();
  });
});

test.describe("keyboard", () => {
  test("skip link, then Tab reaches navigation and the page's primary content", async ({
    page,
  }) => {
    await signInAs(page, "indie");
    await page.goto("/app");
    await h1(page);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    // Focus moves into <main>; the next Tab lands on something inside it.
    await page.keyboard.press("Tab");
    const inMain = await page.evaluate(() => !!document.activeElement?.closest("main"));
    expect(inMain).toBe(true);

    // From the top, the primary navigation is reachable with Tab alone.
    await page.goto("/app");
    await h1(page);
    let reachedNav = false;
    for (let i = 0; i < 25 && !reachedNav; i++) {
      await page.keyboard.press("Tab");
      reachedNav = await page.evaluate(
        () =>
          document.activeElement?.closest('nav[aria-label="Student navigation"]') != null &&
          document.activeElement?.getAttribute("href") === "/app/courses",
      );
    }
    expect(reachedNav, "Tab reaches the Courses link in the student navigation").toBe(true);
  });

  test("sign-in form is operable by keyboard alone", async ({ page }) => {
    await page.goto("/login");
    await h1(page);
    const seen: string[] = [];
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
      seen.push(
        await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el) return "";
          const label =
            (el as HTMLInputElement).labels?.[0]?.textContent ??
            el.getAttribute("aria-label") ??
            el.textContent;
          return `${el.tagName.toLowerCase()}:${(label ?? "").trim().slice(0, 40)}`;
        }),
      );
    }
    expect(seen.some((s) => s.startsWith("input:Email"))).toBe(true);
    expect(seen.some((s) => s.startsWith("input:Password"))).toBe(true);
    expect(seen.some((s) => /^button:Sign in$/.test(s))).toBe(true);
  });

  test("account menu opens with Enter, closes with Esc and returns focus", async ({ page }) => {
    await signInAs(page, "indie");
    const trigger = page.getByRole("button", { name: "Account menu for Casey Fox" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Sign out" })).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("heatmap: arrow keys move between cells; the drawer traps focus, Esc closes and restores focus", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signInAs(page, "teacher");
    await page.goto("/teacher/classes");
    await page.getByRole("link", { name: CLASS_NAME, exact: true }).click();
    await expect(page).toHaveURL(/\/teacher\/classes\/[0-9a-f-]+$/);
    await page.goto(`${new URL(page.url()).pathname}/mastery`);
    const heatmap = page.getByRole("region", { name: "Mastery heatmap (scrolls horizontally)" });
    const first = heatmap.locator('button[data-r="0"][data-c="0"]');
    await first.focus();
    const pos = () =>
      page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        return `${el?.dataset.r},${el?.dataset.c}`;
      });
    expect(await pos()).toBe("0,0");
    await page.keyboard.press("ArrowRight");
    expect(await pos()).toBe("0,1");
    await page.keyboard.press("ArrowDown");
    expect(await pos()).toBe("1,1");
    await page.keyboard.press("End");
    const cols = await heatmap.locator('button[data-r="1"]').count();
    expect(await pos()).toBe(`1,${cols - 1}`);
    await page.keyboard.press("Home");
    expect(await pos()).toBe("1,0");
    await page.keyboard.press("ArrowUp");
    expect(await pos()).toBe("0,0");
    // Arrow keys stop at the edges instead of leaving the grid.
    await page.keyboard.press("ArrowLeft");
    await expect(first).toBeFocused();

    // Enter opens the evidence drawer with focus inside it.
    await page.keyboard.press("Enter");
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    const inside = () => page.evaluate(() => !!document.activeElement?.closest("dialog[open]"));
    expect(await inside()).toBe(true);
    await expect(drawer.locator('[aria-busy="true"]')).toHaveCount(0);
    // The page behind a native modal <dialog> is inert: Tab/Shift+Tab only ever land inside the
    // drawer, or on the browser's own UI (activeElement = body) before wrapping back in.
    const where = () =>
      page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return "browser";
        return el.closest("dialog[open]") ? "dialog" : `page:${el.tagName}`;
      });
    const visited = new Set<string>();
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press("Tab");
      const w = await where();
      visited.add(w);
      expect(w, `focus never reaches the page behind the drawer (Tab ×${i + 1})`).toMatch(
        /^(dialog|browser)$/,
      );
    }
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Shift+Tab");
      expect(await where()).toMatch(/^(dialog|browser)$/);
    }
    expect(visited.has("dialog")).toBe(true);
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(first).toBeFocused();
  });

  test("quiz submit dialog: focus moves in, Esc cancels and returns focus to the trigger", async ({
    page,
  }) => {
    await signInAs(page, "indie");
    // A Physics quiz no other spec uses ("Start", "Resume" or "Start a new attempt").
    await page.goto("/app/assessments/physics-1.quiz.motion-basics");
    await h1(page);
    const start = page.getByRole("button", { name: /^(Start|Resume)/ }).first();
    await start.click();
    await page.waitForURL(/\/app\/attempts\/[0-9a-f-]+$/);
    // Jump straight to the review step from the question navigator.
    await page
      .getByRole("navigation", { name: "Questions" })
      .getByRole("button", { name: "Review", exact: true })
      .click();
    const submit = page.getByRole("button", { name: "Submit answers" });
    await submit.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Submit your answers?" });
    await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => !!document.activeElement?.closest("dialog[open]"))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(submit).toBeFocused();
  });
});
