import { apiClient } from "@/api/client";
import type { components } from "@/types/api.generated";

type LoginRequest = components["schemas"]["LoginRequest"];
type TokenPair = components["schemas"]["TokenPair"];
type UserOut = components["schemas"]["UserOut"];

export async function loginApi(body: LoginRequest): Promise<TokenPair> {
  const { data, error } = await apiClient.POST("/auth/login", { body });
  if (error || !data) throw new Error("Login failed");
  return data;
}

export async function refreshApi(refreshToken: string): Promise<TokenPair> {
  const { data, error } = await apiClient.POST("/auth/refresh", {
    body: { refresh_token: refreshToken },
  });
  if (error || !data) throw new Error("Token refresh failed");
  return data;
}

export async function logoutApi(refreshToken: string): Promise<void> {
  await apiClient.POST("/auth/logout", { body: { refresh_token: refreshToken } });
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
