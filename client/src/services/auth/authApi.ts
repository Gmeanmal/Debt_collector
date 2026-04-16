import { apiClient } from "@/api/client";
import { getAccessToken } from "@/services/auth/tokenStorage";
import type { components } from "@/types/api.generated";

type LoginRequest = components["schemas"]["LoginRequest"];
type TokenPair = components["schemas"]["TokenPair"];
type UserOut = components["schemas"]["UserOut"];
type ImpersonationAccess = components["schemas"]["ImpersonationAccess"];
type ProfileUpdate = components["schemas"]["ProfileUpdate"];

export type UpdateProfileResult =
  | { kind: "applied"; user: UserOut }
  | { kind: "pending_change_request"; changeRequestId: string };

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function loginApi(body: LoginRequest): Promise<TokenPair> {
  const { data, error } = await apiClient.POST("/auth/login", { body });
  if (error || !data) throw new Error("Login failed");
  return data;
}

export async function refreshApi(): Promise<TokenPair> {
  const { data, error } = await apiClient.POST("/auth/refresh", {
    body: { refresh_token: "" },
  });
  if (error || !data) throw new Error("Token refresh failed");
  return data;
}

export async function logoutApi(): Promise<void> {
  await apiClient.POST("/auth/logout", { body: { refresh_token: "" } });
}

export async function requestPasswordResetApi(email: string): Promise<void> {
  await apiClient.POST("/auth/password-reset/request", { body: { email } });
}

export async function confirmPasswordResetApi(token: string, newPassword: string): Promise<void> {
  await apiClient.POST("/auth/password-reset/confirm", {
    body: { token, new_password: newPassword },
  });
}

export async function getMeApi(): Promise<UserOut> {
  const { data, error } = await apiClient.GET("/auth/me");
  if (error || !data) throw new Error("Failed to fetch user");
  return data;
}

export async function impersonateApi(userId: string): Promise<ImpersonationAccess> {
  const { data, error } = await apiClient.POST("/admin/impersonate/{user_id}", {
    params: { path: { user_id: userId } },
  });
  if (error || !data) throw new Error("Impersonation failed");
  return data;
}

export async function updateProfileApi(body: ProfileUpdate): Promise<UpdateProfileResult> {
  const { response, data, error } = await apiClient.PATCH("/me/profile", {
    body,
    headers: authHeaders(),
    parseAs: "json",
  });

  if (response.status === 202) {
    const raw = data as { change_request_id?: string } | null;
    const changeRequestId = raw?.change_request_id ?? "";
    return { kind: "pending_change_request", changeRequestId };
  }

  if (error || !data) throw new Error("Failed to update profile");
  return { kind: "applied", user: data as UserOut };
}
