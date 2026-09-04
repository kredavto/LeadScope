"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-dvh place-items-center p-8"><div className="text-center"><div className="eyebrow">Ошибка</div><h1>Не удалось загрузить раздел</h1><p className="subtitle">Попробуйте снова. Контактные данные не выводятся в журнал ошибок.</p><button className="btn primary mt-6" onClick={reset}>Повторить</button></div></main>;
}

