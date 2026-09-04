import { describe, expect, it } from "vitest";
import { buildExcelCsv, marketMapCsvColumns } from "./csv-export";

describe("Excel CSV export", () => {
  it("exports the market map as a semicolon-delimited table with localized headers", () => {
    const csv = buildExcelCsv([
      { id: "offer-1", offer: "Автокредит", company: "Финанс Авто", price: "от 12,9%", change: "+0,4 п.п.", evidence: "https://example.com/rates", fingerprint: "internal" },
      { id: "offer-2", offer: "Диагностика", company: "Пример Сервис", price: "Бесплатно", change: "—", evidence: "https://example.com/diagnostics", contentHash: "internal" },
    ], marketMapCsvColumns);

    const lines = csv.slice(1).split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('"Предложение";"Компания";"Цена";"Изменение";"Provenance"');
    expect(lines[1]).toBe('"Автокредит";"Финанс Авто";"от 12,9%";"\'+0,4 п.п.";"https://example.com/rates"');
    expect(csv).not.toContain("fingerprint");
    expect(csv).not.toContain("contentHash");
  });

  it("neutralizes spreadsheet formulas", () => {
    const csv = buildExcelCsv([{ id: "offer-1", offer: "=HYPERLINK(\"bad\")" }], [{ key: "offer", header: "Предложение" }]);
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
  });
});
