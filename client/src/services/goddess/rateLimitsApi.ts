import { apiClient } from "@/api/client";
import { getAccessToken } from "@/services/auth/tokenStorage";
import type { components } from "@/types/api.generated";

export type GoddessRateLimitsOut = components["schemas"]["GoddessRateLimitsOut"];

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getGoddessRateLimitsApi(): Promise<GoddessRateLimitsOut> {
  const { data, error } = await apiClient.GET("/goddess/me/rate-limits", {
    headers: authHeaders(),
  });
  if (error || !data) {
    const err = error as { message?: string; detail?: string } | null;
    throw new Error(err?.message ?? err?.detail ?? "Failed to load rate limits");
  }
  return data;
}
