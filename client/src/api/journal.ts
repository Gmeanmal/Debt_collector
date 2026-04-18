import { getAccessToken } from "@/services/auth/tokenStorage";

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const BASE_URL: string = (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "";

async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
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

async function fetchMultipart<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface RawJournalEntry {
  id: string;
  sub_id: string;
  goddess_id: string;
  body: string;
  mood: string;
  photo_r2_key: string | null;
  attachment_key: string | null;
  attachment_mime: string | null;
  attachment_presigned_url: string | null;
  is_private: boolean;
  created_at: string;
  read_by_goddess_at: string | null;
  goddess_comment: string | null;
  goddess_comment_at: string | null;
}

export interface RawCreateJournalEntryIn {
  body: string;
  mood: string;
  is_private?: boolean;
  photo_r2_key?: string | null;
}

export interface RawJournalCommentIn {
  comment: string;
}

export async function createJournalEntryApi(
  body: string,
  mood: string,
  isPrivate: boolean,
  attachment: File | null,
): Promise<RawJournalEntry> {
  const form = new FormData();
  form.append("body", body);
  form.append("mood", mood);
  form.append("is_private", String(isPrivate));
  if (attachment) {
    form.append("attachment", attachment);
  }
  return fetchMultipart<RawJournalEntry>("/sub/journal", form);
}

export async function listOwnJournalApi(params: {
  limit?: number;
  before?: string | null;
}): Promise<RawJournalEntry[]> {
  const qs = new URLSearchParams();
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.before) qs.set("before", params.before);
  const query = qs.toString();
  return fetchJson<RawJournalEntry[]>(`/sub/journal${query ? `?${query}` : ""}`);
}

export async function listSubJournalForGoddessApi(
  subId: string,
  params: { limit?: number; before?: string | null },
): Promise<RawJournalEntry[]> {
  const qs = new URLSearchParams();
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.before) qs.set("before", params.before);
  const query = qs.toString();
  return fetchJson<RawJournalEntry[]>(`/goddess/subs/${subId}/journal${query ? `?${query}` : ""}`);
}

export async function upsertJournalCommentApi(
  entryId: string,
  comment: string,
): Promise<RawJournalEntry> {
  return fetchJson<RawJournalEntry>(`/goddess/journal/${entryId}/comment`, {
    method: "PATCH",
    body: JSON.stringify({ comment } satisfies RawJournalCommentIn),
  });
}

export async function markJournalEntryReadApi(
  username: string,
  entryId: string,
): Promise<RawJournalEntry> {
  return fetchJson<RawJournalEntry>(`/goddess/subs/${username}/journal/${entryId}/read`, {
    method: "POST",
  });
}
