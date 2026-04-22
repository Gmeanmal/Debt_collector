import { apiClient } from "@/api/client";
import { getAccessToken } from "@/services/auth/tokenStorage";
import type { components } from "@/types/api.generated";

export type LateContractItem = components["schemas"]["LateContractItem"];
export type BulkApplyLatePenaltySummary =
  components["schemas"]["BulkApplyLatePenaltySummary"];

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractMessage(error: unknown, fallback: string): string {
  const err = error as { message?: string; detail?: string } | null;
  const msg = err?.message ?? err?.detail;
  return typeof msg === "string" && msg.length > 0 ? msg : fallback;
}

export async function getLateContractsApi(): Promise<LateContractItem[]> {
  const { data, error } = await apiClient.GET("/goddess/contracts/late", {
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to load late contracts"));
  return data;
}

export async function bulkApplyLatePenaltyApi(
  contractIds: string[],
): Promise<BulkApplyLatePenaltySummary> {
  const { data, error } = await apiClient.POST("/goddess/contracts/late/apply-penalty", {
    headers: authHeaders(),
    body: { contract_ids: contractIds },
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to apply late penalties"));
  return data;
}
