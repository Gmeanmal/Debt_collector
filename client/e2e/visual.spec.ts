import { expect, test } from "@playwright/test";
import { ADMIN, GODDESS, login } from "./fixtures/auth";

test.describe("visual regression", () => {
  test("login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("form")).toBeVisible();
    await expect(page).toHaveScreenshot("login.png", { fullPage: true });
  });

  test("goddess dashboard", async ({ page }) => {
    await login(page, GODDESS.email, GODDESS.password);
    await page.goto("/goddess/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("goddess-dashboard.png", { fullPage: true });
  });

  test("goddess contracts list", async ({ page }) => {
    await login(page, GODDESS.email, GODDESS.password);
    await page.goto("/goddess/debts");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("goddess-contracts.png", { fullPage: true });
  });

  test("goddess blacklist", async ({ page }) => {
    await login(page, GODDESS.email, GODDESS.password);
    await page.goto("/goddess/blacklist");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("goddess-blacklist.png", { fullPage: true });
  });

  test("admin console", async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("admin-console.png", { fullPage: true });
  });

  test("admin cron", async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin/cron");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("admin-cron.png", { fullPage: true });
  });
});
