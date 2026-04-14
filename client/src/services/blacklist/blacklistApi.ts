import { apiClient } from "@/api/client";
import { getAccessToken } from "@/services/auth/tokenStorage";
import type { components } from "@/types/api.generated";

export type BlacklistEntryOut = components["schemas"]["BlacklistEntryOut"];
export type BreachIn = components["schemas"]["BreachIn"];
export type ForgiveIn = components["schemas"]["ForgiveIn"];

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractMessage(error: unknown, fallback: string): string {
  const err = error as { message?: string; detail?: string } | null;
  const msg = err?.message ?? err?.detail;
  return typeof msg === "string" && msg.length > 0 ? msg : fallback;
}

export async function breachSubApi(subId: string, body: BreachIn): Promise<BlacklistEntryOut> {
  const { data, error } = await apiClient.POST("/goddess/subs/{sub_id}/breach", {
    params: { path: { sub_id: subId } },
    body,
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to breach sub"));
  return data;
}

export async function listBlacklistApi(): Promise<BlacklistEntryOut[]> {
  const { data, error } = await apiClient.GET("/goddess/blacklist", {
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to list blacklist"));
  return data;
}

export async function forgiveEntryApi(
  entryId: string,
  body: ForgiveIn,
): Promise<BlacklistEntryOut> {
  const { data, error } = await apiClient.POST("/goddess/blacklist/{entry_id}/forgive", {
    params: { path: { entry_id: entryId } },
    body,
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to forgive entry"));
  return data;
}
