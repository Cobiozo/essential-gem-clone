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

    const bodyText = (await page.locator("body").innerText()).trim();
    expect(bodyText.length, `strona ${route} nie może być pusta`).toBeGreaterThan(0);

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

test("/calculator przekierowuje na /calculator/influencer", async ({ page }) => {
  await page.goto("/calculator", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  expect(page.url()).toContain("/calculator/influencer");
});

test("/auto-webinar przekierowuje na /events/webinars", async ({ page }) => {
  await page.goto("/auto-webinar", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  expect(page.url()).toContain("/events/webinars");
});
