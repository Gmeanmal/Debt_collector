import { getAccessToken } from "@/services/auth/tokenStorage";

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

export interface RawJournalEntry {
  id: string;
  sub_id: string;
  goddess_id: string;
  body: string;
  mood: string;
  photo_r2_key: string | null;
  created_at: string;
  read_by_goddess_at: string | null;
  goddess_comment: string | null;
  goddess_comment_at: string | null;
}

export interface RawCreateJournalEntryIn {
  body: string;
  mood: string;
  photo_r2_key?: string | null;
}

export interface RawJournalCommentIn {
  comment: string;
}

export async function createJournalEntryApi(
  payload: RawCreateJournalEntryIn,
): Promise<RawJournalEntry> {
  return fetchJson<RawJournalEntry>("/sub/journal", {
    method: "POST",
    body: JSON.stringify(payload),
  });
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
