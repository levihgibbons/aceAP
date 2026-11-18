/**
 * Authentication and role routing: signed-out redirects, demo sign-in,
 * sign-out, a wrong password, and role guards on /teacher and /admin.
 */
import { expect, test } from "@playwright/test";
import { ACCOUNTS, DEMO_PASSWORD, signInAs, signOut } from "./helpers/auth";

test.describe("authentication", () => {
  test("signed-out /app redirects to /login with a next parameter", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login\?next=%2Fapp$/);
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
    await expect(page.getByText("Sign in to continue to that page.")).toBeVisible();
  });

  test("demo sign-in as the student lands on /app, and sign-out ends the session", async ({
    page,
  }) => {
    await signInAs(page, "alex");
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole("heading", { level: 1, name: /Welcome back, Alex/ })).toBeVisible();

    await signOut(page, ACCOUNTS.alex.name);
    // The session is really gone: the signed-in area bounces back to /login.
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
  });

  test("password sign-in works and a wrong password shows an error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ACCOUNTS.sam.email);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    // (Next's route announcer is also role=alert, so match the message itself.)
    await expect(
      page.getByRole("alert").filter({ hasText: "That email and password don't match." }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    // The email is kept, the password is not.
    await expect(page.getByLabel("Email")).toHaveValue(ACCOUNTS.sam.email);
    await expect(page.getByLabel("Password")).toHaveValue("");

    await page.getByLabel("Password").fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/app");
    await expect(
      page.getByRole("button", { name: `Account menu for ${ACCOUNTS.sam.name}` }),
    ).toBeVisible();
  });

  test("a student cannot open the teacher area", async ({ page }) => {
    await signInAs(page, "alex");
    await page.goto("/teacher");
    await expect(page).toHaveURL(/\/app$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/app$/);
  });

  test("a teacher cannot open the platform admin area", async ({ page }) => {
    await signInAs(page, "teacher");
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin/);
    await expect(page).toHaveURL(/\/teacher$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
