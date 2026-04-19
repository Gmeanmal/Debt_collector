import { apiClient } from "@/api/client";
import { getAccessToken } from "@/services/auth/tokenStorage";
import type { components } from "@/types/api.generated";
import { env } from "@/utils/env";

export type RecordPaymentIn = components["schemas"]["RecordPaymentIn"];
export type EditDeclarationIn = components["schemas"]["EditDeclarationIn"];
export type ValidateIn = components["schemas"]["ValidateIn"];
export type RejectIn = components["schemas"]["RejectIn"];
export type PaymentOut = components["schemas"]["PaymentOut"];
export type PaymentCategory = components["schemas"]["PaymentCategory"];
export type PaymentStatus = components["schemas"]["PaymentStatus"];
export type DeclarationSource = components["schemas"]["DeclarationSource"];
export type PaymentMethodOut = components["schemas"]["PaymentMethodOut"];

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractDetail(error: unknown, fallback: string): string {
  const err = error as { message?: string; detail?: string } | null;
  const msg = err?.message ?? err?.detail;
  return typeof msg === "string" && msg.length > 0 ? msg : fallback;
}

export interface DeclarePaymentMultipartInput {
  amount: string;
  method_id: string;
  category: PaymentCategory;
  proof: File;
  external_timestamp?: string;
  note?: string;
  target_id?: string;
}

export class DeclarePaymentHttpError extends Error {
  readonly status: number;
  readonly detail?: string;
  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = "DeclarePaymentHttpError";
    this.status = status;
    this.detail = detail;
  }
}

function messageForStatus(status: number, detail?: string): string {
  if (status === 413) return "File too large (5 MB max).";
  if (status === 415) return "Unsupported file type.";
  if (status === 400 && detail) return detail;
  if (detail) return detail;
  return "Failed to declare payment.";
}

async function parseErrorDetail(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.clone().json()) as { detail?: unknown; message?: unknown };
    if (typeof body.message === "string") return body.message;
    if (typeof body.detail === "string") return body.detail;
    return undefined;
  } catch {
    return undefined;
  }
}

export async function declarePaymentMultipartApi(
  input: DeclarePaymentMultipartInput,
): Promise<PaymentOut> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const form = new FormData();
  form.append("proof", input.proof);
  form.append("category", input.category);
  form.append("amount", input.amount);
  form.append("method_id", input.method_id);
  if (input.external_timestamp) form.append("external_timestamp", input.external_timestamp);
  if (input.note) form.append("note", input.note);
  if (input.target_id) form.append("target_id", input.target_id);

  const res = await fetch(`${env.VITE_API_BASE_URL}/sub/payments`, {
    method: "POST",
    credentials: "include",
    headers,
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const detail = await parseErrorDetail(res);
    throw new DeclarePaymentHttpError(res.status, messageForStatus(res.status, detail), detail);
  }
  return (await res.json()) as PaymentOut;
}

export async function editDeclarationApi(
  declarationId: string,
  body: EditDeclarationIn,
): Promise<PaymentOut> {
  const { data, error } = await apiClient.PATCH("/sub/payments/{declaration_id}", {
    params: { path: { declaration_id: declarationId } },
    body,
    headers: authHeaders(),
  });
  if (error || !data) throw new Error("Failed to edit declaration");
  return data;
}

export async function cancelDeclarationApi(declarationId: string): Promise<void> {
  const { error } = await apiClient.DELETE("/sub/payments/{declaration_id}", {
    params: { path: { declaration_id: declarationId } },
    headers: authHeaders(),
  });
  if (error) throw new Error("Failed to cancel declaration");
}

export async function listMyPaymentsApi(): Promise<PaymentOut[]> {
  const { data, error } = await apiClient.GET("/sub/payments", {
    headers: authHeaders(),
  });
  if (error || !data) throw new Error("Failed to list payments");
  return data;
}

export async function listSubPaymentMethodsApi(): Promise<PaymentMethodOut[]> {
  const { data, error } = await apiClient.GET("/sub/payment-methods", {
    headers: authHeaders(),
  });
  if (error || !data) throw new Error("Failed to list payment methods");
  return data;
}

export async function listPendingPaymentsApi(): Promise<PaymentOut[]> {
  const { data, error } = await apiClient.GET("/goddess/payments", {
    headers: authHeaders(),
  });
  if (error || !data) throw new Error("Failed to list pending payments");
  return data;
}

export async function validateDeclarationApi(
  declarationId: string,
  body: ValidateIn,
): Promise<PaymentOut> {
  const { data, error } = await apiClient.POST("/goddess/payments/{declaration_id}/validate", {
    params: { path: { declaration_id: declarationId } },
    body,
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractDetail(error, "Failed to validate declaration"));
  return data;
}

export async function rejectDeclarationApi(
  declarationId: string,
  body: RejectIn,
): Promise<PaymentOut> {
  const { data, error } = await apiClient.POST("/goddess/payments/{declaration_id}/reject", {
    params: { path: { declaration_id: declarationId } },
    body,
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(extractDetail(error, "Failed to reject declaration"));
  return data;
}

export async function recordPaymentApi(body: RecordPaymentIn): Promise<PaymentOut> {
  const { data, error } = await apiClient.POST("/goddess/payments/record", {
    body,
    headers: authHeaders(),
  });
  if (error || !data) throw new Error("Failed to record payment");
  return data;
}

export type GoddessSub = {
  id: string;
  username: string;
  display_name: string;
  status: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_key?: string | null;
  real_name?: string | null;
};

export async function listGoddessSubsApi(): Promise<GoddessSub[]> {
  const { data, error } = await apiClient.GET("/goddess/subs", {
    headers: authHeaders(),
  });
  if (error || !data) throw new Error("Failed to list subs");
  return data as GoddessSub[];
}

export async function getSubByUsernameApi(username: string): Promise<GoddessSub> {
  const { data, error } = await apiClient.GET("/goddess/subs/by-username/{username}", {
    params: { path: { username } },
    headers: authHeaders(),
  });
  if (error || !data) throw new Error(`Sub @${username} not found`);
  // UserOut does not carry username; inject it from the path parameter we already own.
  return { ...data, username } as GoddessSub;
}
