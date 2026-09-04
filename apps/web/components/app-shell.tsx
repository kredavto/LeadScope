"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Leaf, LogOut, Menu, PanelLeftClose, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { navigation } from "@/lib/navigation";
import { useWorkspace } from "./workspace-provider";

const collectionRoutes: Record<string, string> = { competitors: "/competitors", sources: "/sources", crawls: "/crawls", opportunities: "/demand", companies: "/accounts", signals: "/signals", contacts: "/contacts", leads: "/leads", requests: "/data-requests" };

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { workspace, markNotificationsRead } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const unread = workspace.notifications.filter((item) => !item.read).length;
  const matchedResults = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru");
    if (normalized.length < 2) return [];
    return Object.entries(collectionRoutes).flatMap(([collection, href]) => {
      const value = workspace[collection as keyof typeof workspace];
      if (!Array.isArray(value)) return [];
      return value.filter((item) => Object.values(item).some((entry) => String(entry).toLocaleLowerCase("ru").includes(normalized))).slice(0, 3).map((item) => ({ id: item.id, href, label: String(item.name ?? item.company ?? item.opportunity ?? item.signal ?? item.source ?? item.lead ?? item.request ?? item.url ?? item.id), collection }));
    }).slice(0, 8);
  }, [query, workspace]);

  return (
    <div className={`shell ${collapsed ? "collapsed" : ""}`}>
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
            <button className="icon-btn" aria-label="Поиск" onClick={() => setSearchOpen(true)}><Search size={16} /></button>
            <button className="icon-btn indicator-wrap" aria-label={`Уведомления: ${unread}`} onClick={() => setNotificationsOpen((value) => !value)}><Bell size={16} />{unread ? <span className="indicator">{unread}</span> : null}</button>
            <button className="icon-btn" aria-label="Свернуть панель" onClick={() => setCollapsed((value) => !value)}><PanelLeftClose size={16} /></button>
            <button className="avatar avatar-button" aria-label="Выйти" onClick={() => { window.localStorage.removeItem("leadscope.session"); router.push("/login"); }}><LogOut size={14}/></button>
          </div>
          {notificationsOpen ? <div className="popover notifications"><div className="card-head"><div className="card-title">Уведомления</div><button className="tag" onClick={markNotificationsRead}>Прочитать все</button></div><div>{workspace.notifications.slice(0, 6).map((item) => <div className={`notification ${item.read ? "read" : ""}`} key={item.id}><b>{String(item.title)}</b><span>{String(item.body)}</span><time>{String(item.time)}</time></div>)}</div></div> : null}
        </header>
        <div className="content">{children}</div>
      </main>
      {searchOpen ? <div className="modal-backdrop" role="presentation" onMouseDown={() => setSearchOpen(false)}><section className="modal-card search-modal" role="dialog" aria-modal="true" aria-label="Глобальный поиск" onMouseDown={(event) => event.stopPropagation()}><div className="card-head"><div className="card-title">Глобальный поиск</div><button className="icon-btn" onClick={() => setSearchOpen(false)} aria-label="Закрыть"><X size={16}/></button></div><div className="card-body"><div className="search !max-w-none"><Search size={14}/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Компания, сигнал, источник или лид…"/></div><div className="search-results">{matchedResults.map((item) => <Link href={item.href} key={`${item.collection}-${item.id}`} onClick={() => setSearchOpen(false)}><span>{item.label}</span><small>{item.collection}</small></Link>)}{query.length >= 2 && !matchedResults.length ? <p className="subtitle">Совпадений нет</p> : null}</div></div></section></div> : null}
    </div>
  );
}
