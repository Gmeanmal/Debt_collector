import { expect, type Page } from "@playwright/test";

export const GODDESS = {
  email: process.env.E2E_GODDESS_EMAIL ?? "meanmal@debt-collector.uk",
  password: process.env.E2E_GODDESS_PASSWORD ?? "!Z#9by05NEnHsi*m%Q&8XKS$d2$%",
};

export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "admin+dev@debt-collector.uk",
  password: process.env.E2E_ADMIN_PASSWORD ?? "177@tTr$EbgA2CvMr@&4FM#DYaq6",
};

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.locator("input#email").fill(email);
  await page.locator("input#password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}
