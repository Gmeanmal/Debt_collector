import { apiClient } from "@/api/client";
import { getAccessToken } from "@/services/auth/tokenStorage";
import type { components } from "@/types/api.generated";

export type PaymentMethodCreate = components["schemas"]["PaymentMethodCreate"];
export type PaymentMethodUpdate = components["schemas"]["PaymentMethodUpdate"];
export type PaymentMethodOut = components["schemas"]["PaymentMethodOut"];
export type PaymentMethodType = components["schemas"]["PaymentMethodType"];
export type ReorderRequest = components["schemas"]["ReorderRequest"];

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function listPaymentMethodsApi(enabledOnly = false): Promise<PaymentMethodOut[]> {
  const { data, error } = await apiClient.GET("/goddess/payment-methods/", {
    params: { query: { enabled: enabledOnly } },
    headers: authHeaders(),
  });
  if (error || !data) throw new Error("Failed to list payment methods");
  return data;
}

export async function createPaymentMethodApi(body: PaymentMethodCreate): Promise<PaymentMethodOut> {
  const { data, error } = await apiClient.POST("/goddess/payment-methods/", {
    body,
    headers: authHeaders(),
  });
  if (error || !data) throw new Error("Failed to create payment method");
  return data;
}

export async function updatePaymentMethodApi(
  methodId: string,
  body: PaymentMethodUpdate,
): Promise<PaymentMethodOut> {
  const { data, error } = await apiClient.PATCH("/goddess/payment-methods/{method_id}", {
    params: { path: { method_id: methodId } },
    body,
    headers: authHeaders(),
  });
  if (error || !data) throw new Error("Failed to update payment method");
  return data;
}

export async function deletePaymentMethodApi(methodId: string): Promise<void> {
  const { error } = await apiClient.DELETE("/goddess/payment-methods/{method_id}", {
    params: { path: { method_id: methodId } },
    headers: authHeaders(),
  });
  if (error) throw new Error("Failed to delete payment method");
}

export async function reorderPaymentMethodsApi(methodIds: string[]): Promise<PaymentMethodOut[]> {
  const { data, error } = await apiClient.POST("/goddess/payment-methods/reorder", {
    body: { method_ids: methodIds } as ReorderRequest,
    headers: authHeaders(),
  });
  if (error || !data) throw new Error("Failed to reorder payment methods");
  return data;
}
