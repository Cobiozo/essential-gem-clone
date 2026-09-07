import { test, expect } from "../playwright-fixture";

test("formularz logowania jest widoczny i interaktywny", async ({ page }) => {
  await page.goto("/auth", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const email = page.locator('input[type="email"]').first();
  const password = page.locator('input[type="password"]').first();

  await expect(email).toBeVisible({ timeout: 15000 });
  await expect(password).toBeVisible();

  await email.fill("test.playwright@example.com");
  await password.fill("NiepoprawneHaslo123!");
  await expect(email).toHaveValue("test.playwright@example.com");
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
