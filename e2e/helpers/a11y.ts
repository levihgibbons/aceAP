/**
 * Automated accessibility scans with axe-core (WCAG 2.0/2.1 A + AA rules).
 *
 *   const audit = new A11yAudit(testInfo);
 *   await audit.scan(page, "student home");
 *   audit.finish(); // attaches JSON, prints a summary, fails on serious/critical
 *
 * Serious and critical WCAG violations fail the test (soft, so one run
 * reports every page). Moderate and minor ones, and axe best-practice findings
 * of any impact, are reported in the output and in the attached JSON. Pages owned by other workstreams can be scanned with
 * `{ enforce: false }`: their findings are reported but don't fail the test.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";
import type { Result } from "axe-core";
import { THEME_STORAGE_KEY } from "../../src/components/shell/theme";

export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
/** Also run axe's best-practice rules (headings, landmarks…) — reported, never blocking. */
const ADVISORY_TAGS = ["best-practice"];
const BLOCKING = new Set(["serious", "critical"]);

export type Theme = "light" | "dark";

interface PageFinding {
  page: string;
  theme: Theme;
  url: string;
  enforced: boolean;
  violations: {
    id: string;
    wcag: boolean;
    impact: string | null | undefined;
    help: string;
    helpUrl: string;
    nodes: { target: string; summary: string; html: string }[];
  }[];
}

/** Persist the theme the same way ThemeToggle does (localStorage + data-theme). */
export async function setTheme(page: Page, theme: Theme): Promise<void> {
  await page.evaluate(
    ([key, value]) => {
      try {
        localStorage.setItem(key, value);
      } catch {}
      document.documentElement.setAttribute("data-theme", value);
    },
    [THEME_STORAGE_KEY, theme] as const,
  );
}

/** Wait for client islands, transitions and dynamic imports to settle before scanning. */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("load");
  await expect(page.locator('[aria-busy="true"]:visible')).toHaveCount(0, { timeout: 15_000 });
  // Entry animations (opacity) skew contrast results; reduced motion makes them ~instant.
  await page.waitForTimeout(150);
}

function isWcag(v: Result): boolean {
  return v.tags.some((t) => WCAG_TAGS.includes(t));
}

export class A11yAudit {
  private findings: PageFinding[] = [];
  constructor(private readonly testInfo: TestInfo) {}

  async scan(
    page: Page,
    name: string,
    opts: { enforce?: boolean; include?: string; theme?: Theme } = {},
  ): Promise<Result[]> {
    const theme =
      opts.theme ??
      ((await page.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "dark"
        ? "dark"
        : "light");
    await settle(page);
    let builder = new AxeBuilder({ page }).withTags([...WCAG_TAGS, ...ADVISORY_TAGS]);
    if (opts.include) builder = builder.include(opts.include);
    const results = await builder.analyze();
    const enforced = opts.enforce ?? true;
    this.findings.push({
      page: name,
      theme,
      url: new URL(page.url()).pathname + new URL(page.url()).search,
      enforced,
      violations: results.violations.map((v) => ({
        id: v.id,
        wcag: isWcag(v),
        impact: v.impact,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map((n) => ({
          target: n.target.join(" "),
          summary: (n.failureSummary ?? "").replace(/\s+/g, " ").slice(0, 300),
          html: n.html.slice(0, 200),
        })),
      })),
    });
    if (enforced) {
      const blocking = results.violations.filter((v) => isWcag(v) && BLOCKING.has(v.impact ?? ""));
      expect
        .soft(
          blocking.map(
            (v) =>
              `${v.impact} ${v.id}: ${v.help} — ${v.nodes
                .slice(0, 4)
                .map((n) => n.target.join(" "))
                .join(" | ")}${v.nodes.length > 4 ? ` (+${v.nodes.length - 4} more)` : ""}`,
          ),
          `serious/critical axe violations on "${name}" (${theme})`,
        )
        .toEqual([]);
    }
    return results.violations;
  }

  async finish(): Promise<void> {
    const lines: string[] = [];
    const counts: Record<string, number> = {};
    for (const f of this.findings) {
      const tag = `${f.page} [${f.theme}]${f.enforced ? "" : " (report only)"}`;
      if (f.violations.length === 0) {
        lines.push(`  ok   ${tag}`);
        continue;
      }
      for (const v of f.violations) {
        counts[v.impact ?? "unknown"] = (counts[v.impact ?? "unknown"] ?? 0) + v.nodes.length;
        lines.push(
          `  ${String(v.impact).padEnd(8)} ${tag}: ${v.id}${v.wcag ? "" : " (best practice)"} ×${v.nodes.length} — ${v.help}`,
        );
        for (const n of v.nodes.slice(0, 3)) lines.push(`             ${n.target}`);
      }
    }
    const summary = Object.entries(counts)
      .map(([k, n]) => `${k}: ${n}`)
      .join(", ");
    console.log(
      `\naxe (${[...WCAG_TAGS, ...ADVISORY_TAGS].join(", ")}) — ${this.findings.length} scans; affected nodes by impact: ${summary || "none"}\n${lines.join("\n")}\n`,
    );
    await this.testInfo.attach("axe-results.json", {
      body: JSON.stringify(this.findings, null, 2),
      contentType: "application/json",
    });
  }
}
