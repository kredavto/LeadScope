import { Clock3, FileCheck2, ShieldCheck, UserRoundCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell>
      <div className="page-head"><div><div className="eyebrow">First-party Lead · {id}</div><h1>i•••@example.com</h1><p className="subtitle">Контакт замаскирован. Просмотр полного значения требует permission view_contacts и фиксируется в аудите.</p></div><StatusPill value="CONTACT_ALLOWED" /></div>
      <div className="grid-main">
        <div className="card"><div className="card-head"><div className="card-title">Consent timeline</div><FileCheck2 size={16}/></div><div className="card-body timeline">
          <div className="timeline-item"><div className="timeline-rail"><span className="timeline-node"/></div><div className="timeline-content"><strong>Согласие выдано</strong><p>Текст v1.2 · Email и Phone · checkbox_checked</p><time>3 сентября, 09:41:02</time></div></div>
          <div className="timeline-item"><div className="timeline-rail"><span className="timeline-node"/></div><div className="timeline-content"><strong>Policy: ALLOW</strong><p>FIRST_PARTY_VERIFIED_CONSENT</p><time>3 сентября, 09:41:03</time></div></div>
          <div className="timeline-item"><div className="timeline-rail"><span className="timeline-node"/></div><div className="timeline-content"><strong>Готов к экспорту</strong><p>Suppression match отсутствует</p><time>3 сентября, 09:41:03</time></div></div>
        </div></div>
        <div className="card"><div className="card-head"><div className="card-title">Score explanation</div><UserRoundCheck size={16}/></div><div className="card-body">
          {[['Intent',20],['Recency',20],['Product fit',18],['Source quality',20],['Consent quality',20]].map(([label,value]) => <div className="bar-row !grid-cols-[105px_1fr_30px]" key={String(label)}><span>{label}</span><div className="bar-track"><div className="bar-fill" style={{width:`${Number(value)*5}%`}}/></div><b>{value}</b></div>)}
          <div className="mt-4 flex items-center justify-between border-t border-[#dce3df] pt-4"><span className="text-xs font-bold">Итого</span><b className="text-2xl">88</b></div>
        </div></div>
      </div>
      <div className="notice mt-5"><ShieldCheck size={16}/>Отзыв согласия немедленно очистит разрешённые каналы и создаст необратимый suppression-хеш.</div>
      <div className="flex items-center gap-2 text-[10px] text-[#66736f]"><Clock3 size={12}/>Retention до 3 сентября 2027 года.</div>
    </AppShell>
  );
}

