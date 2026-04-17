import { apiClient } from "@/api/client";
import { getAccessToken } from "@/services/auth/tokenStorage";
import type { components } from "@/types/api.generated";

export type WeeklyPaymentBucket = components["schemas"]["WeeklyPaymentBucket"];
export type WeeklyPaymentDetail = components["schemas"]["PaymentOut"];

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractMessage(error: unknown, fallback: string): string {
  const err = error as { message?: string; detail?: string } | null;
  const msg = err?.message ?? err?.detail;
  return typeof msg === "string" && msg.length > 0 ? msg : fallback;
}

export async function getWeeklyPaymentsApi(): Promise<WeeklyPaymentBucket[]> {
  const { data, error } = await apiClient.GET("/goddess/payments/weekly", {
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to load weekly payments"));
  return data;
}

export async function getWeeklyPaymentDetailApi(weekStart: string): Promise<WeeklyPaymentDetail[]> {
  const { data, error } = await apiClient.GET("/goddess/payments/weekly/{week_start}", {
    params: { path: { week_start: weekStart } },
    headers: authHeaders(),
  });
  if (error || !data)
    throw new Error(extractMessage(error, "Failed to load weekly payment detail"));
  return data;
}
