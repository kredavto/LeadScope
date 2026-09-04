export type ApiSession = {
  accessToken: string;
  tenantId: string;
  displayName: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const SESSION_KEY = "leadscope.session.v1";
const DEMO_TENANT_ID = "00000000-0000-4000-8000-000000000001";

export function getSession(): ApiSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ApiSession;
  } catch {
    window.sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function saveSession(session: ApiSession): ApiSession {
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function csrfToken(): string {
  const item = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("csrf_token="));
  return decodeURIComponent(item?.split("=").slice(1).join("=") ?? "");
}

export async function signIn(email: string, password: string): Promise<ApiSession> {
  if (DEMO_MODE) {
    if (email !== "owner@leadscope.example" || password !== "Demo-LeadScope-2026!") {
      throw new Error("Неверный e-mail или пароль");
    }
    return saveSession({
      accessToken: "vercel-demo-session",
      tenantId: DEMO_TENANT_ID,
      displayName: "Демо-владелец",
    });
  }
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error("Неверный e-mail или пароль");
  const token = (await response.json()) as { access_token: string };
  const profileResponse = await fetch(`${API_URL}/auth/me`, {
    credentials: "include",
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!profileResponse.ok) throw new Error("Не удалось загрузить workspace");
  const profile = (await profileResponse.json()) as {
    display_name: string;
    memberships: { tenant_id: string }[];
  };
  const tenantId = profile.memberships[0]?.tenant_id;
  if (!tenantId) throw new Error("Для пользователя не назначен workspace");
  return saveSession({
    accessToken: token.access_token,
    tenantId,
    displayName: profile.display_name,
  });
}

async function rotateAccessToken(session: ApiSession): Promise<ApiSession | null> {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRF-Token": csrfToken() },
  });
  if (!response.ok) return null;
  const token = (await response.json()) as { access_token: string };
  return saveSession({ ...session, accessToken: token.access_token });
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  allowRefresh = true,
): Promise<T> {
  const session = getSession();
  if (!session) throw new Error("Сначала войдите в LeadScope");
  if (DEMO_MODE) {
    const id = crypto.randomUUID();
    if (path.includes("/approve")) return { id: path.split("/")[2], status: "APPROVED" } as T;
    if (path === "/crawl-jobs") return { id, run_id: crypto.randomUUID(), status: "QUEUED" } as T;
    return { id, status: "CREATED" } as T;
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessToken}`,
      "X-Tenant-ID": session.tenantId,
      ...init.headers,
    },
  });
  if (response.status === 401 && allowRefresh) {
    const rotated = await rotateAccessToken(session);
    if (rotated) return apiRequest<T>(path, init, false);
  }
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { detail?: unknown } | null;
    throw new Error(typeof detail?.detail === "string" ? detail.detail : `API: ${response.status}`);
  }
  return (await response.json()) as T;
}
