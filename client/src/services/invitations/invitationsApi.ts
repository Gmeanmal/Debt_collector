import { apiClient } from "@/api/client";
import { getAccessToken } from "@/services/auth/tokenStorage";
import type { components } from "@/types/api.generated";

type InvitationCreate = components["schemas"]["InvitationCreate"];
type InvitationOut = components["schemas"]["InvitationOut"];
type PublicInvitationOut = components["schemas"]["PublicInvitationOut"];
type SignupRequest = components["schemas"]["SignupRequest"];
type TokenPair = components["schemas"]["TokenPair"];

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function createInvitationApi(body: InvitationCreate): Promise<InvitationOut> {
  const { data, error } = await apiClient.POST("/goddess/invitations/", {
    body,
    headers: authHeaders(),
  });
  if (error || !data) throw new Error("Failed to create invitation");
  return data;
}

export async function listInvitationsApi(): Promise<InvitationOut[]> {
  const { data, error } = await apiClient.GET("/goddess/invitations/", {
    headers: authHeaders(),
  });
  if (error || !data) throw new Error("Failed to list invitations");
  return data;
}

export async function getPublicInvitationApi(token: string): Promise<PublicInvitationOut> {
  const { data, error } = await apiClient.GET("/invite/{token}", {
    params: { path: { token } },
  });
  if (error || !data) {
    const err = error as { status?: number; detail?: string } | undefined;
    const status = err?.status;
    if (status === 404) throw Object.assign(new Error("Invitation not found"), { status: 404 });
    if (status === 409) {
      const detail = err?.detail ?? "";
      throw Object.assign(new Error("Invitation expired or used"), { status: 409, detail });
    }
    throw new Error("Failed to fetch invitation");
  }
  return data;
}

export async function signupViaInviteApi(token: string, body: SignupRequest): Promise<TokenPair> {
  const { data, error } = await apiClient.POST("/invite/{token}/signup", {
    params: { path: { token } },
    body,
  });
  if (error || !data) {
    const status = (error as { status?: number } | undefined)?.status;
    if (status === 409)
      throw Object.assign(new Error("Email or username already taken"), { status: 409 });
    if (status === 404) throw Object.assign(new Error("Invitation not found"), { status: 404 });
    throw new Error("Signup failed");
  }
  return data;
}
