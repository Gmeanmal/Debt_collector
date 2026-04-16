import { getAccessToken } from "@/services/auth/tokenStorage";

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(path: string): Promise<T> {
  const { VITE_API_BASE_URL } = import.meta.env as Record<string, string>;
  const base = VITE_API_BASE_URL ?? "";
  const res = await fetch(`${base}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface RawKinkOverviewItem {
  item_id: string;
  slug: string;
  label: string;
  category_label: string;
  category_sort_order: number;
  safety_flag: boolean;
  counts: Record<string, number>;
}

export interface RawKinkOverview {
  total_subs: number;
  items: RawKinkOverviewItem[];
}

export async function fetchKinkOverview(): Promise<RawKinkOverview> {
  return fetchJson<RawKinkOverview>("/goddess/kinks/overview");
}
