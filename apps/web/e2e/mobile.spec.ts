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
  await page.getByLabel("Название конкурента").fill("Тестовый конкурент");
  await page.getByLabel("Домен").fill("competitor.example.com");
  await page.getByLabel("Ниша").fill("Ремонт смартфонов");
  await page.getByRole("button", { name: "Добавить конкурента" }).last().click();
  await expect(page.getByText(/Готово/)).toBeVisible();
  await page.getByRole("button", { name: "Закрыть" }).last().click();
  await expect(page.getByText("Тестовый конкурент")).toBeVisible();
});

test("opportunity agent saves a structured result", async ({ page }) => {
  await page.route("**/api/agent/opportunity", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ mode: "ai", result: { title: "AI-тестовая возможность", segment: "B2B · Москва", summary: "Проверяемая возможность для быстрого рыночного пилота.", evidence: ["3 сигнала", "2 предложения"], score: 87, confidence: 91, nextSteps: ["Проверить evidence", "Запустить пилот"], compliance: "Использовать только разрешённые каналы и проверенные основания." } }) }));
  await page.goto("/");
  await page.getByRole("button", { name: "Найти возможность" }).click();
  await page.getByLabel(/Что особенно важно/).fill("быстрый B2B-пилот");
  await page.getByRole("button", { name: "Запустить агента" }).click();
  await expect(page.getByRole("heading", { name: "AI-тестовая возможность" })).toBeVisible();
  await page.getByRole("button", { name: "Сохранить возможность" }).click();
  await page.goto("/demand");
  await expect(page.getByText("AI-тестовая возможность")).toBeVisible();
});

test("crawl workflow reports the exact source validation error", async ({ page }) => {
  await page.goto("/crawls");
  await page.getByRole("button", { name: "Новое сканирование" }).click();
  await page.getByLabel("ID утверждённого источника").selectOption("source-catalog");
  await page.getByLabel("Стартовый URL").fill("https://catalog.example.org/");
  await page.getByRole("button", { name: "Новое сканирование" }).last().click();
  const error = page.locator(".form-error");
  await expect(error).toContainText("имеет статус REVIEW_REQUIRED");
  await expect(error).toContainText("Сначала утвердите его в Реестре источников");
});
