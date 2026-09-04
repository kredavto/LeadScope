import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

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
  await page.getByLabel("Утверждённый источник").selectOption("source-catalog");
  await page.getByLabel("Стартовый URL").fill("https://catalog.example.org/");
  await page.getByRole("button", { name: "Новое сканирование" }).last().click();
  const error = page.locator(".form-error");
  await expect(error).toContainText("имеет статус REVIEW_REQUIRED");
  await expect(error).toContainText("Сначала утвердите его в Реестре источников");
});

test("approved crawl saves extracted offers in the market map", async ({ page }) => {
  await page.route("**/api/extraction/offers", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      crawl: { url: "https://service.example.com/", pages: 2, changed: 1, duration: "2 сек", status: "COMPLETED", startedAt: "только что" },
      offers: [{ offer: "Срочный ремонт", company: "Пример Сервис", price: "9 900 ₽", change: "Новое", evidence: "https://service.example.com/prices", confidence: 93, fingerprint: "test-offer", contentHash: "abc", extractedAt: "2026-09-04T12:00:00Z", extractor: "deterministic-v1", sourceId: "source-service", status: "VERIFIED" }],
      mode: "deterministic",
      warnings: [],
    }),
  }));
  await page.goto("/crawls");
  await page.getByRole("button", { name: "Новое сканирование" }).click();
  await page.getByLabel("Утверждённый источник").selectOption("source-service");
  await page.getByLabel("Стартовый URL").fill("https://service.example.com/");
  await page.getByRole("button", { name: "Новое сканирование" }).last().click();
  await expect(page.getByText(/2 стр. · найдено 1 · обновлено 1/)).toBeVisible();
  await page.goto("/market-map");
  await expect(page.getByText("Срочный ремонт")).toBeVisible();
  await expect(page.getByText("9 900 ₽")).toBeVisible();
});

test("market map downloads an Excel-compatible table", async ({ page }) => {
  await page.goto("/market-map");
  await page.getByRole("button", { name: "Скачать карту CSV" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Скачать карту CSV" }).last().click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const csv = await readFile(path!, "utf8");
  const lines = csv.replace(/^\uFEFF/, "").split("\r\n");
  expect(lines[0]).toBe('"Предложение";"Компания";"Цена";"Изменение";"Provenance"');
  expect(lines).toHaveLength(4);
  expect(csv).not.toContain("fingerprint");
  expect(csv).not.toContain("contentHash");
});
