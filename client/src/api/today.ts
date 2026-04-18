import { getAccessToken } from "@/services/auth/tokenStorage";
import { env } from "@/utils/env";

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = env.VITE_API_BASE_URL;
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

export interface RawOccurrenceOut {
  id: string;
  ritual_id: string;
  sub_id: string;
  goddess_id: string;
  date: string;
  status: string;
  note: string | null;
  evidence_r2_key: string | null;
  completed_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export interface RawRitualOut {
  id: string;
  sub_id: string;
  goddess_id: string;
  title: string;
  description: string | null;
  frequency: string;
  custom_days_bitmask: number | null;
  deadline_time: string | null;
  points_on_complete: number;
  points_on_miss: number;
  paused: boolean;
  created_at: string;
  updated_at: string;
}

export interface RawTaskOut {
  id: string;
  sub_id: string;
  goddess_id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  points_on_complete: number;
  points_on_miss: number;
  status: string;
  evidence_r2_key: string | null;
  note: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RawPhotoUploadOut {
  id: string;
  status: string;
  uploaded_at: string;
  r2_key: string;
  presigned_get_url: string;
}

export async function fetchTodayOccurrences(): Promise<RawOccurrenceOut[]> {
  return fetchJson<RawOccurrenceOut[]>("/sub/rituals/today");
}

export async function fetchOwnRituals(): Promise<RawRitualOut[]> {
  return fetchJson<RawRitualOut[]>("/sub/rituals");
}

export async function fetchOpenTasks(): Promise<RawTaskOut[]> {
  return fetchJson<RawTaskOut[]>("/sub/tasks");
}

export interface OccurrenceActionBody {
  note?: string | null;
  evidence_r2_key?: string | null;
}

export async function completeOccurrence(
  id: string,
  body: OccurrenceActionBody,
): Promise<RawOccurrenceOut> {
  return fetchJson<RawOccurrenceOut>(`/sub/rituals/occurrences/${id}/complete`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function submitOccurrence(
  id: string,
  body: OccurrenceActionBody,
): Promise<RawOccurrenceOut> {
  return fetchJson<RawOccurrenceOut>(`/sub/rituals/occurrences/${id}/submit`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function submitTask(id: string, body: OccurrenceActionBody): Promise<RawTaskOut> {
  return fetchJson<RawTaskOut>(`/sub/tasks/${id}/submit`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchGoddessSubRituals(subId: string): Promise<RawRitualOut[]> {
  return fetchJson<RawRitualOut[]>(`/goddess/subs/${subId}/rituals`);
}

export async function uploadEvidencePhoto(file: File): Promise<RawPhotoUploadOut> {
  const token = getAccessToken();
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${env.VITE_API_BASE_URL}/profile/photos`, {
    method: "POST",
    credentials: "include",
    headers,
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `HTTP ${res.status}`);
  }
  return res.json() as Promise<RawPhotoUploadOut>;
}
