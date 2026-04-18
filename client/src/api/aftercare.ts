import { getAccessToken } from "@/services/auth/tokenStorage";
import { env } from "@/utils/env";

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = env.VITE_API_BASE_URL;
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
  return res.json() as Promise<T>;
}

async function fetchEmpty(path: string, init: RequestInit = {}): Promise<void> {
  const base = env.VITE_API_BASE_URL;
  const res = await fetch(`${base}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...authHeaders(),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `HTTP ${res.status}`);
  }
}

export interface RawAftercareOut {
  sub_id: string;
  needs: string | null;
  comfort_items: string | null;
  contact_phrase: string | null;
  notes: string | null;
  intensity: number;
  read_by_goddess_at: string | null;
  updated_at: string;
}

export interface RawAftercareUpdate {
  needs?: string | null;
  comfort_items?: string | null;
  contact_phrase?: string | null;
  notes?: string | null;
  intensity?: number | null;
}

export async function fetchAftercare(): Promise<RawAftercareOut> {
  return fetchJson<RawAftercareOut>("/profile/aftercare");
}

export async function putAftercare(body: RawAftercareUpdate): Promise<RawAftercareOut> {
  return fetchJson<RawAftercareOut>("/profile/aftercare", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function fetchSubAftercareForGoddess(username: string): Promise<RawAftercareOut> {
  return fetchJson<RawAftercareOut>(`/goddess/subs/${encodeURIComponent(username)}/aftercare`);
}

export async function postAftercareRead(username: string): Promise<void> {
  await fetchEmpty(`/goddess/subs/${encodeURIComponent(username)}/aftercare/read`, {
    method: "POST",
  });
}
