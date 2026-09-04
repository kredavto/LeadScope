export const dictionaries = {
  ru: {
    dashboard: "Обзор",
    competitors: "Конкуренты",
    leads: "Входящие лиды",
    compliance: "Compliance-проверка",
    disclaimer: "Политики — технические ограничители, а не юридическая гарантия. Настройте их со специалистом для стран фактической работы.",
  },
  en: {
    dashboard: "Dashboard",
    competitors: "Competitors",
    leads: "Inbound leads",
    compliance: "Compliance review",
    disclaimer: "Policies are technical safeguards, not a legal guarantee. Configure them with counsel for every operating jurisdiction.",
  },
} as const;

export type Locale = keyof typeof dictionaries;

