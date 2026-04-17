import { apiClient } from "@/api/client";
import { getAccessToken } from "@/services/auth/tokenStorage";
import type { components } from "@/types/api.generated";

// Extend with sub_username once backend ships it; used to build slug-based URLs.
export type LateSubItem = components["schemas"]["LateSubItem"] & {
  sub_username?: string | null;
};

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractMessage(error: unknown, fallback: string): string {
  const err = error as { message?: string; detail?: string } | null;
  const msg = err?.message ?? err?.detail;
  return typeof msg === "string" && msg.length > 0 ? msg : fallback;
}

export async function getLateSubsApi(): Promise<LateSubItem[]> {
  const { data, error } = await apiClient.GET("/goddess/subs/late", {
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to load late subs"));
  return data;
}
