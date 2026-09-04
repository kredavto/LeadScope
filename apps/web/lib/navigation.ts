import {
  Activity,
  BadgeCheck,
  Blocks,
  BookOpenCheck,
  Building2,
  ClipboardCheck,
  Database,
  FileOutput,
  Gauge,
  Globe2,
  KeyRound,
  Layers3,
  ListChecks,
  Megaphone,
  Radar,
  Scale,
  Settings2,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

export const navigation = [
  { group: "Аналитика", items: [
    { href: "/", label: "Обзор", icon: Gauge },
    { href: "/market-map", label: "Карта предложений", icon: Layers3 },
    { href: "/demand", label: "Спрос и возможности", icon: Sparkles },
  ] },
  { group: "Разведка", items: [
    { href: "/niches", label: "Ниши и шаблоны", icon: Blocks },
    { href: "/competitors", label: "Конкуренты", icon: Radar },
    { href: "/sources", label: "Реестр источников", icon: Globe2 },
    { href: "/crawls", label: "Сканирования", icon: Activity },
    { href: "/accounts", label: "B2B-компании", icon: Building2 },
    { href: "/signals", label: "B2B-сигналы", icon: Megaphone },
    { href: "/contacts", label: "Деловые контакты", icon: BookOpenCheck },
  ] },
  { group: "Лиды", items: [
    { href: "/leads", label: "Входящие лиды", icon: UserRoundCheck },
    { href: "/compliance", label: "Compliance Review", icon: ClipboardCheck },
    { href: "/suppression", label: "Suppression List", icon: ShieldAlert },
    { href: "/data-requests", label: "Запросы субъектов", icon: Scale },
  ] },
  { group: "Управление", items: [
    { href: "/exports", label: "Экспорт и интеграции", icon: FileOutput },
    { href: "/audit", label: "Журнал аудита", icon: ListChecks },
    { href: "/retention", label: "Retention", icon: Database },
    { href: "/policies", label: "Политики", icon: SlidersHorizontal },
    { href: "/settings", label: "Настройки", icon: Settings2 },
  ] },
];

export const utilityNavigation = [
  { href: "/onboarding", label: "Onboarding", icon: BadgeCheck },
  { href: "/login", label: "Авторизация", icon: KeyRound },
];

