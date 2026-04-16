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

export interface RawRewardTier {
  id: string;
  goddess_id: string;
  name: string;
  description: string | null;
  cost: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RawRewardTierIn {
  name: string;
  description?: string | null;
  cost: number;
  active?: boolean;
}

export interface RawRewardTierPatchIn {
  name?: string | null;
  description?: string | null;
  cost?: number | null;
  active?: boolean | null;
}

export interface RawPunishmentTier {
  id: string;
  goddess_id: string;
  name: string;
  description: string | null;
  default_points_penalty: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RawPunishmentTierIn {
  name: string;
  description?: string | null;
  default_points_penalty?: number;
  active?: boolean;
}

export interface RawPunishmentTierPatchIn {
  name?: string | null;
  description?: string | null;
  default_points_penalty?: number | null;
  active?: boolean | null;
}

export interface RawPointsBalance {
  balance: number;
  last_event_at: string | null;
  event_count: number;
}

export interface RawRedeemOut {
  redemption_id: string;
  new_balance: number;
}

// --- Points balance ---

export async function getOwnPointsBalanceApi(): Promise<RawPointsBalance> {
  return fetchJson<RawPointsBalance>("/sub/points-balance");
}

// --- Sub rewards ---

export async function listSubRewardsApi(): Promise<RawRewardTier[]> {
  return fetchJson<RawRewardTier[]>("/sub/rewards");
}

export async function redeemRewardApi(rewardId: string): Promise<RawRedeemOut> {
  return fetchJson<RawRedeemOut>(`/sub/rewards/${rewardId}/redeem`, { method: "POST" });
}

// --- Goddess reward tier CRUD ---

export async function listGoddessRewardsApi(): Promise<RawRewardTier[]> {
  return fetchJson<RawRewardTier[]>("/goddess/rewards");
}

export async function createGoddessRewardApi(payload: RawRewardTierIn): Promise<RawRewardTier> {
  return fetchJson<RawRewardTier>("/goddess/rewards", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateGoddessRewardApi(
  rewardId: string,
  payload: RawRewardTierPatchIn,
): Promise<RawRewardTier> {
  return fetchJson<RawRewardTier>(`/goddess/rewards/${rewardId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteGoddessRewardApi(rewardId: string): Promise<void> {
  await fetchJson<void>(`/goddess/rewards/${rewardId}`, { method: "DELETE" });
}

// --- Goddess punishment tier CRUD ---

export async function listGoddessPunishmentsApi(): Promise<RawPunishmentTier[]> {
  return fetchJson<RawPunishmentTier[]>("/goddess/punishments");
}

export async function createGoddessPunishmentApi(
  payload: RawPunishmentTierIn,
): Promise<RawPunishmentTier> {
  return fetchJson<RawPunishmentTier>("/goddess/punishments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateGoddessPunishmentApi(
  punishmentId: string,
  payload: RawPunishmentTierPatchIn,
): Promise<RawPunishmentTier> {
  return fetchJson<RawPunishmentTier>(`/goddess/punishments/${punishmentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteGoddessPunishmentApi(punishmentId: string): Promise<void> {
  await fetchJson<void>(`/goddess/punishments/${punishmentId}`, { method: "DELETE" });
}

export async function invokeGoddessPunishmentApi(
  punishmentId: string,
  subId: string,
): Promise<unknown> {
  return fetchJson<unknown>(`/goddess/punishments/${punishmentId}/invoke`, {
    method: "POST",
    body: JSON.stringify({ sub_id: subId }),
  });
}
