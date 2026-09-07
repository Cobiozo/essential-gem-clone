import { test, expect } from "../playwright-fixture";

test("strona główna ma poprawne metadane SEO", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const title = await page.title();
  expect(title.length).toBeGreaterThan(5);
  expect(title).not.toMatch(/Lovable App|Lovable Generated Project/i);

  const desc = await page.locator('meta[name="description"]').getAttribute("content");
  expect(desc, "brak meta description").toBeTruthy();
  expect((desc ?? "").length).toBeGreaterThan(20);

  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport).toContain("width=device-width");
});

test("Open Graph i Twitter card są ustawione", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  for (const sel of ['meta[property="og:title"]', 'meta[property="og:description"]']) {
    await expect(page.locator(sel)).toHaveCount(1);
  }
});

test("manifest PWA jest dostępny i poprawny", async ({ page, request }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBeTruthy();

  const res = await request.get(href!);
  expect(res.status()).toBe(200);
  const manifest = await res.json();
  expect(manifest.name || manifest.short_name).toBeTruthy();
  expect(Array.isArray(manifest.icons) && manifest.icons.length).toBeTruthy();
});

test("robots.txt jest dostępny", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  expect((await res.text()).toLowerCase()).toContain("user-agent");
});
