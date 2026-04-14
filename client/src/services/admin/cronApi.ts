import { apiClient } from "@/api/client";
import { getAccessToken } from "@/services/auth/tokenStorage";
import type { components } from "@/types/api.generated";

export type CronRunOut = components["schemas"]["CronRunOut"];

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractMessage(error: unknown, fallback: string): string {
  const err = error as { message?: string; detail?: string } | null;
  const msg = err?.message ?? err?.detail;
  return typeof msg === "string" && msg.length > 0 ? msg : fallback;
}

export async function runCronNowApi(): Promise<CronRunOut> {
  const { data, error } = await apiClient.POST("/admin/cron/run-now", {
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to run cron"));
  return data;
}
