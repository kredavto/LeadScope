import { ArrowUpRight, CheckCircle2, Clock3, DatabaseZap, Radar, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";

const stats = [
  { label: "Активные конкуренты", value: "12", delta: "+2 за 30 дней", icon: Radar },
  { label: "B2B-компании в ICP", value: "148", delta: "23 с новыми сигналами", icon: UsersRound },
  { label: "Разрешённые лиды", value: "64", delta: "71% от входящих", icon: CheckCircle2 },
  { label: "Требуют внимания", value: "9", delta: "3 высокого риска", icon: ShieldCheck },
];

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="page-head">
        <div><div className="eyebrow">Операционный обзор · 3 сентября 2026</div><h1>Контроль спроса и лидов</h1><p className="subtitle">Рыночные сигналы, B2B intent и first-party лиды в одном контуре — с provenance, consent и policy gate.</p></div>
        <button className="btn primary"><Sparkles size={15} />Найти возможность</button>
      </div>
      <div className="notice"><ShieldCheck size={16} />Публичная доступность данных не означает разрешение на рекламное использование. Агрегированные сигналы не считаются идентифицированными лидами.</div>
      <section className="stats" aria-label="Ключевые метрики">
        {stats.map((stat) => { const Icon = stat.icon; return <article className="stat" key={stat.label}><div className="stat-top"><span>{stat.label}</span><Icon size={16} /></div><span className="stat-value">{stat.value}</span><span className="delta">{stat.delta}</span></article>; })}
      </section>
      <section className="grid-main">
        <div className="card">
          <div className="card-head"><div><div className="card-title">Воронка разрешённых лидов</div><div className="card-note">First-party · последние 30 дней</div></div><span className="tag">90 входящих</span></div>
          <div className="card-body">
            <div className="bar-row"><span>Получено</span><div className="bar-track"><div className="bar-fill" style={{ width: "100%" }} /></div><b>90</b></div>
            <div className="bar-row"><span>Consent проверен</span><div className="bar-track"><div className="bar-fill lime" style={{ width: "79%" }} /></div><b>71</b></div>
            <div className="bar-row"><span>Contact allowed</span><div className="bar-track"><div className="bar-fill lime" style={{ width: "71%" }} /></div><b>64</b></div>
            <div className="bar-row"><span>Передано в CRM</span><div className="bar-track"><div className="bar-fill amber" style={{ width: "48%" }} /></div><b>43</b></div>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Риски и проверки</div><div className="card-note">Требуют решения</div></div><ArrowUpRight size={15} /></div>
          <div className="card-body risk-list">
            <div className="risk"><span className="dot red"/><div><strong>Партнёрские лиды без evidence</strong><span>Экспорт и контакт заблокированы</span></div><StatusPill value="3" /></div>
            <div className="risk"><span className="dot"/><div><strong>Ролевые B2B e-mail</strong><span>Нужно определить основание</span></div><StatusPill value="5" /></div>
            <div className="risk"><span className="dot green"/><div><strong>Истекающие согласия</strong><span>В ближайшие 14 дней</span></div><StatusPill value="1" /></div>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Главные рыночные возможности</div><div className="card-note">Score прозрачно рассчитан из пяти факторов</div></div><Link className="tag" href="/demand">Все возможности</Link></div>
          <div className="table-scroll"><table><thead><tr><th>Возможность</th><th>Сегмент</th><th>Evidence</th><th>Score</th></tr></thead><tbody>
            <tr><td><div className="primary-cell">Ремонт за 60 минут</div><div className="secondary-cell">Фиксированная цена + гарантия</div></td><td>B2C · Смартфоны</td><td>42 сигнала</td><td><StatusPill value="82 / 100" /></td></tr>
            <tr><td><div className="primary-cell">Диагностическое оборудование</div><div className="secondary-cell">Тендер + вакансия закупок</div></td><td>B2B · Автосервисы</td><td>2 источника</td><td><StatusPill value="86 / 100" /></td></tr>
            <tr><td><div className="primary-cell">Прозрачные условия кредита</div><div className="secondary-cell">Нет скрытых комиссий</div></td><td>B2C · Автокредиты</td><td>37 сигналов</td><td><StatusPill value="74 / 100" /></td></tr>
          </tbody></table></div>
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Свежесть данных</div><div className="card-note">SLA источников</div></div><DatabaseZap size={15} /></div>
          <div className="card-body timeline">
            <div className="timeline-item"><div className="timeline-rail"><span className="timeline-node" /></div><div className="timeline-content"><strong>12 страниц изменилось</strong><p>Предложения и цены по трём конкурентам</p><time>12 минут назад</time></div></div>
            <div className="timeline-item"><div className="timeline-rail"><span className="timeline-node" /></div><div className="timeline-content"><strong>Новый B2B-тендер</strong><p>Диагностическое оборудование</p><time>48 минут назад</time></div></div>
            <div className="timeline-item"><div className="timeline-rail"><span className="timeline-node" /></div><div className="timeline-content"><strong>Retention job завершён</strong><p>4 записи анонимизировано</p><time>Сегодня, 02:00</time></div></div>
          </div>
        </div>
      </section>
      <div className="mt-5 flex items-center gap-2 text-[10px] text-[#66736f]"><Clock3 size={12}/>Демо-данные используют только зарезервированные домены и фиктивные контакты.</div>
    </AppShell>
  );
}
