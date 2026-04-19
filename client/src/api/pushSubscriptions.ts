import { getAccessToken } from "@/services/auth/tokenStorage";
import { env } from "@/utils/env";

export interface PushKeysPayload {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionInPayload {
  endpoint: string;
  keys: PushKeysPayload;
}

export interface PushSubscriptionOut {
  id: string;
  endpoint: string;
  user_agent: string | null;
  created_at: string;
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function createPushSubscriptionApi(
  body: PushSubscriptionInPayload,
): Promise<PushSubscriptionOut> {
  const res = await fetch(`${env.VITE_API_BASE_URL}/me/notifications/subscriptions`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to register push subscription (${res.status})`);
  return (await res.json()) as PushSubscriptionOut;
}

export async function listPushSubscriptionsApi(): Promise<PushSubscriptionOut[]> {
  const res = await fetch(`${env.VITE_API_BASE_URL}/me/notifications/subscriptions`, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to list push subscriptions (${res.status})`);
  return (await res.json()) as PushSubscriptionOut[];
}

export async function deletePushSubscriptionApi(id: string): Promise<void> {
  const res = await fetch(`${env.VITE_API_BASE_URL}/me/notifications/subscriptions/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete push subscription (${res.status})`);
  }
}
