import Link from "next/link";

export default function NotFound() {
  return <main className="grid min-h-dvh place-items-center p-8"><div className="text-center"><div className="eyebrow">404</div><h1>Раздел не найден</h1><p className="subtitle">Проверьте адрес или вернитесь к обзору.</p><Link className="btn primary mt-6" href="/">На главную</Link></div></main>;
}

