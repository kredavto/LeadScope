"use client";

import { CheckCircle2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { apiRequest, getSession } from "@/lib/api-client";

const supported = new Set(["niches", "competitors", "sources", "crawls"]);

type ApiResult = { id?: string; status?: string; run_id?: string };

export function SectionAction({ sectionKey, label }: { sectionKey: string; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [values, setValues] = useState<Record<string, string>>({
    market_type: "B2C",
    sensitivity: "NORMAL",
    source_type: "PUBLIC_COMPANY_SITE",
  });
  const canSubmit = supported.has(sectionKey);
  const fields = useMemo(() => {
    if (sectionKey === "niches") return [["name", "Название шаблона"], ["market_type", "Рынок"], ["sensitivity", "Чувствительность"]];
    if (sectionKey === "competitors") return [["name", "Название конкурента"], ["domain", "Домен"]];
    if (sectionKey === "sources") return [["url", "URL источника"], ["owner", "Владелец"], ["legal_basis", "Заявленное основание"]];
    if (sectionKey === "crawls") return [["source_id", "ID утверждённого источника"], ["start_url", "Стартовый URL"]];
    return [];
  }, [sectionKey]);

  function payload(): { path: string; body: Record<string, unknown> } {
    if (sectionKey === "niches") return { path: "/niche-templates", body: { name: values.name, market_type: values.market_type, sensitivity: values.sensitivity, countries: ["RU"], retention_days: values.sensitivity === "NORMAL" ? 365 : 30 } };
    if (sectionKey === "competitors") return { path: "/competitors", body: { name: values.name, domain: values.domain } };
    if (sectionKey === "sources") return { path: "/sources", body: { source_type: values.source_type, url: values.url, owner: values.owner, country: "RU", legal_basis: values.legal_basis, scan_allowed: true, contains_personal_data: false } };
    return { path: "/crawl-jobs", body: { source_id: values.source_id, start_url: values.start_url, max_depth: 2, max_pages: 25 } };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!getSession()) { router.push("/login"); return; }
    setLoading(true); setError(""); setResult(null);
    const request = payload();
    try {
      const data = await apiRequest<ApiResult>(request.path, { method: "POST", body: JSON.stringify(request.body) });
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Операция не выполнена");
    } finally { setLoading(false); }
  }

  async function approveSource() {
    if (!result?.id) return;
    setLoading(true); setError("");
    try {
      const data = await apiRequest<ApiResult>(`/sources/${result.id}/approve`, { method: "POST" });
      setResult(data);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось утвердить"); }
    finally { setLoading(false); }
  }

  return (
    <>
      <button className="btn primary" onClick={() => setOpen(true)}><Plus size={15}/>{label}</button>
      {open ? <div className="modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}><section className="modal-card" role="dialog" aria-modal="true" aria-label={label} onMouseDown={(event) => event.stopPropagation()}>
        <div className="card-head"><div><div className="card-title">{label}</div><div className="card-note">Запись будет проверена API policy/RBAC</div></div><button className="icon-btn" onClick={() => setOpen(false)} aria-label="Закрыть"><X size={16}/></button></div>
        <form className="card-body" onSubmit={submit}>
          {canSubmit ? fields.map(([key, fieldLabel]) => <div className="field" key={key}><label htmlFor={`action-${key}`}>{fieldLabel}</label>{key === "market_type" ? <select id={`action-${key}`} value={values[key] ?? "B2C"} onChange={(event) => setValues((current) => ({...current, [key]: event.target.value}))}><option>B2C</option><option>B2B</option></select> : key === "sensitivity" ? <select id={`action-${key}`} value={values[key] ?? "NORMAL"} onChange={(event) => setValues((current) => ({...current, [key]: event.target.value}))}><option>NORMAL</option><option>FINANCIAL</option><option>HEALTH</option><option>CHILDREN</option><option>LEGAL</option></select> : <input id={`action-${key}`} value={values[key] ?? ""} onChange={(event) => setValues((current) => ({...current, [key]: event.target.value}))} required />}</div>) : <p className="subtitle">Для этого раздела используется специализированный workflow API. Доступные операции описаны в OpenAPI.</p>}
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          {result ? <div className="form-success"><CheckCircle2 size={16}/><div><b>Операция выполнена</b><br/><span>ID: {result.id ?? "—"}{result.run_id ? ` · Run: ${result.run_id}` : ""} · {result.status ?? "CREATED"}</span></div></div> : null}
          <div className="modal-actions"><button className="btn" type="button" onClick={() => setOpen(false)}>Закрыть</button>{sectionKey === "sources" && result?.id && result.status !== "APPROVED" ? <button className="btn" type="button" onClick={approveSource} disabled={loading}>Утвердить источник</button> : null}{canSubmit ? <button className="btn primary" type="submit" disabled={loading}>{loading ? "Сохраняем…" : label}</button> : null}</div>
        </form>
      </section></div> : null}
    </>
  );
}
