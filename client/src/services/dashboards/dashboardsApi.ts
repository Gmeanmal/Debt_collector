import { apiClient } from "@/api/client";
import { getAccessToken } from "@/services/auth/tokenStorage";
import { env } from "@/utils/env";
import type { components } from "@/types/api.generated";
import type { DashboardChartsOut } from "@/types/dashboard";

export type GoddessDashboardOut = components["schemas"]["GoddessDashboardOut"];
export type SubDashboardOut = components["schemas"]["SubDashboardOut"];
export type LatePaymentItem = components["schemas"]["LatePaymentItem"];
export type ActiveContractSummary = components["schemas"]["ActiveContractSummary"];
export type SubPlanningOut = components["schemas"]["SubPlanningOut"];
export type UpcomingPaymentItem = components["schemas"]["UpcomingPaymentItem"];
export type WeeklyPaymentTotal = components["schemas"]["WeeklyPaymentTotal"];
export type { DashboardChartsOut };

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

export async function getSubPlanningApi(): Promise<SubPlanningOut> {
  const { data, error } = await apiClient.GET("/sub/planning", {
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to load planning data"));
  return data;
}

export async function getGoddessDashboardChartsApi(): Promise<DashboardChartsOut> {
  const token = getAccessToken();
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${env.VITE_API_BASE_URL}/goddess/dashboard/charts`, { headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(body.detail ?? "Failed to load dashboard charts");
  }
  return res.json() as Promise<DashboardChartsOut>;
}
