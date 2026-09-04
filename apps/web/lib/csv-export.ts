import type { WorkspaceRecord } from "./workspace-data";

export type CsvColumn = {
  key: string;
  header: string;
};

export const marketMapCsvColumns: CsvColumn[] = [
  { key: "offer", header: "Предложение" },
  { key: "company", header: "Компания" },
  { key: "price", header: "Цена" },
  { key: "change", header: "Изменение" },
  { key: "evidence", header: "Provenance" },
];

function escapeCell(value: unknown) {
  const text = String(value ?? "");
  const safe = /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function inferredColumns(records: WorkspaceRecord[]): CsvColumn[] {
  const keys = Array.from(new Set(records.flatMap((record) => Object.keys(record).filter((key) => typeof record[key] !== "object"))));
  return keys.map((key) => ({ key, header: key }));
}

export function buildExcelCsv(records: WorkspaceRecord[], columns?: CsvColumn[]) {
  const selectedColumns = columns?.length ? columns : inferredColumns(records);
  const rows = [
    selectedColumns.map((column) => escapeCell(column.header)).join(";"),
    ...records.map((record) => selectedColumns.map((column) => escapeCell(record[column.key])).join(";")),
  ];
  return `\uFEFF${rows.join("\r\n")}`;
}
