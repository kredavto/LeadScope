"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createInitialWorkspace, type CollectionKey, type WorkspaceRecord, type WorkspaceSettings, type WorkspaceState } from "@/lib/workspace-data";

const STORAGE_KEY = "leadscope.workspace:v2";

type WorkspaceContextValue = {
  workspace: WorkspaceState;
  hydrated: boolean;
  addRecord: (collection: CollectionKey, record: Omit<WorkspaceRecord, "id">) => string;
  updateRecord: (collection: CollectionKey, id: string, patch: Partial<WorkspaceRecord>) => void;
  removeRecord: (collection: CollectionKey, id: string) => void;
  addAudit: (action: string, entity: string, status?: string) => void;
  notify: (title: string, body: string, kind?: string) => void;
  saveSettings: (settings: Partial<WorkspaceSettings>) => void;
  resetWorkspace: () => void;
  markNotificationsRead: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => createInitialWorkspace());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as WorkspaceState;
          if (parsed.version === 2) setWorkspace(parsed);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  }, [hydrated, workspace]);

  const mutate = useCallback((recipe: (current: WorkspaceState) => WorkspaceState) => {
    setWorkspace((current) => ({ ...recipe(current), updatedAt: new Date().toISOString() }));
  }, []);

  const addRecord = useCallback((collection: CollectionKey, record: Omit<WorkspaceRecord, "id">) => {
    const id = makeId(collection.slice(0, -1) || collection);
    mutate((current) => ({ ...current, [collection]: [{ id, ...record }, ...current[collection]] }));
    return id;
  }, [mutate]);

  const updateRecord = useCallback((collection: CollectionKey, id: string, patch: Partial<WorkspaceRecord>) => {
    mutate((current) => ({ ...current, [collection]: current[collection].map((record) => record.id === id ? { ...record, ...patch } : record) }));
  }, [mutate]);

  const removeRecord = useCallback((collection: CollectionKey, id: string) => {
    mutate((current) => ({ ...current, [collection]: current[collection].filter((record) => record.id !== id) }));
  }, [mutate]);

  const addAudit = useCallback((action: string, entity: string, status = "SUCCESS") => {
    addRecord("audit", { action, actor: "Демо-владелец", entity, time: new Date().toLocaleString("ru-RU"), status });
  }, [addRecord]);

  const notify = useCallback((title: string, body: string, kind = "SUCCESS") => {
    addRecord("notifications", { title, body, time: "только что", read: false, kind });
  }, [addRecord]);

  const saveSettings = useCallback((settings: Partial<WorkspaceSettings>) => {
    mutate((current) => ({ ...current, settings: { ...current.settings, ...settings } }));
  }, [mutate]);

  const resetWorkspace = useCallback(() => setWorkspace(createInitialWorkspace()), []);
  const markNotificationsRead = useCallback(() => {
    mutate((current) => ({ ...current, notifications: current.notifications.map((item) => ({ ...item, read: true })) }));
  }, [mutate]);

  const value = useMemo(() => ({ workspace, hydrated, addRecord, updateRecord, removeRecord, addAudit, notify, saveSettings, resetWorkspace, markNotificationsRead }), [workspace, hydrated, addRecord, updateRecord, removeRecord, addAudit, notify, saveSettings, resetWorkspace, markNotificationsRead]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return context;
}
