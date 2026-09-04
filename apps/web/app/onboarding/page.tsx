"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Check, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "@/components/workspace-provider";

export default function OnboardingPage() {
  const router = useRouter();
  const { workspace, saveSettings, addAudit } = useWorkspace();
  const [markets, setMarkets] = useState(workspace.settings.markets);
  const [country, setCountry] = useState(workspace.settings.country);
  const [region, setRegion] = useState(workspace.settings.region);
  function toggle(market: string) { setMarkets((current) => current.includes(market) ? current.filter((item) => item !== market) : [...current, market]); }
  function submit() { if (!markets.length) return; saveSettings({ markets, country, region }); addAudit("WORKSPACE_ONBOARDING", markets.join("+")); router.push("/"); }
  return <main className="onboarding">
    <div className="eyebrow">Настройка workspace · версия 2.0</div><h1>Какой рынок изучаем?</h1><p className="subtitle">Выбор сохраняется в рабочем пространстве и определяет контекст AI‑агента.</p>
    <div className="steps"><span className="step done"/><span className="step done"/><span className="step done"/><span className="step done"/></div>
    <div className="option-grid">
      <button className={`option option-button ${markets.includes("B2C") ? "selected" : ""}`} onClick={() => toggle("B2C")}><ShoppingBag size={23}/><strong className="mt-4">B2C</strong><p>Агрегированный спрос, предложения конкурентов и собственные входящие лиды.</p>{markets.includes("B2C") ? <span className="status allow mt-4"><Check size={11}/> Выбрано</span> : null}</button>
      <button className={`option option-button ${markets.includes("B2B") ? "selected" : ""}`} onClick={() => toggle("B2B")}><Building2 size={23}/><strong className="mt-4">B2B</strong><p>Юридические лица, ICP, корпоративные сигналы и публичные деловые контакты.</p>{markets.includes("B2B") ? <span className="status allow mt-4"><Check size={11}/> Выбрано</span> : null}</button>
    </div>
    <div className="card mt-5"><div className="card-body grid gap-4 md:grid-cols-2"><div className="field !mb-0"><label htmlFor="country">Страна оператора</label><select id="country" value={country} onChange={(event) => setCountry(event.target.value)}><option>Россия</option><option>Казахстан</option><option>Беларусь</option></select></div><div className="field !mb-0"><label htmlFor="region">Основной регион</label><input id="region" value={region} onChange={(event) => setRegion(event.target.value)}/></div></div></div>
    <div className="mt-6 flex justify-between gap-3"><Link className="btn" href="/login">Назад</Link><button className="btn primary" onClick={submit} disabled={!markets.length}>Сохранить workspace</button></div>
  </main>;
}
