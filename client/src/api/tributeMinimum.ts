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

export type RawTributePeriod = "weekly" | "monthly";
export type RawGaugeColor = "green" | "amber" | "red";

export interface RawTributeGaugeOut {
  configured: boolean;
  target_amount: string | null;
  period: RawTributePeriod | null;
  actual_this_period: string;
  ratio: string | null;
  color: RawGaugeColor;
  period_start: string;
  period_end: string;
}

export async function fetchTributeGauge(subId: string): Promise<RawTributeGaugeOut> {
  return fetchJson<RawTributeGaugeOut>(`/goddess/subs/${subId}/tribute-minimum/gauge`);
}
