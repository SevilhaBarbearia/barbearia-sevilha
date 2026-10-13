import { test, expect } from "@playwright/test";

const SLUG = process.env.PLAYWRIGHT_SLUG ?? "sevilha";

test("página pública carrega com catálogo e barbeiros", async ({ page }) => {
  await page.goto(`/${SLUG}`);
  await expect(page.locator("h1").first()).toBeVisible();
  await page.screenshot({
    path: `tests/e2e/__screenshots__/${test.info().project.name}-home.png`,
    fullPage: true,
  });
});

test("reserva: abre a página e mostra o formulário", async ({ page }) => {
  await page.goto(`/${SLUG}/reservar`);
  await expect(page.getByRole("heading").first()).toBeVisible();
  await page.screenshot({
    path: `tests/e2e/__screenshots__/${test.info().project.name}-reservar.png`,
    fullPage: true,
  });
});
