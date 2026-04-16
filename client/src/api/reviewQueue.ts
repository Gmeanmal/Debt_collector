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

export type RawReviewItemKind = "ritual_occurrence" | "task";

export interface RawReviewQueueItem {
  kind: RawReviewItemKind;
  id: string;
  sub_id: string;
  sub_username: string;
  sub_display_name: string | null;
  title: string;
  submitted_at: string;
  evidence_r2_key: string | null;
  evidence_presigned_url: string | null;
  note: string | null;
  points_on_complete: number;
}

export interface RawBulkItemRef {
  kind: RawReviewItemKind;
  id: string;
}

export interface RawBulkActionIn {
  action: "approve" | "reject";
  items: RawBulkItemRef[];
  reason?: string;
}

export interface RawBulkItemResult {
  kind: RawReviewItemKind;
  id: string;
}

export interface RawBulkItemFailure {
  kind: RawReviewItemKind;
  id: string;
  error: string;
}

export interface RawBulkActionOut {
  succeeded: RawBulkItemResult[];
  failed: RawBulkItemFailure[];
}

export async function fetchReviewQueue(params?: {
  limit?: number;
  before?: string;
}): Promise<RawReviewQueueItem[]> {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.before) qs.set("before", params.before);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return fetchJson<RawReviewQueueItem[]>(`/goddess/review-queue${query}`);
}

export async function bulkReviewAction(body: RawBulkActionIn): Promise<RawBulkActionOut> {
  return fetchJson<RawBulkActionOut>("/goddess/review-queue/bulk", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
