export type WorkspaceRecord = {
  id: string;
  [key: string]: unknown;
};

export type WorkspaceSettings = {
  workspaceName: string;
  country: string;
  region: string;
  markets: string[];
  locale: string;
  crawlerContact: string;
  notifications: boolean;
};

export type WorkspaceState = {
  version: 2;
  updatedAt: string;
  settings: WorkspaceSettings;
  niches: WorkspaceRecord[];
  competitors: WorkspaceRecord[];
  sources: WorkspaceRecord[];
  crawls: WorkspaceRecord[];
  offers: WorkspaceRecord[];
  opportunities: WorkspaceRecord[];
  companies: WorkspaceRecord[];
  signals: WorkspaceRecord[];
  contacts: WorkspaceRecord[];
  leads: WorkspaceRecord[];
  suppressions: WorkspaceRecord[];
  requests: WorkspaceRecord[];
  exports: WorkspaceRecord[];
  integrations: WorkspaceRecord[];
  audit: WorkspaceRecord[];
  retention: WorkspaceRecord[];
  policies: WorkspaceRecord[];
  notifications: WorkspaceRecord[];
};

export type CollectionKey = Exclude<keyof WorkspaceState, "version" | "updatedAt" | "settings">;

export const initialWorkspace: WorkspaceState = {
  version: 2,
  updatedAt: "2026-09-04T08:00:00.000Z",
  settings: {
    workspaceName: "LeadScope Demo",
    country: "Россия",
    region: "Москва",
    markets: ["B2C", "B2B"],
    locale: "ru",
    crawlerContact: "compliance@example.com",
    notifications: true,
  },
  niches: [
    { id: "niche-auto", name: "Автокредиты", market: "B2C", sensitivity: "FINANCIAL", retention: "30 дней", version: "2.0", status: "ACTIVE" },
    { id: "niche-repair", name: "Ремонт смартфонов", market: "B2C", sensitivity: "NORMAL", retention: "365 дней", version: "2.0", status: "ACTIVE" },
    { id: "niche-equipment", name: "Оборудование для автосервисов", market: "B2B", sensitivity: "NORMAL", retention: "365 дней", version: "2.0", status: "ACTIVE" },
  ],
  competitors: [
    { id: "competitor-service", name: "Пример Сервис", domain: "service.example.com", niche: "Ремонт смартфонов", freshness: "12 минут назад", status: "ACTIVE" },
    { id: "competitor-finance", name: "Финанс Авто", domain: "finance-auto.example.org", niche: "Автокредиты", freshness: "2 часа назад", status: "ACTIVE" },
    { id: "competitor-clinic", name: "Клиника Пример", domain: "clinic.example.com", niche: "Косметология", freshness: "1 день назад", status: "REVIEW_REQUIRED" },
  ],
  sources: [
    { id: "source-service", source: "service.example.com", url: "https://service.example.com", type: "Сайт компании", robots: "ALLOWED", trust: 82, owner: "Пример Сервис", legalBasis: "Публичные коммерческие предложения", status: "APPROVED" },
    { id: "source-catalog", source: "catalog.example.org", url: "https://catalog.example.org", type: "Каталог", robots: "CHECKED", trust: 71, owner: "Каталог", legalBasis: "Требуется проверка условий", status: "REVIEW_REQUIRED" },
    { id: "source-private", source: "private.example.com", url: "https://private.example.com", type: "Неизвестный", robots: "DENIED", trust: 12, owner: "Не определён", legalBasis: "Нет основания", status: "BLOCKED" },
  ],
  crawls: [
    { id: "crawl-service", sourceId: "source-service", url: "https://service.example.com", pages: 12, changed: 3, duration: "00:42", status: "COMPLETED", startedAt: "Сегодня, 09:42" },
    { id: "crawl-private", sourceId: "source-private", url: "https://private.example.com", pages: 0, changed: 0, duration: "00:01", status: "BLOCKED", startedAt: "Вчера, 17:20" },
  ],
  offers: [
    { id: "offer-screen", offer: "Замена экрана", company: "Пример Сервис", price: "7 500 ₽", change: "+600 ₽", evidence: "service.example.com/screens", status: "VERIFIED" },
    { id: "offer-diagnostics", offer: "Диагностика", company: "Пример Сервис", price: "Бесплатно", change: "—", evidence: "service.example.com/diagnostics", status: "VERIFIED" },
    { id: "offer-credit", offer: "Автокредит", company: "Финанс Авто", price: "от 12,9%", change: "+0,4 п.п.", evidence: "finance-auto.example.org/rates", status: "VERIFIED" },
  ],
  opportunities: [
    { id: "opportunity-fast", opportunity: "Ремонт за 60 минут", signals: 42, gap: "Высокий", confidence: 84, score: 82, status: "ACTIVE" },
    { id: "opportunity-credit", opportunity: "Кредит без визита", signals: 37, gap: "Средний", confidence: 76, score: 74, status: "ACTIVE" },
    { id: "opportunity-warranty", opportunity: "Прозрачная гарантия", signals: 29, gap: "Высокий", confidence: 81, score: 71, status: "ACTIVE" },
  ],
  companies: [
    { id: "company-garage", company: "ООО «Гараж Технологий»", domain: "garage-tech.example.org", industry: "Автосервисы", size: "51–200", signals: 2, score: 86, status: "ICP_MATCH" },
    { id: "company-north", company: "АО «Север Сервис»", domain: "north-service.example.com", industry: "Техобслуживание", size: "201–500", signals: 3, score: 81, status: "ICP_MATCH" },
    { id: "company-sales", company: "ООО «Продажи Онлайн»", domain: "sales-online.example.org", industry: "SaaS", size: "11–50", signals: 1, score: 73, status: "WATCH" },
  ],
  signals: [
    { id: "signal-tender", companyId: "company-garage", company: "Гараж Технологий", signal: "Запрос на диагностическое оборудование", type: "TENDER", date: "Сегодня, 09:42", confidence: 94, status: "NEW" },
    { id: "signal-vacancy", companyId: "company-garage", company: "Гараж Технологий", signal: "Руководитель отдела закупок", type: "VACANCY", date: "Вчера, 17:20", confidence: 88, status: "ACTIVE" },
    { id: "signal-expansion", companyId: "company-north", company: "Север Сервис", signal: "Открытие филиала в Казани", type: "EXPANSION", date: "2 дня назад", confidence: 83, status: "ACTIVE" },
  ],
  contacts: [
    { id: "contact-garage", company: "Гараж Технологий", contact: "p•••@garage-tech.example.org", kind: "ROLE_EMAIL", source: "/contacts", legalBasis: "Публичный деловой контакт", status: "REVIEW_REQUIRED" },
    { id: "contact-north", company: "Север Сервис", contact: "+••• ••• •• 04", kind: "COMPANY_PHONE", source: "/about", legalBasis: "Общий телефон компании", status: "APPROVED" },
  ],
  leads: [
    { id: "lead-first", lead: "i•••@example.com", identityHash: "8fd91e14c58f2d71", source: "FIRST_PARTY_FORM", channels: "EMAIL · PHONE", score: 88, status: "CONTACT_ALLOWED", consent: "VERIFIED", createdAt: "3 сен, 09:41", purpose: "Ответ на заявку", timeline: [
      { title: "Согласие выдано", detail: "Текст v2.0 · Email и Phone", time: "3 сентября, 09:41:02" },
      { title: "Policy: ALLOW", detail: "FIRST_PARTY_VERIFIED_CONSENT", time: "3 сентября, 09:41:03" },
    ] },
    { id: "lead-partner", lead: "p•••@example.org", identityHash: "5a2f1197a8f411ce", source: "PARTNER", channels: "—", score: 34, status: "QUARANTINED", consent: "INCOMPLETE", createdAt: "Сегодня, 08:10", purpose: "Партнёрская заявка", timeline: [] },
    { id: "lead-revoked", lead: "r•••@example.com", identityHash: "b6d81b368ac09100", source: "FIRST_PARTY_FORM", channels: "—", score: 71, status: "SUPPRESSED", consent: "REVOKED", createdAt: "31 авг, 18:20", purpose: "Обратный звонок", timeline: [] },
  ],
  suppressions: [
    { id: "suppression-first", hash: "b6d81b36…8ac091", identityHash: "b6d81b368ac09100", channel: "EMAIL", reason: "REVOKED", date: "31 авг 2026", status: "ACTIVE" },
  ],
  requests: [
    { id: "request-access", request: "DSR-2026-041", subject: "a•••@example.com", type: "ACCESS", owner: "Анна К.", deadline: "12 сен", status: "IN_PROGRESS" },
    { id: "request-delete", request: "DSR-2026-040", subject: "d•••@example.org", type: "DELETE", owner: "Илья М.", deadline: "8 сен", status: "REVIEW_REQUIRED" },
  ],
  exports: [
    { id: "export-128", export: "EXP-000128", provider: "CSV", records: 1, actor: "Демо-владелец", date: "Сегодня, 10:34", status: "COMPLETED" },
  ],
  integrations: [
    { id: "integration-crm", name: "CRM", provider: "Mock CRM", lastSync: "Не подключено", status: "MOCK" },
    { id: "integration-webhook", name: "Lead webhook", provider: "HMAC v2", lastSync: "Сегодня, 09:41", status: "ACTIVE" },
    { id: "integration-llm", name: "Redacted LLM", provider: "Mock", lastSync: "—", status: "MOCK" },
  ],
  audit: [
    { id: "audit-export", action: "LEADS_EXPORT", actor: "Демо-владелец", entity: "EXP-000128", time: "Сегодня, 10:34:22", status: "SUCCESS" },
    { id: "audit-block", action: "LEAD_FROM_REVIEW_ATTEMPT", actor: "Policy Engine", entity: "review:0f9a…", time: "Сегодня, 09:51:04", status: "BLOCKED" },
    { id: "audit-source", action: "SOURCE_APPROVE", actor: "Анна К.", entity: "service.example.com", time: "Вчера, 17:03", status: "SUCCESS" },
  ],
  retention: [
    { id: "retention-lead", class: "B2C lead", period: "365 дней", days: 365, action: "ANONYMIZE", next: "Завтра, 02:00", status: "ACTIVE" },
    { id: "retention-health", class: "Health niche evidence", period: "30 дней", days: 30, action: "DELETE", next: "Завтра, 02:00", status: "ACTIVE" },
    { id: "retention-suppression", class: "Suppression hash", period: "По политике", days: 0, action: "PRESERVE_MINIMUM", next: "—", status: "ACTIVE" },
  ],
  policies: [
    { id: "policy-cold", rule: "B2C cold outreach без согласия", scope: "RU · B2C", decision: "BLOCK", version: "2.0", status: "ACTIVE" },
    { id: "policy-role", rule: "Опубликованный ролевой e-mail", scope: "RU · B2B", decision: "REVIEW_REQUIRED", version: "2.0", status: "ACTIVE" },
    { id: "policy-first", rule: "First-party с доказанным согласием", scope: "RU · B2C/B2B", decision: "ALLOW", version: "2.0", status: "ACTIVE" },
  ],
  notifications: [
    { id: "notification-review", title: "3 записи требуют проверки", body: "Партнёрский лид, контакт и источник", time: "5 минут назад", read: false, kind: "REVIEW" },
    { id: "notification-crawl", title: "Сканирование завершено", body: "service.example.com · 3 изменения", time: "12 минут назад", read: false, kind: "SUCCESS" },
  ],
};

export function createInitialWorkspace(): WorkspaceState {
  return structuredClone(initialWorkspace);
}

export function textValue(record: WorkspaceRecord, key: string, fallback = "—"): string {
  const value = record[key];
  return value === undefined || value === null || value === "" ? fallback : String(value);
}

export function numberValue(record: WorkspaceRecord, key: string): number {
  const value = Number(record[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}
