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

export type RawToyCategory =
  | "restraint"
  | "impact"
  | "vibrator"
  | "plug"
  | "cage"
  | "gag"
  | "clothing"
  | "collar"
  | "other";

export type RawToyProposedBy = "sub" | "goddess";

export interface RawToyItem {
  id: string;
  sub_id: string;
  goddess_id: string;
  category: RawToyCategory;
  name: string;
  description: string | null;
  photo_r2_key: string | null;
  proposed_by: RawToyProposedBy;
  approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface RawToyCreateIn {
  category: RawToyCategory;
  name: string;
  description?: string | null;
  photo_r2_key?: string | null;
}

export interface RawToyUpdateIn {
  category?: RawToyCategory | null;
  name?: string | null;
  description?: string | null;
  photo_r2_key?: string | null;
}

export async function fetchSubToys(): Promise<RawToyItem[]> {
  return fetchJson<RawToyItem[]>("/sub/profile/toys");
}

export async function proposeSubToy(body: RawToyCreateIn): Promise<RawToyItem> {
  return fetchJson<RawToyItem>("/sub/profile/toys", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchGoddessSubToys(subId: string): Promise<RawToyItem[]> {
  return fetchJson<RawToyItem[]>(`/goddess/subs/${subId}/toys`);
}

export async function createGoddessSubToy(
  subId: string,
  body: RawToyCreateIn,
): Promise<RawToyItem> {
  return fetchJson<RawToyItem>(`/goddess/subs/${subId}/toys`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateGoddessToy(
  toyId: string,
  body: RawToyUpdateIn,
): Promise<RawToyItem> {
  return fetchJson<RawToyItem>(`/goddess/toys/${toyId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteGoddessToy(toyId: string): Promise<void> {
  return fetchJson<void>(`/goddess/toys/${toyId}`, { method: "DELETE" });
}

export async function approveGoddessToy(toyId: string): Promise<RawToyItem> {
  return fetchJson<RawToyItem>(`/goddess/toys/${toyId}/approve`, { method: "POST" });
}

export async function rejectGoddessToy(toyId: string): Promise<void> {
  return fetchJson<void>(`/goddess/toys/${toyId}/reject`, { method: "POST" });
}
