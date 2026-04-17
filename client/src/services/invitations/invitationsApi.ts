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
  const { data, error, response } = await apiClient.GET("/invite/{token}", {
    params: { path: { token } },
  });
  if (error || !data) {
    const status = response?.status;
    const msg = error as { message?: string; detail?: string } | undefined;
    const detail = msg?.message ?? msg?.detail ?? "";
    if (status === 404) throw Object.assign(new Error("Invitation not found"), { status: 404 });
    if (status === 409)
      throw Object.assign(new Error(detail || "Invitation expired or used"), { status: 409 });
    throw new Error("Failed to fetch invitation");
  }
  return data;
}

export async function resendInvitationApi(invitationId: string, email: string): Promise<void> {
  const { error, response } = await apiClient.POST(
    "/goddess/invitations/{invitation_id}/resend",
    {
      params: { path: { invitation_id: invitationId } },
      body: { email },
      headers: authHeaders(),
    },
  );
  if (error) {
    const status = response?.status;
    if (status === 409) throw Object.assign(new Error("Invitation is no longer active"), { status: 409 });
    throw Object.assign(new Error("Failed to send email"), { status: status ?? 0 });
  }
}

export async function previewInvitationApi(
  invitationId: string,
): Promise<{ subject: string; html: string }> {
  const { data, error } = await apiClient.GET(
    "/goddess/invitations/{invitation_id}/preview",
    {
      params: { path: { invitation_id: invitationId } },
      headers: authHeaders(),
    },
  );
  if (error || !data) throw new Error("Failed to load email preview");
  return data;
}

export async function signupViaInviteApi(token: string, body: SignupRequest): Promise<TokenPair> {
  const { data, error, response } = await apiClient.POST("/invite/{token}/signup", {
    params: { path: { token } },
    body,
  });
  if (error || !data) {
    const status = response?.status;
    const msg = error as { message?: string; detail?: string } | undefined;
    const detail = msg?.message ?? msg?.detail ?? "";
    if (status === 409)
      throw Object.assign(new Error(detail || "Email or username already taken"), { status: 409 });
    if (status === 404) throw Object.assign(new Error("Invitation not found"), { status: 404 });
    if (status === 410)
      throw Object.assign(new Error(detail || "Invitation expired or used"), { status: 410 });
    throw new Error(detail || "Signup failed");
  }
  return data;
}
