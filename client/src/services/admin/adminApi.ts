import { getAccessToken } from "@/services/auth/tokenStorage";

export interface AdminListParams {
  q?: string;
  page?: number;
  page_size?: number;
}

export interface AdminListResult {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  page_size: number;
}

function baseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4011";
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string; detail?: string };
    if (typeof payload.message === "string" && payload.message.length > 0) return payload.message;
    if (typeof payload.detail === "string" && payload.detail.length > 0) return payload.detail;
  } catch {
    /* ignore */
  }
  return `${fallback} (${response.status})`;
}

export async function adminList(
  entity: string,
  params: AdminListParams = {},
): Promise<AdminListResult> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.page != null) search.set("page", String(params.page));
  if (params.page_size != null) search.set("page_size", String(params.page_size));
  const qs = search.toString();
  const url = `${baseUrl()}/admin/${entity}${qs ? `?${qs}` : ""}`;
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) throw new Error(await parseError(response, "Failed to list"));
  return (await response.json()) as AdminListResult;
}

export async function adminGet(entity: string, id: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${baseUrl()}/admin/${entity}/${id}`, { headers: authHeaders() });
  if (!response.ok) throw new Error(await parseError(response, "Failed to fetch"));
  return (await response.json()) as Record<string, unknown>;
}

export async function adminUpdate(
  entity: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${baseUrl()}/admin/${entity}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(await parseError(response, "Failed to update"));
  return (await response.json()) as Record<string, unknown>;
}

export async function adminCreate(
  entity: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${baseUrl()}/admin/${entity}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response, "Failed to create"));
  return (await response.json()) as Record<string, unknown>;
}

export async function adminDelete(entity: string, id: string): Promise<void> {
  const response = await fetch(`${baseUrl()}/admin/${entity}/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response, "Failed to delete"));
}
