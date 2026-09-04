import { Leaf, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="login-shell">
      <section className="login-art">
        <div className="brand"><span className="brand-mark"><Leaf size={20} /></span><div><strong>LeadScope</strong><small>INTELLIGENCE PLATFORM</small></div></div>
        <div className="login-copy"><div className="eyebrow !text-[#b9ee6f]">Competitive demand · First-party leads</div><h1>Рынок виден.<br/>Контакт разрешён.</h1><p>Анализируйте предложения и B2B-сигналы, не выдавая агрегированные данные за клиентов конкурента.</p></div>
        <div className="relative z-10 flex items-center gap-2 text-xs text-[#b9d0c8]"><ShieldCheck size={16}/>Tenant isolation · RBAC · Audit</div>
      </section>
      <section className="login-panel">
        <LoginForm />
      </section>
    </main>
  );
}
