import { apiClient } from "@/api/client";
import { getAccessToken } from "@/services/auth/tokenStorage";
import type { components } from "@/types/api.generated";

export type RollingTributeIn = components["schemas"]["RollingTributeIn"];
export type RollingTributeOut = components["schemas"]["RollingTributeOut"];
export type DeadlineDay = components["schemas"]["DeadlineDay"];

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractMessage(error: unknown, fallback: string): string {
  const err = error as { message?: string; detail?: string } | null;
  const msg = err?.message ?? err?.detail;
  return typeof msg === "string" && msg.length > 0 ? msg : fallback;
}

export async function getRollingApi(subId: string): Promise<RollingTributeOut | null> {
  const { data, error } = await apiClient.GET("/goddess/subs/{sub_id}/rolling/", {
    params: { path: { sub_id: subId } },
    headers: authHeaders(),
  });
  if (error) throw new Error(extractMessage(error, "Failed to fetch rolling tribute"));
  return data ?? null;
}

export async function upsertRollingApi(
  subId: string,
  body: RollingTributeIn,
): Promise<RollingTributeOut> {
  const { data, error } = await apiClient.PUT("/goddess/subs/{sub_id}/rolling/", {
    params: { path: { sub_id: subId } },
    body,
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to save rolling tribute"));
  return data;
}

export async function clearRollingApi(subId: string): Promise<void> {
  const { error } = await apiClient.DELETE("/goddess/subs/{sub_id}/rolling/", {
    params: { path: { sub_id: subId } },
    headers: authHeaders(),
  });
  if (error) throw new Error(extractMessage(error, "Failed to clear rolling tribute"));
}
