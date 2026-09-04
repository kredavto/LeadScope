"use client";

import { Bot, CheckCircle2, LoaderCircle, Sparkles, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { useWorkspace } from "./workspace-provider";

type AgentResult = { title: string; segment: string; summary: string; evidence: string[]; score: number; confidence: number; nextSteps: string[]; compliance: string };

export function OpportunityAgent() {
  const { workspace, addRecord, addAudit, notify } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [mode, setMode] = useState("");

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/agent/opportunity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ market: workspace.settings.markets.join(" + "), region: workspace.settings.region, offers: workspace.offers, opportunities: workspace.opportunities, signals: workspace.signals, companies: workspace.companies, focus }) });
      const data = await response.json() as { result?: AgentResult; mode?: string; error?: string };
      if (!response.ok || !data.result) throw new Error(data.error ?? "AI-агент не вернул результат");
      setResult(data.result); setMode(data.mode ?? "ai");
      addAudit("AI_OPPORTUNITY_ANALYSIS", data.result.title);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "AI-агент недоступен"); }
    finally { setLoading(false); }
  }

  function save() {
    if (!result) return;
    const id = addRecord("opportunities", { opportunity: result.title, signals: result.evidence.length, gap: "AI-анализ", confidence: result.confidence, score: result.score, status: "ACTIVE", summary: result.summary, evidence: result.evidence, nextSteps: result.nextSteps, compliance: result.compliance });
    addAudit("AI_OPPORTUNITY_SAVE", id); notify("Новая возможность сохранена", result.title, "SUCCESS"); setOpen(false);
  }

  return <>
    <button className="btn primary" onClick={() => setOpen(true)}><Sparkles size={15}/>Найти возможность</button>
    {open ? <div className="modal-backdrop" role="presentation" onMouseDown={() => !loading && setOpen(false)}><section className="modal-card agent-card" role="dialog" aria-modal="true" aria-label="AI-агент поиска возможностей" onMouseDown={(event) => event.stopPropagation()}>
      <div className="card-head"><div className="agent-title"><span className="brand-mark"><Bot size={18}/></span><div><div className="card-title">Opportunity Agent</div><div className="card-note">Анализ рынка · evidence · policy gate</div></div></div><button className="icon-btn" onClick={() => setOpen(false)} disabled={loading} aria-label="Закрыть"><X size={16}/></button></div>
      <form className="card-body" onSubmit={run}>
        <div className="field"><label htmlFor="agent-focus">Что особенно важно? <span className="muted">необязательно</span></label><input id="agent-focus" value={focus} onChange={(event) => setFocus(event.target.value)} placeholder="Например: B2B, Москва, быстрый пилот"/></div>
        <div className="agent-scope"><span>{workspace.offers.length} предложений</span><span>{workspace.signals.length} сигналов</span><span>{workspace.companies.length} компаний</span></div>
        {loading ? <div className="agent-progress"><LoaderCircle className="spin" size={22}/><div><b>Агент анализирует данные</b><p>Сопоставляет сигналы, разрывы рынка и ограничения compliance…</p></div></div> : null}
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        {result ? <div className="agent-result"><div className="agent-result-head"><div><span className="tag">{mode === "ai" ? "OPENAI" : "SAFE FALLBACK"}</span><h2>{result.title}</h2><p>{result.segment}</p></div><div className="agent-score"><b>{result.score}</b><span>score</span></div></div><p>{result.summary}</p><div className="agent-columns"><div><strong>Evidence</strong><ul>{result.evidence.map((item) => <li key={item}><CheckCircle2 size={13}/>{item}</li>)}</ul></div><div><strong>Следующие шаги</strong><ol>{result.nextSteps.map((item) => <li key={item}>{item}</li>)}</ol></div></div><div className="notice !mb-0">{result.compliance}</div></div> : null}
        <div className="modal-actions"><button className="btn" type="button" onClick={() => setOpen(false)} disabled={loading}>Закрыть</button>{result ? <button className="btn primary" type="button" onClick={save}>Сохранить возможность</button> : <button className="btn primary" type="submit" disabled={loading}>{loading ? "Анализирую…" : "Запустить агента"}</button>}</div>
      </form>
    </section></div> : null}
  </>;
}
