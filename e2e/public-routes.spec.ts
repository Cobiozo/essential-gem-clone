import { test, expect } from "../playwright-fixture";

const PUBLIC_ROUTES = [
  "/",
  "/auth",
  "/install",
  "/calculator/influencer",
  "/calculator/specialist",
  "/aktualnosci",
  "/paid-events",
  "/weryfikacja-biletow",
  "/zdrowa-wiedza",
  "/wyzwanie-90",
  "/skills-assessment",
  "/konto-usuniete",
  "/reset-password",
];

for (const route of PUBLIC_ROUTES) {
  test(`route ${route} renderuje się bez błędów krytycznych`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });

    const res = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(res?.status(), `HTTP status dla ${route}`).toBeLessThan(400);

    // czekamy na hydratację Reacta
    await expect(page.locator("#root")).not.toBeEmpty({ timeout: 20000 });
    await page.waitForTimeout(1500);

    const rendered = await page.evaluate(
      () => (document.getElementById("root")?.childElementCount ?? 0) > 0,
    );
    expect(rendered, `strona ${route} nie wyrenderowała treści`).toBe(true);

    const fatal = errors.filter(
      (e) =>
        /is not defined|is not a function|Cannot read|Minified React error|Unexpected token|ChunkLoadError/i.test(
          e,
        ),
    );
    expect(fatal, `błędy krytyczne na ${route}: ${fatal.join(" | ")}`).toHaveLength(0);
  });
}

test("nieistniejąca trasa pokazuje stronę 404", async ({ page }) => {
  await page.goto("/ta-strona-nie-istnieje-xyz-123", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const text = await page.locator("body").innerText();
  expect(text.length).toBeGreaterThan(0);
});

test("/calculator kieruje na kalkulator lub logowanie", async ({ page }) => {
  await page.goto("/calculator", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  expect(page.url()).toMatch(/\/calculator\/influencer|\/auth/);
});

test("/auto-webinar kieruje na webinary lub logowanie", async ({ page }) => {
  await page.goto("/auto-webinar", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  expect(page.url()).toMatch(/\/events\/webinars|\/auth/);
});
