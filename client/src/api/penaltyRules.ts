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

export interface RawPenaltyRule {
  id: string;
  goddess_id: string;
  sub_id: string | null;
  trigger: string;
  action: string;
  points_delta: number;
  fee_amount: string | null;
  cooldown_hours: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RawPenaltyRuleIn {
  trigger: string;
  action: string;
  points_delta: number;
  fee_amount?: string | null;
  cooldown_hours: number;
  active: boolean;
  sub_id?: string | null;
}

export interface RawPenaltyRuleUpdate {
  trigger?: string | null;
  action?: string | null;
  points_delta?: number | null;
  fee_amount?: string | null;
  cooldown_hours?: number | null;
  active?: boolean | null;
  sub_id?: string | null;
}

export async function fetchPenaltyRules(): Promise<RawPenaltyRule[]> {
  return fetchJson<RawPenaltyRule[]>("/goddess/penalty-rules");
}

export async function createPenaltyRule(body: RawPenaltyRuleIn): Promise<RawPenaltyRule> {
  return fetchJson<RawPenaltyRule>("/goddess/penalty-rules", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updatePenaltyRule(
  id: string,
  body: RawPenaltyRuleUpdate,
): Promise<RawPenaltyRule> {
  return fetchJson<RawPenaltyRule>(`/goddess/penalty-rules/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deletePenaltyRule(id: string): Promise<void> {
  return fetchJson<void>(`/goddess/penalty-rules/${id}`, { method: "DELETE" });
}
