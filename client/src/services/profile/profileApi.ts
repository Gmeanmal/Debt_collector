import { apiClient } from "@/api/client";
import { getAccessToken } from "@/services/auth/tokenStorage";
import type { components } from "@/types/api.generated";

export type ProfileChangeRequestIn = components["schemas"]["ProfileChangeRequestIn"];
export type ProfileChangeRequestOut = components["schemas"]["ProfileChangeRequestOut"];
export type ProfileChangeRequestStatus = components["schemas"]["ProfileChangeRequestStatus"];
export type PaymentHandleIn = components["schemas"]["PaymentHandleIn"];
export type PaymentHandleOut = components["schemas"]["PaymentHandleOut"];
export type GoddessRejectIn = components["schemas"]["GoddessRejectIn"];
export type GoddessSetFeeIn = components["schemas"]["GoddessSetFeeIn"];
export type GoddessEditSubProfileIn = components["schemas"]["GoddessEditSubProfileIn"];
export type UserOut = components["schemas"]["UserOut"];

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function listMyChangeRequestsApi(): Promise<ProfileChangeRequestOut[]> {
  const { data, error } = await apiClient.GET("/sub/profile/change-requests", {
    headers: authHeaders(),
  });
  if (error || !data) throw new Error("Failed to fetch change requests");
  return data;
}

export async function createChangeRequestApi(
  body: ProfileChangeRequestIn,
): Promise<ProfileChangeRequestOut> {
  const { data, error } = await apiClient.POST("/sub/profile/change-requests", {
    body,
    headers: authHeaders(),
  });
  if (error || !data) throw new Error("Failed to submit change request");
  return data;
}

export async function updatePaymentHandleApi(
  payment_handle: string | null,
): Promise<PaymentHandleOut> {
  const { data, error } = await apiClient.PATCH("/sub/me/payment-handle", {
    body: { payment_handle },
    headers: authHeaders(),
  });
  if (error || !data) throw new Error("Failed to update payment handle");
  return data;
}

export async function acceptFeeApi(
  requestId: string,
  methodId: string,
): Promise<ProfileChangeRequestOut> {
  const { data, error } = await apiClient.POST(
    "/sub/profile/change-requests/{request_id}/accept-fee",
    {
      params: { path: { request_id: requestId }, query: { method_id: methodId } },
      headers: authHeaders(),
    },
  );
  if (error || !data) throw new Error("Failed to accept fee");
  return data;
}

export async function listPendingChangeRequestsApi(): Promise<ProfileChangeRequestOut[]> {
  const { data, error } = await apiClient.GET("/goddess/profile/change-requests", {
    headers: authHeaders(),
  });
  if (error || !data) throw new Error("Failed to fetch pending change requests");
  return data;
}

export async function approveChangeRequestApi(requestId: string): Promise<ProfileChangeRequestOut> {
  const { data, error } = await apiClient.POST(
    "/goddess/profile/change-requests/{request_id}/approve",
    {
      params: { path: { request_id: requestId } },
      headers: authHeaders(),
    },
  );
  if (error || !data) throw new Error("Failed to approve change request");
  return data;
}

export async function rejectChangeRequestApi(
  requestId: string,
  body: GoddessRejectIn,
): Promise<ProfileChangeRequestOut> {
  const { data, error } = await apiClient.POST(
    "/goddess/profile/change-requests/{request_id}/reject",
    {
      params: { path: { request_id: requestId } },
      body,
      headers: authHeaders(),
    },
  );
  if (error || !data) throw new Error("Failed to reject change request");
  return data;
}

export async function setFeeChangeRequestApi(
  requestId: string,
  body: GoddessSetFeeIn,
): Promise<ProfileChangeRequestOut> {
  const { data, error } = await apiClient.POST(
    "/goddess/profile/change-requests/{request_id}/set-fee",
    {
      params: { path: { request_id: requestId } },
      body,
      headers: authHeaders(),
    },
  );
  if (error || !data) throw new Error("Failed to set fee");
  return data;
}

export async function goddessEditSubProfileApi(
  subId: string,
  body: GoddessEditSubProfileIn,
): Promise<UserOut> {
  const { data, error } = await apiClient.PATCH("/goddess/subs/{sub_id}/profile", {
    params: { path: { sub_id: subId } },
    body,
    headers: authHeaders(),
  });
  if (error || !data) throw new Error("Failed to edit sub profile");
  return data;
}
