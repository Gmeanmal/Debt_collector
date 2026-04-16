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

export interface RawKinkItem {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  safety_flag: boolean;
  is_custom: boolean;
  rating: string;
  note: string | null;
  needs_confirmation: boolean;
}

export interface RawKinkCategory {
  id: string;
  slug: string;
  label: string;
  safety_flag: boolean;
  sort_order: number;
  items: RawKinkItem[];
}

export interface RawKinkMatrix {
  categories: RawKinkCategory[];
}

export interface RawSubKinkRatingOut {
  item_id: string;
  rating: string;
  note: string | null;
  needs_confirmation: boolean;
  updated_at: string;
}

export async function fetchSubKinkMatrix(): Promise<RawKinkMatrix> {
  return fetchJson<RawKinkMatrix>("/sub/profile/kinks");
}

export async function upsertSubKinkRating(
  itemId: string,
  rating: string,
): Promise<RawSubKinkRatingOut> {
  return fetchJson<RawSubKinkRatingOut>(`/sub/profile/kinks/${itemId}`, {
    method: "PUT",
    body: JSON.stringify({ rating }),
  });
}
