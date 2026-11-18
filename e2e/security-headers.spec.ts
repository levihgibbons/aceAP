/**
 * Security headers: a nonce-based Content-Security-Policy on every page (a
 * fresh nonce per response, stamped on every inline script), the classic
 * hardening headers, a locked-down CSP and no-store on API responses, and —
 * the part that matters in practice — no CSP violations while the heaviest
 * pages run (KaTeX lessons, a simulation, the @xyflow/react vault graph, the
 * mastery heatmap, the gradebook).
 *
 * Violations are collected from `securitypolicyviolation` events (installed
 * before any page script by an init script) and from Chrome's console
 * "Refused to …" messages.
 */
import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./helpers/auth";

const CLASS_NAME = "AP Calculus AB — Period 2";

function directives(csp: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const part of csp.split(";")) {
    const [name, ...values] = part.trim().split(/\s+/);
    if (name) map.set(name, values);
  }
  return map;
}

function nonceOf(csp: string): string {
  const m = csp.match(/'nonce-([A-Za-z0-9+/=]+)'/);
  expect(m, `nonce in CSP: ${csp}`).toBeTruthy();
  return m![1];
}

interface Violation {
  directive: string;
  blocked: string;
  sample: string;
  source: string;
}

/**
 * Record CSP violations. The returned function drains the current document's
 * events and returns everything seen so far � call it before leaving a page.
 */
async function watchCsp(page: Page): Promise<() => Promise<string[]>> {
  const consoleRefusals: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (/Content Security Policy|Refused to (load|execute|apply|connect|frame)/i.test(text))
      consoleRefusals.push(`${page.url()}: ${text}`);
  });
  await page.addInitScript(() => {
    const w = window as unknown as { __csp: Violation[] };
    w.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      w.__csp.push({
        directive: e.violatedDirective,
        blocked: e.blockedURI,
        sample: e.sample,
        source: `${e.sourceFile}:${e.lineNumber}`,
      });
    });
  });
  const seen: string[] = [];
  return async () => {
    // Drain this document's events (call after each page you want covered).
    const found = await page.evaluate(() => {
      const w = window as unknown as { __csp?: Violation[] };
      const out = w.__csp ?? [];
      w.__csp = [];
      return out;
    });
    for (const v of found)
      seen.push(`${page.url()}: ${v.directive} blocked ${v.blocked} (${v.sample}) at ${v.source}`);
    return [...seen, ...consoleRefusals];
  };
}

test.describe("security headers", () => {
  test("pages get a strict nonce-based CSP and the hardening headers", async ({ request }) => {
    const res = await request.get("/login");
    expect(res.status()).toBe(200);
    const h = res.headers();
    const csp = h["content-security-policy"];
    expect(csp, "CSP header on /login").toBeTruthy();
    const d = directives(csp);
    const nonce = nonceOf(csp);

    expect(d.get("default-src")).toEqual(["'self'"]);
    expect(d.get("script-src")).toEqual(["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"]);
    expect(csp).not.toContain("unsafe-eval");
    expect(d.get("script-src")).not.toContain("'unsafe-inline'");
    expect(d.get("style-src-elem")).toEqual(["'self'", `'nonce-${nonce}'`]);
    expect(d.get("style-src-attr")).toEqual(["'unsafe-inline'"]);
    expect(d.get("object-src")).toEqual(["'none'"]);
    expect(d.get("base-uri")).toEqual(["'self'"]);
    expect(d.get("form-action")).toEqual(["'self'"]);
    expect(d.get("frame-ancestors")).toEqual(["'self'"]);
    expect(d.get("connect-src")).toEqual(["'self'"]);
    expect(d.get("img-src")).toEqual(["'self'", "data:", "blob:"]);
    expect(d.get("font-src")).toEqual(["'self'", "data:"]);
    // Plain-http e2e server: upgrading would break every subresource.
    expect(d.has("upgrade-insecure-requests")).toBe(false);
    expect(h["strict-transport-security"]).toBeUndefined();

    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("SAMEORIGIN");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["permissions-policy"]).toContain("microphone=()");
    expect(h["x-powered-by"]).toBeUndefined();

    // Every inline and external <script> in the server HTML carries this response's nonce.
    const html = await res.text();
    const scripts = html.match(/<script\b[^>]*>/g) ?? [];
    expect(scripts.length).toBeGreaterThan(0);
    for (const tag of scripts) expect(tag, "script tag nonce").toContain(`nonce="${nonce}"`);

    // A fresh nonce per response.
    const again = await request.get("/login");
    expect(nonceOf(again.headers()["content-security-policy"])).not.toBe(nonce);
  });

  test("the landing page and the signed-out redirect keep working under the proxy", async ({
    request,
  }) => {
    const home = await request.get("/");
    expect(home.status()).toBe(200);
    expect(home.headers()["content-security-policy"]).toContain("'strict-dynamic'");

    for (const path of ["/app", "/teacher/classes", "/admin"]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(307);
      expect(res.headers()["location"], path).toMatch(
        new RegExp(
          `/login\\?next=${encodeURIComponent(path).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        ),
      );
    }
  });

  test("LTI pages may post back to the LMS: no form-action there, everything else still strict", async ({
    request,
  }) => {
    const res = await request.get("/lti/link");
    const csp = res.headers()["content-security-policy"];
    expect(csp).toBeTruthy();
    const d = directives(csp);
    expect(d.has("form-action")).toBe(false);
    expect(d.get("script-src")).toContain("'strict-dynamic'");
    expect(d.get("object-src")).toEqual(["'none'"]);
  });

  test("framing: LTI routes may be framed by the LMS hosts, every other page only by AceAP", async ({
    request,
  }) => {
    const LMS = ["'self'", "https://*.instructure.com", "https://*.canvaslms.com"]; // LTI_ALLOWED_HOSTS default

    for (const path of ["/", "/login", "/app"]) {
      const res = await request.get(path, { maxRedirects: 0 });
      if (res.status() === 200) {
        expect(
          directives(res.headers()["content-security-policy"]).get("frame-ancestors"),
          path,
        ).toEqual(["'self'"]);
      }
      expect(res.headers()["x-frame-options"], path).toBe("SAMEORIGIN");
    }

    for (const path of ["/lti/link", "/lti/deep-link"]) {
      const res = await request.get(path);
      const h = res.headers();
      expect(directives(h["content-security-policy"]).get("frame-ancestors"), path).toEqual(LMS);
      // X-Frame-Options can't express an allow-list, so it is not sent on LTI routes.
      expect(h["x-frame-options"], path).toBeUndefined();
      expect(h["x-content-type-options"], path).toBe("nosniff");
    }

    // Launch error pages (HTML from the route handler) get the same framing policy.
    const launch = await request.post("/api/lti/launch", { form: { nothing: "here" } });
    expect(launch.status()).toBe(400);
    const lh = launch.headers();
    expect(lh["x-frame-options"]).toBeUndefined();
    const ld = directives(lh["content-security-policy"]);
    expect(ld.get("frame-ancestors")).toEqual(LMS);
    expect(ld.get("default-src")).toEqual(["'none'"]);

    // Other API routes stay unframeable.
    const api = await request.get("/api/vault/graph");
    expect(directives(api.headers()["content-security-policy"]).get("frame-ancestors")).toEqual([
      "'none'",
    ]);
    expect(api.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  });

  test("API responses are no-store with a locked-down CSP", async ({ page }) => {
    // Unauthenticated: a JSON error, still locked down.
    const anon = await page.request.get("/api/vault/graph");
    expect(anon.status()).toBe(401);
    expect(anon.headers()["content-security-policy"]).toBe(
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
    expect(anon.headers()["x-content-type-options"]).toBe("nosniff");

    await signInAs(page, "alex");
    const res = await page.request.get("/api/vault/graph");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("no-store");
    expect(res.headers()["content-type"]).toMatch(/json/);
    expect(res.headers()["content-security-policy"]).toContain("default-src 'none'");
    // Static assets and the service worker are not given a page CSP.
    const sw = await page.request.get("/sw.js");
    expect(sw.headers()["content-security-policy"]).toBeUndefined();
    expect(sw.headers()["cache-control"]).toContain("no-store");
  });

  test("no CSP violations on the heaviest student pages", async ({ page }) => {
    test.setTimeout(120_000);
    const violations = await watchCsp(page);
    await signInAs(page, "indie");

    await page.goto("/app");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await violations();

    // KaTeX-rendered lesson with an embedded simulation (client-only dynamic import).
    await page.goto("/app/learn/calculus-ab.l.chain-rule");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.getByLabel("Loading simulation…")).toHaveCount(0);
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    await expect(
      page
        .locator("svg")
        .filter({ has: page.locator("path") })
        .first(),
    ).toBeVisible();
    expect(await violations()).toEqual([]);
  });

  test("no CSP violations on the vault graph (@xyflow/react)", async ({ page }) => {
    const violations = await watchCsp(page);
    await signInAs(page, "alex");
    await page.goto("/app/vault/graph");
    await expect(page.locator(".react-flow__node").first()).toBeVisible();
    expect(await violations()).toEqual([]);
  });

  test("no CSP violations on the teacher heatmap (with drawer) and gradebook", async ({ page }) => {
    test.setTimeout(120_000);
    const violations = await watchCsp(page);
    await signInAs(page, "teacher");
    await page.goto("/teacher/classes");
    await page.getByRole("link", { name: CLASS_NAME, exact: true }).click();
    await expect(page).toHaveURL(/\/teacher\/classes\/[0-9a-f-]+$/);
    const classUrl = page.url();

    await page.goto(`${classUrl}/mastery`);
    const heatmap = page.getByRole("region", { name: "Mastery heatmap (scrolls horizontally)" });
    const cell = heatmap.getByRole("button", { name: /, objective .*: (?!no evidence)/ }).first();
    await cell.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await violations();

    const classId = classUrl.split("/").pop();
    await page.goto(`/teacher/gradebook?class=${classId}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await violations()).toEqual([]);
  });
});
