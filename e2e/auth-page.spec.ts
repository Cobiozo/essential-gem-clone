import { test, expect } from "../playwright-fixture";

test("formularz logowania jest widoczny i interaktywny", async ({ page }) => {
  await page.goto("/auth", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const identifier = page.locator("#loginIdentifier");
  const password = page.locator("#password");

  await expect(identifier).toBeVisible({ timeout: 20000 });
  await expect(password).toBeVisible();

  await identifier.fill("test.playwright@example.com");
  await password.fill("NiepoprawneHaslo123!");
  await expect(identifier).toHaveValue("test.playwright@example.com");
  await expect(page.locator('form button[type="submit"]').first()).toBeVisible();
});

test("chronione trasy przekierowują niezalogowanego użytkownika", async ({ page }) => {
  for (const route of ["/dashboard", "/admin", "/my-account"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    expect(page.url(), `trasa ${route} nie powinna zostać otwarta bez logowania`).not.toContain(
      route,
    );
  }
});
