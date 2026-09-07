import { test, expect } from "../playwright-fixture";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

for (const vp of VIEWPORTS) {
  test(`strona główna bez poziomego przewijania — ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `poziome przewijanie ${overflow}px`).toBeLessThanOrEqual(2);
  });
}

test("strona logowania działa na telefonie", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/auth", { waitUntil: "domcontentloaded" });
  await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 15000 });
});
