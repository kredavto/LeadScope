import Link from "next/link";
import { Building2, Check, ShoppingBag } from "lucide-react";

export default function OnboardingPage() {
  return (
    <main className="onboarding">
      <div className="eyebrow">Настройка workspace · шаг 2 из 4</div><h1>Какой рынок изучаем?</h1><p className="subtitle">Режим определяет допустимые источники, типы данных и стартовые policy rules. Можно включить оба.</p>
      <div className="steps"><span className="step done"/><span className="step done"/><span className="step"/><span className="step"/></div>
      <div className="option-grid">
        <article className="option selected"><ShoppingBag size={23}/><strong className="mt-4">B2C</strong><p>Агрегированный спрос, предложения конкурентов и только собственные входящие лиды.</p><span className="status allow mt-4"><Check size={11}/> Выбрано</span></article>
        <article className="option selected"><Building2 size={23}/><strong className="mt-4">B2B</strong><p>Юридические лица, опубликованные деловые контакты, ICP и корпоративные сигналы.</p><span className="status allow mt-4"><Check size={11}/> Выбрано</span></article>
      </div>
      <div className="card mt-5"><div className="card-body grid gap-4 md:grid-cols-2"><div className="field !mb-0"><label htmlFor="country">Страна оператора</label><select id="country"><option>Россия</option><option>Казахстан</option><option>Беларусь</option></select></div><div className="field !mb-0"><label htmlFor="region">Основной регион</label><input id="region" defaultValue="Москва" /></div></div></div>
      <div className="mt-6 flex justify-between gap-3"><Link className="btn" href="/login">Назад</Link><Link className="btn primary" href="/">Создать workspace</Link></div>
    </main>
  );
}

