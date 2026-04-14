import { apiClient } from "@/api/client";
import { getAccessToken } from "@/services/auth/tokenStorage";
import type { components } from "@/types/api.generated";

export type NotificationOut = components["schemas"]["NotificationOut"];
export type NotificationListOut = components["schemas"]["NotificationListOut"];
export type NotificationType = components["schemas"]["NotificationType"];

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function listNotificationsApi(): Promise<NotificationListOut> {
  const { data, error } = await apiClient.GET("/me/notifications", {
    headers: authHeaders(),
  });
  if (error || !data) throw new Error("Failed to list notifications");
  return data;
}

export async function markNotificationReadApi(id: string): Promise<void> {
  const { error } = await apiClient.POST("/me/notifications/{notification_id}/read", {
    params: { path: { notification_id: id } },
    headers: authHeaders(),
  });
  if (error) throw new Error("Failed to mark notification as read");
}
