import { apiClient } from "@/api/client";
import { getAccessToken } from "@/services/auth/tokenStorage";
import type { components } from "@/types/api.generated";

export type RitualWithSubOut = components["schemas"]["RitualWithSubOut"];
export type RitualOut = components["schemas"]["RitualOut"];
export type RitualCreateIn = components["schemas"]["RitualCreateIn"];
export type RitualUpdateIn = components["schemas"]["RitualUpdateIn"];
export type RitualFrequency = components["schemas"]["RitualFrequency"];

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractMessage(error: unknown, fallback: string): string {
  const err = error as { message?: string; detail?: string } | null;
  const msg = err?.message ?? err?.detail;
  return typeof msg === "string" && msg.length > 0 ? msg : fallback;
}

export async function listGoddessRituals(): Promise<RitualWithSubOut[]> {
  const { data, error } = await apiClient.GET("/goddess/rituals", {
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to load rituals"));
  return data;
}

export async function createRitualForSub(
  subId: string,
  body: RitualCreateIn,
): Promise<RitualOut> {
  const { data, error } = await apiClient.POST("/goddess/subs/{sub_id}/rituals", {
    params: { path: { sub_id: subId } },
    body,
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to create ritual"));
  return data;
}

export async function updateRitual(
  ritualId: string,
  body: RitualUpdateIn,
): Promise<RitualOut> {
  const { data, error } = await apiClient.PATCH("/goddess/rituals/{ritual_id}", {
    params: { path: { ritual_id: ritualId } },
    body,
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to update ritual"));
  return data;
}

export async function deleteRitual(ritualId: string): Promise<void> {
  const { error } = await apiClient.DELETE("/goddess/rituals/{ritual_id}", {
    params: { path: { ritual_id: ritualId } },
    headers: authHeaders(),
  });
  if (error) throw new Error(extractMessage(error, "Failed to delete ritual"));
}

export async function pauseRitual(ritualId: string): Promise<RitualOut> {
  return updateRitual(ritualId, { paused: true });
}

export async function resumeRitual(ritualId: string): Promise<RitualOut> {
  return updateRitual(ritualId, { paused: false });
}
