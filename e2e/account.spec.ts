/**
 * Account lifecycle in the browser: forgot password → reset link from the dev
 * email outbox (/dev/outbox, enabled for e2e by ACEAP_DEV_OUTBOX=1) → new
 * password → sign in with it; renaming in account settings; and deleting an
 * account. Uses freshly registered accounts so the shared demo world is untouched.
 */
import { expect, test, type Page } from "@playwright/test";
import { signOut } from "./helpers/auth";

const run = Date.now().toString(36);
const FIRST_PASSWORD = "first-password-2026";
const NEW_PASSWORD = "second-password-2026";

async function signUp(page: Page, name: string, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/signup");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL((url) => url.pathname === "/app");
  await expect(page.getByRole("button", { name: `Account menu for ${name}` })).toBeVisible();
}

async function passwordSignIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test.describe("account lifecycle", () => {
  test("forgot password: reset link from the dev outbox, new password works, link is single-use", async ({ page }) => {
    const name = "Robin Reset";
    const email = `robin-${run}@e2e.aceap.test`;
    await signUp(page, name, email, FIRST_PASSWORD);
    await signOut(page, name);

    await page.goto("/login");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByRole("heading", { level: 1, name: "Reset your password" })).toBeVisible();
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("status").filter({ hasText: "If an account exists for that email" })).toBeVisible();

    // An unknown address gets exactly the same answer.
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(`nobody-${run}@e2e.aceap.test`);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("status").filter({ hasText: "If an account exists for that email" })).toBeVisible();

    await page.goto("/dev/outbox");
    await expect(page.getByRole("heading", { level: 1, name: "Email outbox" })).toBeVisible();
    const message = page.locator("article").filter({ hasText: email }).first();
    await expect(message.getByRole("heading", { name: "Reset your AceAP password" })).toBeVisible();
    await expect(page.locator("article").filter({ hasText: `nobody-${run}` })).toHaveCount(0);
    const href = await message.getByRole("link").first().getAttribute("href");
    expect(href).toContain("/reset-password?token=");
    // APP_BASE_URL may point elsewhere; open the same path on this server.
    const link = new URL(href!);
    const resetPath = `${link.pathname}${link.search}`;

    await page.goto(resetPath);
    await expect(page.getByRole("heading", { level: 1, name: "Choose a new password" })).toBeVisible();
    await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
    await page.getByLabel("Confirm new password").fill("does-not-match-1");
    await page.getByRole("button", { name: "Set new password" }).click();
    await expect(page.getByText("The passwords don't match.")).toBeVisible();
    await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
    await page.getByLabel("Confirm new password").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Set new password" }).click();
    await page.waitForURL((url) => url.pathname === "/app");
    await expect(page.getByRole("button", { name: `Account menu for ${name}` })).toBeVisible();

    // The link worked once.
    await page.goto(resetPath);
    await expect(page.getByRole("alert").filter({ hasText: "invalid, has expired or was already used" })).toBeVisible();

    await page.goto("/app");
    await signOut(page, name);
    await passwordSignIn(page, email, FIRST_PASSWORD);
    await expect(page.getByRole("alert").filter({ hasText: "That email and password don't match." })).toBeVisible();
    await passwordSignIn(page, email, NEW_PASSWORD);
    await page.waitForURL((url) => url.pathname === "/app");
    await expect(page.getByRole("button", { name: `Account menu for ${name}` })).toBeVisible();
  });

  test("account settings: change the display name", async ({ page }) => {
    const email = `sasha-${run}@e2e.aceap.test`;
    await signUp(page, "Sasha Settings", email, FIRST_PASSWORD);

    await page.getByRole("button", { name: "Account menu for Sasha Settings" }).click();
    await page.getByRole("link", { name: "Account settings" }).click();
    await page.waitForURL((url) => url.pathname === "/app/settings");
    await expect(page.getByRole("heading", { level: 1, name: "Account settings" })).toBeVisible();

    await page.getByLabel("Full name").fill("Sasha Renamed");
    await page.getByRole("button", { name: "Save name" }).click();
    await expect(page.getByText("Saved. You're now shown as Sasha Renamed.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Account menu for Sasha Renamed" })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Full name")).toHaveValue("Sasha Renamed");
    await expect(page.getByRole("link", { name: "Download account JSON" })).toHaveAttribute("href", "/api/account/export");
  });

  test("delete my account: password + DELETE, then sign-in is refused", async ({ page }) => {
    const name = "Dana Delete";
    const email = `dana-${run}@e2e.aceap.test`;
    await signUp(page, name, email, FIRST_PASSWORD);
    await page.goto("/app/settings");

    const section = page.getByRole("region", { name: "Delete my account" });
    await section.getByLabel("Your password").fill(FIRST_PASSWORD);
    await section.getByLabel(/Type DELETE to confirm/).fill("delete");
    await section.getByRole("button", { name: "Delete my account" }).click();
    await expect(section.getByText("Type DELETE in capital letters to confirm.")).toBeVisible();

    await section.getByLabel("Your password").fill(FIRST_PASSWORD);
    await section.getByLabel(/Type DELETE to confirm/).fill("DELETE");
    await section.getByRole("button", { name: "Delete my account" }).click();
    await page.waitForURL((url) => url.pathname === "/login" && url.search.includes("deleted=1"));
    await expect(page.getByRole("status").filter({ hasText: "Your account has been deleted" })).toBeVisible();

    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
    await passwordSignIn(page, email, FIRST_PASSWORD);
    await expect(page.getByRole("alert").filter({ hasText: "That email and password don't match." })).toBeVisible();
  });
});
