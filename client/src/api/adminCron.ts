import { apiClient } from "@/api/client";
import { getAccessToken } from "@/services/auth/tokenStorage";
import type { components } from "@/types/api.generated";

export type CronRunSummaryOut = components["schemas"]["CronRunSummaryOut"];

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractMessage(error: unknown, fallback: string): string {
  const err = error as { message?: string; detail?: string } | null;
  const msg = err?.message ?? err?.detail;
  return typeof msg === "string" && msg.length > 0 ? msg : fallback;
}

export async function dryRunCronApi(): Promise<CronRunSummaryOut> {
  const { data, error } = await apiClient.POST("/admin/cron/dry-run", {
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Dry-run failed"));
  return data;
}

export async function applyCronApi(lastDryRunId: string): Promise<CronRunSummaryOut> {
  const { data, error, response } = await apiClient.POST("/admin/cron/apply", {
    headers: authHeaders(),
    body: { last_dry_run_id: lastDryRunId },
  });
  if (response.status === 409) {
    const payload = (await response.clone().json().catch(() => ({}))) as {
      detail?: string;
      message?: string;
    };
    const msg = payload.detail ?? payload.message ?? "Precondition not met (409)";
    const err = new Error(msg);
    (err as Error & { status: number }).status = 409;
    throw err;
  }
  if (error || !data) throw new Error(extractMessage(error, "Apply failed"));
  return data;
}

export async function listCronRunsApi(limit = 50): Promise<CronRunSummaryOut[]> {
  const { data, error } = await apiClient.GET("/admin/cron/runs", {
    headers: authHeaders(),
    params: { query: { limit } },
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to load cron history"));
  return data;
}
