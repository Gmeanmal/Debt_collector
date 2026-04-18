import { getAccessToken } from "@/services/auth/tokenStorage";
import { env } from "@/utils/env";
import type { RawKinkMatrix } from "@/api/kinks";
import type { RawLimitItem, RawTriggerItem } from "@/api/limits";

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

export interface RawSafewordOut {
  word: string;
  signal: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  updated_at: string;
}

export interface RawTopPhotoOut {
  id: string;
  presigned_get_url: string;
  reviewed_at: string | null;
}

export async function fetchSubKinkMatrixForGoddess(subId: string): Promise<RawKinkMatrix> {
  return fetchJson<RawKinkMatrix>(`/goddess/subs/${encodeURIComponent(subId)}/kinks`);
}

export async function fetchSubLimitsForGoddess(subId: string): Promise<RawLimitItem[]> {
  return fetchJson<RawLimitItem[]>(`/goddess/subs/${encodeURIComponent(subId)}/limits`);
}

export async function fetchSubTriggersForGoddess(subId: string): Promise<RawTriggerItem[]> {
  return fetchJson<RawTriggerItem[]>(`/goddess/subs/${encodeURIComponent(subId)}/triggers`);
}

export async function fetchSubSafewordForGoddess(subId: string): Promise<RawSafewordOut | null> {
  const base = env.VITE_API_BASE_URL;
  const res = await fetch(`${base}/goddess/subs/${encodeURIComponent(subId)}/safeword`, {
    credentials: "include",
    headers: authHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `HTTP ${res.status}`);
  }
  return res.json() as Promise<RawSafewordOut>;
}

export async function fetchSubTopApprovedPhoto(subId: string): Promise<RawTopPhotoOut | null> {
  const base = env.VITE_API_BASE_URL;
  const res = await fetch(`${base}/goddess/subs/${encodeURIComponent(subId)}/photos/top`, {
    credentials: "include",
    headers: authHeaders(),
  });
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `HTTP ${res.status}`);
  }
  const json = (await res.json()) as RawTopPhotoOut | null;
  return json;
}

export async function postGoddessMessageToSub(
  username: string,
  body: string,
): Promise<void> {
  await fetchJson<{ sent: boolean }>(`/goddess/subs/${encodeURIComponent(username)}/message`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}
