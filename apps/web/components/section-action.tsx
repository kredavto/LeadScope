"use client";

import { CheckCircle2, Plus, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { CollectionKey, WorkspaceRecord } from "@/lib/workspace-data";
import { useWorkspace } from "./workspace-provider";

type Field = { key: string; label: string; placeholder?: string; options?: string[]; required?: boolean };

const fieldMap: Record<string, Field[]> = {
  niches: [{ key: "name", label: "Название шаблона", required: true }, { key: "market", label: "Рынок", options: ["B2C", "B2B"] }, { key: "sensitivity", label: "Чувствительность", options: ["NORMAL", "FINANCIAL", "HEALTH", "CHILDREN", "LEGAL"] }],
  competitors: [{ key: "name", label: "Название конкурента", required: true }, { key: "domain", label: "Домен", placeholder: "example.com", required: true }, { key: "niche", label: "Ниша", required: true }],
  sources: [{ key: "url", label: "Публичный URL", placeholder: "https://example.com", required: true }, { key: "owner", label: "Владелец" }, { key: "legalBasis", label: "Основание", required: true }, { key: "robots", label: "Robots", options: ["CHECKED", "ALLOWED", "DENIED"] }],
  crawls: [{ key: "sourceId", label: "ID утверждённого источника", required: true }, { key: "url", label: "Стартовый URL", required: true }],
  accounts: [{ key: "company", label: "Компания", required: true }, { key: "domain", label: "Домен", required: true }, { key: "industry", label: "Отрасль", required: true }, { key: "size", label: "Размер", options: ["1–10", "11–50", "51–200", "201–500", "500+"] }],
  signals: [{ key: "company", label: "Компания", required: true }, { key: "signal", label: "Сигнал", required: true }, { key: "type", label: "Тип", options: ["TENDER", "VACANCY", "EXPANSION", "TECH_CHANGE"] }],
  contacts: [{ key: "company", label: "Компания", required: true }, { key: "contact", label: "Публичный деловой контакт", required: true }, { key: "kind", label: "Тип", options: ["ROLE_EMAIL", "COMPANY_PHONE"] }, { key: "source", label: "Источник", required: true }],
  leads: [{ key: "identity", label: "E-mail или телефон", required: true }, { key: "source", label: "Источник", options: ["FIRST_PARTY_FORM", "PARTNER"] }, { key: "consent", label: "Согласие", options: ["VERIFIED", "INCOMPLETE"] }, { key: "purpose", label: "Цель обработки", required: true }],
  suppression: [{ key: "identity", label: "E-mail или телефон (будет хеширован)", required: true }, { key: "channel", label: "Канал", options: ["EMAIL", "PHONE"] }, { key: "reason", label: "Причина", options: ["REVOKED", "OPT_OUT", "LEGAL_BLOCK"] }],
  "data-requests": [{ key: "subject", label: "Субъект (маскируется)", required: true }, { key: "type", label: "Тип", options: ["ACCESS", "DELETE", "CORRECT", "RESTRICT", "REVOKE"] }, { key: "owner", label: "Исполнитель", required: true }],
  policies: [{ key: "rule", label: "Правило", required: true }, { key: "scope", label: "Область", required: true }, { key: "decision", label: "Решение", options: ["ALLOW", "REVIEW_REQUIRED", "BLOCK"] }],
  settings: [{ key: "workspaceName", label: "Название workspace", required: true }, { key: "country", label: "Страна", required: true }, { key: "region", label: "Регион", required: true }, { key: "crawlerContact", label: "Контакт crawler-оператора", required: true }],
};

function maskIdentity(value: string) {
  const normalized = value.trim();
  if (normalized.includes("@")) {
    const [local, domain] = normalized.split("@");
    return `${local.slice(0, 1)}•••@${domain}`;
  }
  return `+••• ••• •• ${normalized.replace(/\D/g, "").slice(-2) || "00"}`;
}

async function identityHash(value: string) {
  const bytes = new TextEncoder().encode(value.trim().toLocaleLowerCase("ru"));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

function downloadCsv(name: string, records: WorkspaceRecord[]) {
  const keys = Array.from(new Set(records.flatMap((record) => Object.keys(record).filter((key) => typeof record[key] !== "object"))));
  const safe = (value: unknown) => {
    const text = String(value ?? "");
    const neutralized = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${neutralized.replaceAll('"', '""')}"`;
  };
  const csv = [keys.map(safe).join(","), ...records.map((record) => keys.map((key) => safe(record[key])).join(","))].join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function SectionAction({ sectionKey, label }: { sectionKey: string; label: string }) {
  const { workspace, addRecord, updateRecord, addAudit, notify, saveSettings } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [values, setValues] = useState<Record<string, string>>({ market: "B2C", sensitivity: "NORMAL", robots: "CHECKED", type: "TENDER", kind: "ROLE_EMAIL", source: "FIRST_PARTY_FORM", consent: "VERIFIED", channel: "EMAIL", reason: "REVOKED", decision: "ALLOW", size: "11–50", workspaceName: workspace.settings.workspaceName, country: workspace.settings.country, region: workspace.settings.region, crawlerContact: workspace.settings.crawlerContact });
  const fields = useMemo(() => fieldMap[sectionKey] ?? [], [sectionKey]);

  function record(collection: CollectionKey, data: Omit<WorkspaceRecord, "id">, action: string) {
    const id = addRecord(collection, data);
    addAudit(action, id);
    notify("Операция выполнена", `${label}: ${id}`);
    return id;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setResult("");
    try {
      let id = "";
      if (sectionKey === "niches") id = record("niches", { name: values.name, market: values.market, sensitivity: values.sensitivity, retention: values.sensitivity === "NORMAL" ? "365 дней" : "30 дней", version: "2.0", status: "ACTIVE" }, "NICHE_CREATE");
      else if (sectionKey === "competitors") id = record("competitors", { name: values.name, domain: values.domain, niche: values.niche, freshness: "только что", status: "ACTIVE" }, "COMPETITOR_CREATE");
      else if (sectionKey === "sources") { const domain = new URL(values.url).hostname; id = record("sources", { source: domain, url: values.url, type: "Сайт компании", robots: values.robots, trust: values.robots === "DENIED" ? 10 : 70, owner: values.owner || domain, legalBasis: values.legalBasis, status: values.robots === "DENIED" ? "BLOCKED" : "REVIEW_REQUIRED" }, "SOURCE_REGISTER"); }
      else if (sectionKey === "crawls") {
        const source = workspace.sources.find((item) => item.id === values.sourceId);
        if (!source) throw new Error(`Источник с ID «${values.sourceId || "не выбран"}» не найден. Выберите источник из Реестра источников.`);
        if (source.status !== "APPROVED") throw new Error(`Источник «${String(source.source)}» имеет статус ${String(source.status)}. Сначала утвердите его в Реестре источников.`);
        if (source.robots === "DENIED") throw new Error(`robots.txt источника «${String(source.source)}» запрещает сканирование выбранного пути.`);
        const sourceHost = new URL(String(source.url)).hostname;
        const startHost = new URL(values.url).hostname;
        if (sourceHost !== startHost) throw new Error(`Стартовый URL относится к домену ${startHost}, а выбранный источник — к ${sourceHost}.`);
        id = record("crawls", { sourceId: values.sourceId, url: values.url, pages: 14, changed: 4, duration: "00:37", status: "COMPLETED", startedAt: "только что" }, "CRAWL_COMPLETE");
      }
      else if (sectionKey === "accounts") id = record("companies", { company: values.company, domain: values.domain, industry: values.industry, size: values.size, signals: 0, score: 60, status: "WATCH" }, "ACCOUNT_CREATE");
      else if (sectionKey === "signals") id = record("signals", { company: values.company, signal: values.signal, type: values.type, date: "только что", confidence: 75, status: "NEW" }, "SIGNAL_CREATE");
      else if (sectionKey === "contacts") id = record("contacts", { company: values.company, contact: maskIdentity(values.contact), kind: values.kind, source: values.source, legalBasis: "Ожидает проверки", status: "REVIEW_REQUIRED" }, "CONTACT_REVIEW_REQUEST");
      else if (sectionKey === "leads") { const hash = await identityHash(values.identity); const allowed = values.source === "FIRST_PARTY_FORM" && values.consent === "VERIFIED" && !workspace.suppressions.some((item) => item.identityHash === hash); id = record("leads", { lead: maskIdentity(values.identity), identityHash: hash, source: values.source, channels: allowed ? (values.identity.includes("@") ? "EMAIL" : "PHONE") : "—", score: allowed ? 82 : 32, status: allowed ? "CONTACT_ALLOWED" : "QUARANTINED", consent: values.consent, createdAt: "только что", purpose: values.purpose, timeline: [{ title: "Policy decision", detail: allowed ? "ALLOW" : "REVIEW_REQUIRED", time: new Date().toLocaleString("ru-RU") }] }, "LEAD_CAPTURE"); }
      else if (sectionKey === "suppression") { const hash = await identityHash(values.identity); id = record("suppressions", { hash: `${hash.slice(0, 8)}…${hash.slice(-6)}`, identityHash: hash, channel: values.channel, reason: values.reason, date: new Date().toLocaleDateString("ru-RU"), status: "ACTIVE" }, "SUPPRESSION_ADD"); workspace.leads.filter((lead) => lead.identityHash === hash).forEach((lead) => updateRecord("leads", lead.id, { status: "SUPPRESSED", channels: "—", consent: "REVOKED" })); }
      else if (sectionKey === "data-requests") { const seq = String(workspace.requests.length + 42).padStart(3, "0"); id = record("requests", { request: `DSR-2026-${seq}`, subject: maskIdentity(values.subject), type: values.type, owner: values.owner, deadline: "через 7 дней", status: "IN_PROGRESS" }, "DSR_CREATE"); }
      else if (sectionKey === "policies") id = record("policies", { rule: values.rule, scope: values.scope, decision: values.decision, version: `2.${workspace.policies.length}`, status: "ACTIVE" }, "POLICY_VERSION_CREATE");
      else if (sectionKey === "settings") { saveSettings({ workspaceName: values.workspaceName, country: values.country, region: values.region, crawlerContact: values.crawlerContact }); addAudit("SETTINGS_UPDATE", "workspace"); notify("Настройки сохранены", values.workspaceName); id = "workspace"; }
      else if (sectionKey === "demand") { workspace.opportunities.forEach((item, index) => updateRecord("opportunities", item.id, { score: Math.min(99, Number(item.score ?? 60) + 2 + index), confidence: Math.min(99, Number(item.confidence ?? 70) + 1) })); addAudit("OPPORTUNITIES_RECALCULATE", `${workspace.opportunities.length} records`); id = `${workspace.opportunities.length} оценок`; }
      else if (sectionKey === "compliance") { const target = [...workspace.contacts, ...workspace.leads, ...workspace.sources].find((item) => ["REVIEW_REQUIRED", "QUARANTINED"].includes(String(item.status))); if (!target) throw new Error("Очередь проверки пуста."); const collection: CollectionKey = workspace.contacts.some((item) => item.id === target.id) ? "contacts" : workspace.leads.some((item) => item.id === target.id) ? "leads" : "sources"; updateRecord(collection, target.id, { status: collection === "leads" ? "CONTACT_ALLOWED" : "APPROVED" }); addAudit("COMPLIANCE_APPROVE", target.id); id = target.id; }
      else if (["exports", "market-map", "audit"].includes(sectionKey)) { const data = sectionKey === "audit" ? workspace.audit : sectionKey === "market-map" ? workspace.offers : workspace.leads.filter((lead) => lead.status === "CONTACT_ALLOWED"); downloadCsv(`leadscope-${sectionKey}-${Date.now()}.csv`, data); id = record("exports", { export: `EXP-${Date.now().toString().slice(-6)}`, provider: "CSV", records: data.length, actor: "Демо-владелец", date: "только что", status: "COMPLETED" }, "DATA_EXPORT"); }
      else if (sectionKey === "retention") { workspace.retention.forEach((item) => updateRecord("retention", item.id, { next: "завтра, 02:00", status: "COMPLETED" })); addAudit("RETENTION_RUN", "workspace"); id = "retention-run"; }
      else throw new Error("Действие пока недоступно.");
      setResult(`Готово · ${id}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Операция не выполнена"); }
    finally { setLoading(false); }
  }

  return <>
    <button className="btn primary" onClick={() => setOpen(true)}><Plus size={15}/>{label}</button>
    {open ? <div className="modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}><section className="modal-card" role="dialog" aria-modal="true" aria-label={label} onMouseDown={(event) => event.stopPropagation()}>
      <div className="card-head"><div><div className="card-title">{label}</div><div className="card-note">Рабочий процесс LeadScope 2.0</div></div><button className="icon-btn" onClick={() => setOpen(false)} aria-label="Закрыть"><X size={16}/></button></div>
      <form className="card-body" onSubmit={submit}>
        {fields.length ? fields.map((field) => <div className="field" key={field.key}><label htmlFor={`action-${field.key}`}>{field.label}</label>{field.key === "sourceId" ? <select id={`action-${field.key}`} value={values[field.key] ?? ""} required onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}><option value="" disabled>Выберите источник</option>{workspace.sources.map((source) => <option value={source.id} key={source.id}>{String(source.source)} · {String(source.status)} · robots {String(source.robots)}</option>)}</select> : field.options ? <select id={`action-${field.key}`} value={values[field.key] ?? field.options[0]} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : <input id={`action-${field.key}`} value={values[field.key] ?? ""} placeholder={field.placeholder} required={field.required} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}/>}</div>) : <p className="subtitle">Запустите действие. Результат сохранится в workspace и журнале аудита.</p>}
        {error ? <div className="form-error" role="alert">{error}</div> : null}{result ? <div className="form-success"><CheckCircle2 size={16}/><b>{result}</b></div> : null}
        <div className="modal-actions"><button className="btn" type="button" onClick={() => setOpen(false)}>Закрыть</button><button className="btn primary" type="submit" disabled={loading}>{loading ? "Выполняю…" : label}</button></div>
      </form>
    </section></div> : null}
  </>;
}
