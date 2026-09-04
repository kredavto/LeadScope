"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Leaf, Menu, PanelLeftClose, Search, X } from "lucide-react";
import { useState } from "react";
import { navigation } from "@/lib/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Основная навигация">
        <div className="brand">
          <span className="brand-mark"><Leaf size={20} strokeWidth={2.4} /></span>
          <div><strong>LeadScope</strong><small>INTELLIGENCE PLATFORM</small></div>
          <button className="menu-btn ml-auto" onClick={() => setOpen(false)} aria-label="Закрыть меню"><X size={18} /></button>
        </div>
        {navigation.map((group) => (
          <nav key={group.group} aria-label={group.group}>
            <div className="nav-label">{group.group}</div>
            {group.items.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link className={`nav-link ${active ? "active" : ""}`} href={item.href} key={item.href} onClick={() => setOpen(false)}>
                  <Icon size={16} strokeWidth={1.8} /><span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        ))}
        <div className="sidebar-foot">Технические политики требуют настройки специалистом под фактические юрисдикции.</div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="workspace">
            <button className="menu-btn" onClick={() => setOpen(true)} aria-label="Открыть меню"><Menu size={18} /></button>
            <div><div className="workspace-name">LeadScope Demo</div><div className="workspace-meta">Россия · B2C + B2B · Данные обновлены 12 мин назад</div></div>
          </div>
          <div className="top-actions">
            <button className="icon-btn" aria-label="Поиск"><Search size={16} /></button>
            <button className="icon-btn" aria-label="Уведомления"><Bell size={16} /></button>
            <button className="icon-btn" aria-label="Свернуть панель"><PanelLeftClose size={16} /></button>
            <div className="avatar" aria-label="Демо-владелец">ДВ</div>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}

