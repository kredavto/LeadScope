import { expect, test } from "@playwright/test";

test("dashboard and mobile navigation are usable", async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Контроль спроса и лидов" })).toBeVisible();
  await expect(page.locator("body")).not.toHaveText("");
  await expect(page.locator("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay")).toHaveCount(0);
  if (page.viewportSize() && page.viewportSize()!.width < 760) {
    await page.getByRole("button", { name: "Открыть меню" }).click();
    await expect(page.getByRole("link", { name: "Входящие лиды" })).toBeVisible();
  }
  await page.screenshot({ path: testInfo.outputPath("dashboard.png"), fullPage: true });
  expect(consoleErrors).toEqual([]);
});

test("competitor workflow exposes a validated API form", async ({ page }) => {
  await page.goto("/competitors");
  await page.getByRole("button", { name: "Добавить конкурента" }).click();
  await expect(page.getByRole("dialog", { name: "Добавить конкурента" })).toBeVisible();
  await expect(page.getByLabel("Название конкурента")).toBeVisible();
  await expect(page.getByLabel("Домен")).toBeVisible();
});
