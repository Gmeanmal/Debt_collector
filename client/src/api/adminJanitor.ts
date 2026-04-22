import { apiClient } from "@/api/client";
import { getAccessToken } from "@/services/auth/tokenStorage";
import type { components } from "@/types/api.generated";

export type ProofJanitorOut = components["schemas"]["ProofJanitorOut"];

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function runProofJanitorApi(dryRun: boolean): Promise<ProofJanitorOut> {
  const { data, error } = await apiClient.POST("/admin/janitor/proofs", {
    headers: authHeaders(),
    body: { dry_run: dryRun },
  });
  if (error || !data) {
    const err = error as { message?: string; detail?: string } | null;
    const msg = err?.message ?? err?.detail ?? "Proof janitor failed";
    throw new Error(msg);
  }
  return data;
}
