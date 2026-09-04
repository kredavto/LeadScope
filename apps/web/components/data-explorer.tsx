"use client";

import { ChevronLeft, ChevronRight, Pencil, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { rowsForSection, sectionCollections, type Row, type Section } from "@/lib/section-data";
import { useWorkspace } from "./workspace-provider";
import { StatusPill } from "./status-pill";

const PAGE_SIZE = 6;

export function DataExplorer({ section, sectionKey }: { section: Section; sectionKey: string }) {
  const { workspace, updateRecord, removeRecord, addAudit, notify } = useWorkspace();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState(section.columns[0]?.key ?? "");
  const [ascending, setAscending] = useState(true);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Row | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const liveRows = useMemo(() => rowsForSection(sectionKey, workspace), [sectionKey, workspace]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru");
    return liveRows
      .filter((row) => !normalized || Object.values(row).some((value) => String(value).toLocaleLowerCase("ru").includes(normalized)))
      .filter((row) => filter === "ALL" || Object.values(row).some((value) => String(value).toUpperCase().includes(filter)))
      .sort((left, right) => String(left[sortKey] ?? "").localeCompare(String(right[sortKey] ?? ""), "ru", { numeric: true }) * (ascending ? 1 : -1));
  }, [ascending, filter, liveRows, query, sortKey]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const rows = visible.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function changeSort(key: string) {
    if (key === sortKey) setAscending((value) => !value);
    else { setSortKey(key); setAscending(true); }
  }

  function renderCell(row: Row, key: string, columnIndex: number) {
    const rawValue = row[key] ?? "—";
    const value = Array.isArray(rawValue) ? rawValue.join(", ") : typeof rawValue === "object" ? "Подробнее" : String(rawValue);
    if (["status", "decision"].includes(key)) return <StatusPill value={value} />;
    if (columnIndex === 0) return <div><div className="primary-cell">{value}</div>{row.domain ? <div className="secondary-cell">{String(row.domain)}</div> : null}</div>;
    if (key === "score" && Number.isFinite(Number(value))) return <div className="flex items-center gap-2"><b>{value}</b><div className="bar-track w-16"><div className="bar-fill" style={{ width: `${Number(value)}%` }} /></div></div>;
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
          <tbody>{rows.length ? rows.map((row, rowIndex) => <tr className="clickable-row" key={String(row.id ?? rowIndex)} onClick={() => { setSelected(row); setEditStatus(String(row.status ?? row.decision ?? "ACTIVE")); }}>{section.columns.map((column, columnIndex) => <td key={column.key}>{renderCell(row, column.key, columnIndex)}</td>)}</tr>) : <tr><td colSpan={section.columns.length}>Ничего не найдено</td></tr>}</tbody>
        </table>
      </div>
      <div className="pagination"><span>Показано {rows.length} из {visible.length}</span><div className="pager"><button onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={safePage === 0} aria-label="Предыдущая страница"><ChevronLeft size={13} /></button><button disabled>{safePage + 1} / {pages}</button><button onClick={() => setPage((value) => Math.min(pages - 1, value + 1))} disabled={safePage >= pages - 1} aria-label="Следующая страница"><ChevronRight size={13} /></button></div></div>
      {selected ? <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}><section className="modal-card" role="dialog" aria-modal="true" aria-label="Карточка записи" onMouseDown={(event) => event.stopPropagation()}>
        <div className="card-head"><div><div className="card-title">Карточка записи</div><div className="card-note">ID: {String(selected.id ?? "—")}</div></div><button className="icon-btn" onClick={() => setSelected(null)} aria-label="Закрыть"><X size={16}/></button></div>
        <div className="card-body"><dl className="record-grid">{Object.entries(selected).filter(([key]) => !["timeline", "originCollection"].includes(key)).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd></div>)}</dl>
          {sectionCollections[sectionKey] && sectionKey !== "audit" ? <div className="field mt-5"><label htmlFor="record-status">Изменить статус</label><select id="record-status" value={editStatus} onChange={(event) => setEditStatus(event.target.value)}><option>ACTIVE</option><option>APPROVED</option><option>REVIEW_REQUIRED</option><option>BLOCKED</option><option>COMPLETED</option><option>ARCHIVED</option></select></div> : null}
          <div className="modal-actions"><button className="btn" onClick={() => setSelected(null)}>Закрыть</button>{sectionCollections[sectionKey] && sectionKey !== "audit" ? <><button className="btn danger" onClick={() => { const collection = sectionCollections[sectionKey]; const id = String(selected.id ?? ""); if (!collection || !id) return; removeRecord(collection, id); addAudit("RECORD_DELETE", id); notify("Запись удалена", section.title); setSelected(null); }}><Trash2 size={14}/>Удалить</button><button className="btn primary" onClick={() => { const collection = sectionCollections[sectionKey]; const id = String(selected.id ?? ""); if (!collection || !id) return; updateRecord(collection, id, { status: editStatus }); addAudit("RECORD_UPDATE", id); notify("Статус обновлён", `${section.title}: ${editStatus}`); setSelected(null); }}><Pencil size={14}/>Сохранить</button></> : null}</div>
        </div>
      </section></div> : null}
    </div>
  );
}
