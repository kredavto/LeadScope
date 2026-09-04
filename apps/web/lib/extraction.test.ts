import { describe, expect, it } from "vitest";
import { deduplicateOffers, extractDeterministicOffers, extractInternalLinks, extractionSnippet } from "./extraction";

describe("deterministic offer extraction", () => {
  it("extracts JSON-LD and visible prices with provenance", () => {
    const html = `<html><head><title>Ремонт</title><script type="application/ld+json">{"@type":"Product","name":"Замена экрана","offers":{"@type":"Offer","price":"7500","priceCurrency":"RUB"}}</script></head><body><p>Диагностика — бесплатно</p></body></html>`;
    const offers = extractDeterministicOffers(html, "https://example.com/services", "Пример Сервис");
    expect(offers).toEqual(expect.arrayContaining([
      expect.objectContaining({ offer: "Замена экрана", price: "7500 ₽", evidence: "https://example.com/services" }),
      expect.objectContaining({ price: expect.stringMatching(/бесплатно/i) }),
    ]));
  });

  it("keeps only same-host HTML crawl candidates", () => {
    const html = `<a href="/prices">Цены</a><a href="https://evil.example/product">Чужой сайт</a><a href="/catalog.pdf">PDF</a>`;
    expect(extractInternalLinks(html, "https://example.com/")).toEqual(["https://example.com/prices"]);
  });

  it("redacts contacts before optional AI extraction", () => {
    const snippet = extractionSnippet("<p>Тариф 10 000 ₽, sales@example.com, +7 999 123-45-67</p>");
    expect(snippet).not.toContain("sales@example.com");
    expect(snippet).not.toContain("999");
  });

  it("deduplicates the same offer found on several pages", () => {
    const offers = deduplicateOffers([
      { offer: "Кредит под залог авто", company: "Мос-Капитал", price: "от 3%", evidence: "https://example.com/", confidence: 80, extractor: "ai-assisted-v1" },
      { offer: "Кредит под залог авто", company: "Мос-Капитал", price: "от 2%", evidence: "https://example.com/credit", confidence: 95, extractor: "ai-assisted-v1" },
    ]);
    expect(offers).toEqual([expect.objectContaining({ price: "от 2%", confidence: 95 })]);
  });
});
