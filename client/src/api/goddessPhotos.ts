import { getAccessToken } from "@/services/auth/tokenStorage";

const BASE = "/goddess";

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { VITE_API_BASE_URL } = import.meta.env as Record<string, string>;
  const base = VITE_API_BASE_URL ?? "";
  const res = await fetch(`${base}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface RawPhotoQueueEntry {
  id: string;
  sub_id: string;
  sub_username?: string | null;
  uploaded_at: string;
  mime_type: string;
  byte_size: number;
  presigned_get_url: string;
}

export interface RawPhotoReview {
  id: string;
  status: string;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
}

export async function listPhotoQueue(): Promise<RawPhotoQueueEntry[]> {
  return fetchJson<RawPhotoQueueEntry[]>(`${BASE}/photo-queue`);
}

export async function approvePhoto(id: string): Promise<RawPhotoReview> {
  return fetchJson<RawPhotoReview>(`${BASE}/photos/${id}/approve`, {
    method: "POST",
  });
}

export async function rejectPhoto(id: string, reason: string): Promise<RawPhotoReview> {
  return fetchJson<RawPhotoReview>(`${BASE}/photos/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
