import { expect, type Page } from "@playwright/test";

export const GODDESS = {
  email: process.env.E2E_GODDESS_EMAIL ?? "goddess@localhost",
  password: process.env.E2E_GODDESS_PASSWORD ?? "ChangeMe!Dev123",
};

export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@localhost",
  password: process.env.E2E_ADMIN_PASSWORD ?? "ChangeMe!Dev123",
};

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.locator("input#email").fill(email);
  await page.locator("input#password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}
