export type Row = Record<string, string | number>;

export type Section = {
  title: string;
  eyebrow: string;
  description: string;
  action: string;
  notice?: string;
  columns: { key: string; label: string }[];
  rows: Row[];
};

export const sections: Record<string, Section> = {
  niches: {
    title: "Ниши и шаблоны", eyebrow: "Конфигурация", action: "Создать шаблон",
    description: "Версионируемые адаптеры позволяют запускать новые рынки без изменения ядра.",
    columns: [{ key: "name", label: "Шаблон" }, { key: "market", label: "Рынок" }, { key: "sensitivity", label: "Чувствительность" }, { key: "retention", label: "Хранение" }, { key: "version", label: "Версия" }],
    rows: [
      { name: "Автокредиты", market: "B2C", sensitivity: "FINANCIAL", retention: "30 дней", version: "1.0" },
      { name: "Ремонт смартфонов", market: "B2C", sensitivity: "NORMAL", retention: "365 дней", version: "1.0" },
      { name: "Косметологическая клиника", market: "B2C", sensitivity: "HEALTH", retention: "30 дней", version: "1.0" },
      { name: "Оборудование для автосервисов", market: "B2B", sensitivity: "NORMAL", retention: "365 дней", version: "1.0" },
      { name: "SaaS для отделов продаж", market: "B2B", sensitivity: "NORMAL", retention: "365 дней", version: "1.0" },
      { name: "Коммерческая недвижимость", market: "B2B", sensitivity: "NORMAL", retention: "365 дней", version: "1.0" },
    ],
  },
  competitors: {
    title: "Конкуренты", eyebrow: "B2C Intelligence", action: "Добавить конкурента",
    description: "Публичные предложения, цены и география. Посетители чужих сайтов не идентифицируются.",
    columns: [{ key: "name", label: "Компания" }, { key: "domain", label: "Домен" }, { key: "niche", label: "Ниша" }, { key: "freshness", label: "Свежесть" }, { key: "status", label: "Статус" }],
    rows: [
      { name: "Пример Сервис", domain: "service.example.com", niche: "Ремонт смартфонов", freshness: "12 минут назад", status: "Активен" },
      { name: "Финанс Авто", domain: "finance-auto.example.org", niche: "Автокредиты", freshness: "2 часа назад", status: "Активен" },
      { name: "Клиника Пример", domain: "clinic.example.com", niche: "Косметология", freshness: "1 день назад", status: "Проверка" },
    ],
  },
  sources: {
    title: "Реестр источников", eyebrow: "Контроль происхождения", action: "Добавить источник",
    description: "Сканирование начинается только после проверки robots, условий и заявленного основания.",
    columns: [{ key: "source", label: "Источник" }, { key: "type", label: "Тип" }, { key: "robots", label: "Robots" }, { key: "trust", label: "Доверие" }, { key: "status", label: "Решение" }],
    rows: [
      { source: "service.example.com", type: "Сайт компании", robots: "Разрешён", trust: "82%", status: "APPROVED" },
      { source: "catalog.example.org", type: "Каталог", robots: "Проверен", trust: "71%", status: "REVIEW_REQUIRED" },
      { source: "private.example.com", type: "Неизвестный", robots: "Запрещён", trust: "12%", status: "BLOCKED" },
    ],
  },
  crawls: {
    title: "Сканирования", eyebrow: "Crawler Orchestrator", action: "Новое сканирование",
    description: "Очередь заданий с ограничениями домена, глубины, размера и повторной обработкой только изменений.",
    columns: [{ key: "url", label: "Стартовый URL" }, { key: "pages", label: "Страницы" }, { key: "changed", label: "Изменено" }, { key: "duration", label: "Время" }, { key: "status", label: "Статус" }],
    rows: [
      { url: "service.example.com", pages: 12, changed: 3, duration: "00:42", status: "COMPLETED" },
      { url: "finance-auto.example.org", pages: 31, changed: 7, duration: "01:54", status: "COMPLETED" },
      { url: "private.example.com", pages: 0, changed: 0, duration: "00:01", status: "BLOCKED" },
    ],
  },
  "market-map": {
    title: "Карта предложений", eyebrow: "Сравнение рынка", action: "Экспортировать снимок",
    description: "Сопоставление ассортимента, цен, условий и доказательств по конкурентам.",
    columns: [{ key: "offer", label: "Предложение" }, { key: "company", label: "Компания" }, { key: "price", label: "Цена" }, { key: "change", label: "Изменение" }, { key: "evidence", label: "Provenance" }],
    rows: [
      { offer: "Замена экрана", company: "Пример Сервис", price: "7 500 ₽", change: "+600 ₽", evidence: "service.example.com/screens" },
      { offer: "Диагностика", company: "Пример Сервис", price: "Бесплатно", change: "—", evidence: "service.example.com/diagnostics" },
      { offer: "Автокредит", company: "Финанс Авто", price: "от 12,9%", change: "+0,4 п.п.", evidence: "finance-auto.example.org/rates" },
    ],
  },
  demand: {
    title: "Спрос и возможности", eyebrow: "Opportunity Board", action: "Пересчитать оценки",
    description: "Агрегированные потребности отделены от реальных идентифицированных лидов.",
    columns: [{ key: "opportunity", label: "Возможность" }, { key: "signals", label: "Сигналы" }, { key: "gap", label: "Разрыв" }, { key: "confidence", label: "Уверенность" }, { key: "score", label: "Оценка" }],
    rows: [
      { opportunity: "Ремонт за 60 минут", signals: 42, gap: "Высокий", confidence: "84%", score: 82 },
      { opportunity: "Кредит без визита", signals: 37, gap: "Средний", confidence: "76%", score: 74 },
      { opportunity: "Прозрачная гарантия", signals: 29, gap: "Высокий", confidence: "81%", score: 71 },
    ],
  },
  accounts: {
    title: "B2B-компании", eyebrow: "ICP Explorer", action: "Добавить ICP",
    description: "Юридические лица объединяются только по сильным признакам с объяснением confidence.",
    columns: [{ key: "company", label: "Компания" }, { key: "industry", label: "Отрасль" }, { key: "size", label: "Размер" }, { key: "signals", label: "Сигналы" }, { key: "score", label: "ICP score" }],
    rows: [
      { company: "ООО «Гараж Технологий»", industry: "Автосервисы", size: "51–200", signals: 2, score: 86 },
      { company: "АО «Север Сервис»", industry: "Техобслуживание", size: "201–500", signals: 3, score: 81 },
      { company: "ООО «Продажи Онлайн»", industry: "SaaS", size: "11–50", signals: 1, score: 73 },
    ],
  },
  signals: {
    title: "B2B-сигналы", eyebrow: "Intent Timeline", action: "Настроить сигналы",
    description: "Вакансии, тендеры и корпоративные изменения — с датой, источником и уверенностью.",
    columns: [{ key: "company", label: "Компания" }, { key: "signal", label: "Сигнал" }, { key: "type", label: "Тип" }, { key: "date", label: "Обнаружен" }, { key: "confidence", label: "Уверенность" }],
    rows: [
      { company: "Гараж Технологий", signal: "Запрос на диагностическое оборудование", type: "TENDER", date: "Сегодня, 09:42", confidence: "94%" },
      { company: "Гараж Технологий", signal: "Руководитель отдела закупок", type: "VACANCY", date: "Вчера, 17:20", confidence: "88%" },
      { company: "Север Сервис", signal: "Открытие филиала в Казани", type: "EXPANSION", date: "2 дня назад", confidence: "83%" },
    ],
  },
  contacts: {
    title: "Деловые контакты", eyebrow: "Public Business Contacts", action: "Запросить проверку",
    notice: "Персональный контакт виден только ролям с permission view_contacts. Ролевой e-mail до маркетингового использования требует проверки.",
    description: "Опубликованные общие и профессиональные контакты с происхождением каждого значения.",
    columns: [{ key: "company", label: "Компания" }, { key: "contact", label: "Контакт" }, { key: "kind", label: "Тип" }, { key: "source", label: "Источник" }, { key: "status", label: "Статус" }],
    rows: [
      { company: "Гараж Технологий", contact: "p•••@garage-tech.example.org", kind: "ROLE_EMAIL", source: "/contacts", status: "REVIEW_REQUIRED" },
      { company: "Север Сервис", contact: "+••• ••• •• 04", kind: "COMPANY_PHONE", source: "/about", status: "APPROVED" },
    ],
  },
  leads: {
    title: "Входящие лиды", eyebrow: "First-party Capture", action: "Добавить лид",
    notice: "Здесь только first-party и документированные партнёрские заявки. Рыночные сигналы и авторы отзывов не становятся лидами.",
    description: "Каждая запись проходит consent, policy, suppression и idempotency проверки до экспорта.",
    columns: [{ key: "lead", label: "Лид" }, { key: "source", label: "Источник" }, { key: "channels", label: "Каналы" }, { key: "score", label: "Score" }, { key: "status", label: "Статус" }],
    rows: [
      { lead: "i•••@example.com", source: "FIRST_PARTY_FORM", channels: "Email · Phone", score: 88, status: "CONTACT_ALLOWED" },
      { lead: "p•••@example.org", source: "PARTNER", channels: "—", score: 34, status: "QUARANTINED" },
      { lead: "r•••@example.com", source: "FIRST_PARTY_FORM", channels: "—", score: 71, status: "SUPPRESSED" },
    ],
  },
  compliance: {
    title: "Compliance Review", eyebrow: "Ручная проверка", action: "Назначить проверяющего",
    description: "Очередь сомнительных источников, контактов и лидов с причинами решения policy engine.",
    columns: [{ key: "record", label: "Запись" }, { key: "type", label: "Тип" }, { key: "reason", label: "Причина" }, { key: "age", label: "Возраст" }, { key: "status", label: "Статус" }],
    rows: [
      { record: "procurement@garage-tech…", type: "ROLE_EMAIL", reason: "Маркетинговое использование", age: "18 мин", status: "REVIEW_REQUIRED" },
      { record: "Партнёрская заявка #291", type: "LEAD", reason: "Нет доказательства согласия", age: "1 ч", status: "QUARANTINED" },
      { record: "clinic.example.com", type: "SOURCE", reason: "Чувствительная ниша", age: "1 день", status: "REVIEW_REQUIRED" },
    ],
  },
  suppression: {
    title: "Suppression List", eyebrow: "Запрет контакта", action: "Добавить хеш",
    notice: "Список хранит минимальные необратимые хеши. Исходный e-mail или телефон не восстанавливается.",
    description: "Отзыв согласия немедленно запрещает контакт и повторный импорт по тому же каналу.",
    columns: [{ key: "hash", label: "Identity hash" }, { key: "channel", label: "Канал" }, { key: "reason", label: "Причина" }, { key: "date", label: "Создано" }, { key: "status", label: "Статус" }],
    rows: [{ hash: "b6d81b36…8ac091", channel: "EMAIL", reason: "REVOKED", date: "31 авг 2026", status: "ACTIVE" }],
  },
  "data-requests": {
    title: "Запросы субъектов", eyebrow: "Privacy Operations", action: "Создать запрос",
    description: "Доступ, исправление, ограничение, отзыв и удаление с исполнителем и доказуемым результатом.",
    columns: [{ key: "request", label: "Запрос" }, { key: "type", label: "Тип" }, { key: "owner", label: "Исполнитель" }, { key: "deadline", label: "Срок" }, { key: "status", label: "Статус" }],
    rows: [
      { request: "DSR-2026-041", type: "ACCESS", owner: "Анна К.", deadline: "12 сен", status: "IN_PROGRESS" },
      { request: "DSR-2026-040", type: "DELETE", owner: "Илья М.", deadline: "8 сен", status: "REVIEW_REQUIRED" },
    ],
  },
  exports: {
    title: "Экспорт и интеграции", eyebrow: "Controlled Delivery", action: "Новый экспорт",
    notice: "CSV/CRM принимают только CONTACT_ALLOWED. Каждая выгрузка фиксируется в аудите, а формулы CSV нейтрализуются.",
    description: "Безопасная передача разрешённых записей и mock-интеграции для локальной разработки.",
    columns: [{ key: "export", label: "Экспорт" }, { key: "provider", label: "Провайдер" }, { key: "records", label: "Записей" }, { key: "actor", label: "Инициатор" }, { key: "status", label: "Статус" }],
    rows: [
      { export: "EXP-000128", provider: "CSV", records: 14, actor: "Демо-владелец", status: "COMPLETED" },
      { export: "EXP-000127", provider: "Mock CRM", records: 8, actor: "Ирина С.", status: "COMPLETED" },
    ],
  },
  audit: {
    title: "Журнал аудита", eyebrow: "Immutable Trail", action: "Скачать отчёт",
    description: "Критические действия без контактов, токенов и чувствительных значений в метаданных.",
    columns: [{ key: "action", label: "Действие" }, { key: "actor", label: "Инициатор" }, { key: "entity", label: "Объект" }, { key: "time", label: "Время" }, { key: "status", label: "Результат" }],
    rows: [
      { action: "LEADS_EXPORT", actor: "Демо-владелец", entity: "EXP-000128", time: "10:34:22", status: "SUCCESS" },
      { action: "LEAD_FROM_REVIEW_ATTEMPT", actor: "Демо-владелец", entity: "review:0f9a…", time: "09:51:04", status: "BLOCKED" },
      { action: "SOURCE_APPROVE", actor: "Анна К.", entity: "service.example.com", time: "Вчера", status: "SUCCESS" },
    ],
  },
  retention: {
    title: "Retention", eyebrow: "Data Lifecycle", action: "Запустить проверку",
    description: "Ежедневная анонимизация просроченных данных с сохранением минимального suppression-хеша.",
    columns: [{ key: "class", label: "Класс данных" }, { key: "period", label: "Срок" }, { key: "action", label: "Действие" }, { key: "next", label: "Следующий запуск" }, { key: "status", label: "Статус" }],
    rows: [
      { class: "B2C lead", period: "365 дней", action: "ANONYMIZE", next: "04 сен, 02:00", status: "ACTIVE" },
      { class: "Health niche evidence", period: "30 дней", action: "DELETE", next: "04 сен, 02:00", status: "ACTIVE" },
      { class: "Suppression hash", period: "По политике", action: "PRESERVE_MINIMUM", next: "—", status: "ACTIVE" },
    ],
  },
  policies: {
    title: "Политики", eyebrow: "Policy Engine", action: "Новая версия",
    notice: "Публичная доступность сведений сама по себе не означает разрешение на рекламное использование.",
    description: "Консервативные правила возвращают ALLOW, REVIEW_REQUIRED или BLOCK с причинами и доказательствами.",
    columns: [{ key: "rule", label: "Правило" }, { key: "scope", label: "Область" }, { key: "decision", label: "Решение" }, { key: "version", label: "Версия" }, { key: "status", label: "Статус" }],
    rows: [
      { rule: "B2C cold outreach без согласия", scope: "RU · B2C", decision: "BLOCK", version: "1.0", status: "ACTIVE" },
      { rule: "Опубликованный ролевой e-mail", scope: "RU · B2B", decision: "REVIEW_REQUIRED", version: "1.0", status: "ACTIVE" },
      { rule: "First-party с доказанным согласием", scope: "RU · B2C/B2B", decision: "ALLOW", version: "1.0", status: "ACTIVE" },
    ],
  },
  settings: {
    title: "Настройки", eyebrow: "Workspace", action: "Сохранить",
    description: "Название продукта, локализация, роли, секреты интеграций и контакты crawler-оператора.",
    columns: [{ key: "setting", label: "Параметр" }, { key: "value", label: "Значение" }, { key: "scope", label: "Область" }, { key: "changed", label: "Изменён" }, { key: "status", label: "Статус" }],
    rows: [
      { setting: "Название интерфейса", value: "LeadScope", scope: "Workspace", changed: "Сегодня", status: "ACTIVE" },
      { setting: "Язык", value: "Русский / English", scope: "Пользователь", changed: "Сегодня", status: "ACTIVE" },
      { setting: "Crawler contact", value: "compliance@example.com", scope: "Workspace", changed: "31 авг", status: "ACTIVE" },
      { setting: "LLM provider", value: "Mock", scope: "Integration", changed: "—", status: "MOCK" },
    ],
  },
};

