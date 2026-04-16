import { getAccessToken } from "@/services/auth/tokenStorage";

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { VITE_API_BASE_URL } = import.meta.env as Record<string, string>;
  const base = VITE_API_BASE_URL ?? "";
  const res = await fetch(`${base}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export interface RawLimitItem {
  id: string;
  sub_id: string;
  kind: string;
  severity: string;
  body: string;
  acknowledged_by_goddess_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RawLimitCreate {
  kind: string;
  severity: string;
  label: string;
  notes?: string | null;
}

export interface RawLimitUpdate {
  kind?: string | null;
  severity?: string | null;
  label?: string | null;
  notes?: string | null;
}

export interface RawTriggerItem {
  id: string;
  sub_id: string;
  severity: string;
  trigger_text: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RawTriggerCreate {
  severity: string;
  trigger_text: string;
  notes?: string | null;
}

export interface RawTriggerUpdate {
  severity?: string | null;
  trigger_text?: string | null;
  notes?: string | null;
}

export async function fetchLimits(): Promise<RawLimitItem[]> {
  return fetchJson<RawLimitItem[]>("/sub/profile/limits");
}

export async function createLimit(body: RawLimitCreate): Promise<RawLimitItem> {
  return fetchJson<RawLimitItem>("/sub/profile/limits", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateLimit(id: string, body: RawLimitUpdate): Promise<RawLimitItem> {
  return fetchJson<RawLimitItem>(`/sub/profile/limits/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteLimit(id: string): Promise<void> {
  return fetchJson<void>(`/sub/profile/limits/${id}`, { method: "DELETE" });
}

export async function fetchTriggers(): Promise<RawTriggerItem[]> {
  return fetchJson<RawTriggerItem[]>("/sub/profile/triggers");
}

export async function createTrigger(body: RawTriggerCreate): Promise<RawTriggerItem> {
  return fetchJson<RawTriggerItem>("/sub/profile/triggers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateTrigger(id: string, body: RawTriggerUpdate): Promise<RawTriggerItem> {
  return fetchJson<RawTriggerItem>(`/sub/profile/triggers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteTrigger(id: string): Promise<void> {
  return fetchJson<void>(`/sub/profile/triggers/${id}`, { method: "DELETE" });
}
