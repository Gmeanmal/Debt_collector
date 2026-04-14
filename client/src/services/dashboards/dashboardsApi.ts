import { apiClient } from "@/api/client";
import { getAccessToken } from "@/services/auth/tokenStorage";
import type { components } from "@/types/api.generated";

export type GoddessDashboardOut = components["schemas"]["GoddessDashboardOut"];
export type SubDashboardOut = components["schemas"]["SubDashboardOut"];
export type LatePaymentItem = components["schemas"]["LatePaymentItem"];
export type ActiveContractSummary = components["schemas"]["ActiveContractSummary"];

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractMessage(error: unknown, fallback: string): string {
  const err = error as { message?: string; detail?: string } | null;
  const msg = err?.message ?? err?.detail;
  return typeof msg === "string" && msg.length > 0 ? msg : fallback;
}

export async function getGoddessDashboardApi(): Promise<GoddessDashboardOut> {
  const { data, error } = await apiClient.GET("/goddess/dashboard", {
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to load goddess dashboard"));
  return data;
}

export async function getSubDashboardApi(): Promise<SubDashboardOut> {
  const { data, error } = await apiClient.GET("/sub/dashboard", {
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to load sub dashboard"));
  return data;
}
