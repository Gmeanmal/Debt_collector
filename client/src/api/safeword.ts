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
  return res.json() as Promise<T>;
}

export interface RawSafewordRecord {
  word: string;
  signal: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  updated_at: string;
}

export interface RawSafewordUpsert {
  word: string;
  signal?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
}

export async function fetchSafeword(): Promise<RawSafewordRecord> {
  return fetchJson<RawSafewordRecord>("/sub/profile/safeword");
}

export async function upsertSafeword(body: RawSafewordUpsert): Promise<RawSafewordRecord> {
  return fetchJson<RawSafewordRecord>("/sub/profile/safeword", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
