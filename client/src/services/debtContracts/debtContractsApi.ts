import { apiClient } from "@/api/client";
import { getAccessToken } from "@/services/auth/tokenStorage";
import type { components } from "@/types/api.generated";

export type DebtContractCreate = components["schemas"]["DebtContractCreate"];
export type DebtContractCounter = components["schemas"]["DebtContractCounter"];
export type DebtContractSignIn = components["schemas"]["DebtContractSignIn"];
export type DebtContractOut = components["schemas"]["DebtContractOut"];
export type DebtContractVersionOut = components["schemas"]["DebtContractVersionOut"];
export type DebtContractAuditOut = components["schemas"]["DebtContractAuditOut"];
export type DebtSimulationOut = components["schemas"]["DebtSimulationOut"];
export type DebtSimulationPeriod = components["schemas"]["DebtSimulationPeriod"];
export type DebtContractStatus = components["schemas"]["DebtContractStatus"];
export type InterestPeriod = components["schemas"]["InterestPeriod"];
export type PaymentFrequency = components["schemas"]["PaymentFrequency"];
export type LatePenaltySeverity = components["schemas"]["LatePenaltySeverity"];
export type MidContractAdditionMode = components["schemas"]["MidContractAdditionMode"];

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractMessage(error: unknown, fallback: string): string {
  const err = error as { message?: string; detail?: string } | null;
  const msg = err?.message ?? err?.detail;
  return typeof msg === "string" && msg.length > 0 ? msg : fallback;
}

export async function proposeAsGoddessApi(
  subId: string,
  body: DebtContractCreate,
): Promise<DebtContractOut> {
  const { data, error } = await apiClient.POST("/goddess/subs/{sub_id}/debts", {
    params: { path: { sub_id: subId } },
    body,
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to propose contract"));
  return data;
}

export async function proposeAsSubApi(body: DebtContractCreate): Promise<DebtContractOut> {
  const { data, error } = await apiClient.POST("/sub/debts", {
    body,
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to propose contract"));
  return data;
}

export async function counterProposeApi(
  contractId: string,
  body: DebtContractCounter,
): Promise<DebtContractOut> {
  const { data, error } = await apiClient.POST("/debts/{contract_id}/counter-propose", {
    params: { path: { contract_id: contractId } },
    body,
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to submit counter-proposal"));
  return data;
}

export async function acceptCounterApi(contractId: string): Promise<DebtContractOut> {
  const { data, error } = await apiClient.POST("/debts/{contract_id}/accept-counter", {
    params: { path: { contract_id: contractId } },
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to accept counter-proposal"));
  return data;
}

export async function rejectCounterApi(contractId: string): Promise<DebtContractOut> {
  const { data, error } = await apiClient.POST("/debts/{contract_id}/reject-counter", {
    params: { path: { contract_id: contractId } },
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to reject counter-proposal"));
  return data;
}

export async function signContractApi(
  contractId: string,
  signaturePngB64: string,
): Promise<DebtContractOut> {
  const { data, error } = await apiClient.POST("/debts/{contract_id}/sign", {
    params: { path: { contract_id: contractId } },
    body: { signature_png_b64: signaturePngB64 },
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to sign contract"));
  return data;
}

export async function downloadContractPdfApi(contractId: string): Promise<string> {
  const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
  const url = `${base}/debts/${contractId}/pdf`;
  const response = await fetch(url, {
    headers: authHeaders(),
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch contract PDF (${response.status})`);
  }
  return response.url;
}

export async function closeContractApi(contractId: string): Promise<DebtContractOut> {
  const { data, error } = await apiClient.POST("/goddess/debts/{contract_id}/close", {
    params: { path: { contract_id: contractId } },
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to close contract"));
  return data;
}

export async function getContractApi(contractId: string): Promise<DebtContractOut> {
  const { data, error } = await apiClient.GET("/debts/{contract_id}", {
    params: { path: { contract_id: contractId } },
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to fetch contract"));
  return data;
}

export async function getContractAuditApi(contractId: string): Promise<DebtContractAuditOut[]> {
  const { data, error } = await apiClient.GET("/debts/{contract_id}/audit", {
    params: { path: { contract_id: contractId } },
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to fetch audit log"));
  return data;
}

export async function listSubDebtsApi(): Promise<DebtContractOut[]> {
  const { data, error } = await apiClient.GET("/sub/debts", {
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to list contracts"));
  return data;
}

export async function listGoddessDebtsApi(): Promise<DebtContractOut[]> {
  const { data, error } = await apiClient.GET("/goddess/debts", {
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to list contracts"));
  return data;
}

export async function simulateDraftApi(body: DebtContractCreate): Promise<DebtSimulationOut> {
  const { data, error } = await apiClient.POST("/debts/simulate", {
    body,
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractMessage(error, "Failed to simulate contract"));
  return data;
}
