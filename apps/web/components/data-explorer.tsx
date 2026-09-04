"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Row, Section } from "@/lib/section-data";
import { StatusPill } from "./status-pill";

const PAGE_SIZE = 6;

export function DataExplorer({ section }: { section: Section }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState(section.columns[0]?.key ?? "");
  const [ascending, setAscending] = useState(true);
  const [page, setPage] = useState(0);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru");
    return section.rows
      .filter((row) => !normalized || Object.values(row).some((value) => String(value).toLocaleLowerCase("ru").includes(normalized)))
      .filter((row) => filter === "ALL" || Object.values(row).some((value) => String(value).toUpperCase().includes(filter)))
      .sort((left, right) => String(left[sortKey] ?? "").localeCompare(String(right[sortKey] ?? ""), "ru", { numeric: true }) * (ascending ? 1 : -1));
  }, [ascending, filter, query, section.rows, sortKey]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const rows = visible.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function changeSort(key: string) {
    if (key === sortKey) setAscending((value) => !value);
    else { setSortKey(key); setAscending(true); }
  }

  function renderCell(row: Row, key: string, columnIndex: number) {
    const value = row[key] ?? "—";
    if (["status", "decision"].includes(key)) return <StatusPill value={value} />;
    if (columnIndex === 0) return <div><div className="primary-cell">{value}</div>{row.domain ? <div className="secondary-cell">{row.domain}</div> : null}</div>;
    if (key === "score" && typeof value === "number") return <div className="flex items-center gap-2"><b>{value}</b><div className="bar-track w-16"><div className="bar-fill" style={{ width: `${value}%` }} /></div></div>;
    return String(value);
  }

  return (
    <div className="card">
      <div className="table-tools">
        <div className="search"><Search size={14} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Поиск по таблице…" aria-label="Поиск" /></div>
        <div className="select-wrap"><select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(0); }} aria-label="Фильтр"><option value="ALL">Все статусы</option><option value="APPROVED">Approved</option><option value="REVIEW">Review</option><option value="BLOCKED">Blocked</option><option value="ACTIVE">Active</option></select></div>
      </div>
      <div className="table-scroll">
        <table>
          <thead><tr>{section.columns.map((column) => <th key={column.key} onClick={() => changeSort(column.key)} aria-sort={sortKey === column.key ? (ascending ? "ascending" : "descending") : "none"}>{column.label}{sortKey === column.key ? (ascending ? " ↑" : " ↓") : ""}</th>)}</tr></thead>
          <tbody>{rows.length ? rows.map((row, rowIndex) => <tr key={`${Object.values(row)[0]}-${rowIndex}`}>{section.columns.map((column, columnIndex) => <td key={column.key}>{renderCell(row, column.key, columnIndex)}</td>)}</tr>) : <tr><td colSpan={section.columns.length}>Ничего не найдено</td></tr>}</tbody>
        </table>
      </div>
      <div className="pagination"><span>Показано {rows.length} из {visible.length}</span><div className="pager"><button onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={safePage === 0} aria-label="Предыдущая страница"><ChevronLeft size={13} /></button><button disabled>{safePage + 1} / {pages}</button><button onClick={() => setPage((value) => Math.min(pages - 1, value + 1))} disabled={safePage >= pages - 1} aria-label="Следующая страница"><ChevronRight size={13} /></button></div></div>
    </div>
  );
}

