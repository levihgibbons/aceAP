/**
 * Sign-in helpers for the seeded demo world.
 *
 * We use the one-click demo buttons on /login (section #demo) rather than the
 * password form: the password path is rate limited per email (8 per 10 min,
 * in memory), and a full run signs in as Alex far more often than that. The
 * demo buttons still create a normal session through the same startSession().
 */
import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "demo-password-2026";

export const ACCOUNTS = {
  alex: { email: "student@demo.aceap.test", name: "Alex Morgan", home: "/app", more: false },
  teacher: {
    email: "teacher@demo.aceap.test",
    name: "Jordan Rivera",
    home: "/teacher",
    more: false,
  },
  admin: { email: "admin@demo.aceap.test", name: "Morgan Admin", home: "/admin", more: false },
  avery: { email: "avery@demo.aceap.test", name: "Avery Brooks", home: "/app", more: true },
  sam: { email: "sam@demo.aceap.test", name: "Sam Patel", home: "/app", more: true },
  riley: { email: "riley@demo.aceap.test", name: "Riley Nguyen", home: "/app", more: true },
  jamie: { email: "jamie@demo.aceap.test", name: "Jamie Ortiz", home: "/app", more: true },
  taylor: { email: "taylor@demo.aceap.test", name: "Taylor Kim", home: "/app", more: true },
  indie: { email: "indie@demo.aceap.test", name: "Casey Fox", home: "/app", more: true },
  teacher2: {
    email: "teacher2@demo.aceap.test",
    name: "Dana Whitfield",
    home: "/teacher",
    more: true,
  },
} as const;

export type AccountKey = keyof typeof ACCOUNTS;

/** Clear any existing session, then sign in with the account's demo button. */
export async function signInAs(page: Page, who: AccountKey): Promise<void> {
  const account = ACCOUNTS[who];
  await page.context().clearCookies();
  await page.goto("/login");
  const demo = page.locator("#demo");
  if (account.more) await demo.getByText("More demo accounts").click();
  const button = demo.getByRole("button", { name: new RegExp(`^Sign in as ${account.name}\\b`) });
  await button.click();
  await page.waitForURL((url) => url.pathname === account.home);
  await expect(
    page.getByRole("button", { name: `Account menu for ${account.name}` }),
  ).toBeVisible();
}

/** Sign out through the account menu (a server-action form). */
export async function signOut(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: `Account menu for ${name}` }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL((url) => url.pathname === "/");
}
