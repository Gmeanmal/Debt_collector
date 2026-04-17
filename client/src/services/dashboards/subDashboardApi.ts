import { apiClient } from "@/api/client";
import { getAccessToken } from "@/services/auth/tokenStorage";
import type { SubDashboardSummary } from "@/types/dashboard";

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractMessage(error: unknown, fallback: string): string {
  const err = error as { message?: string; detail?: string } | null;
  const msg = err?.message ?? err?.detail;
  return typeof msg === "string" && msg.length > 0 ? msg : fallback;
}

export async function getSubDashboardSummaryApi(): Promise<SubDashboardSummary> {
  const { data, error } = await apiClient.GET("/sub/dashboard/summary", {
    headers: authHeaders(),
  });
  if (error || !data) {
    throw new Error(extractMessage(error, "Failed to load sub dashboard summary"));
  }
  return data;
}
