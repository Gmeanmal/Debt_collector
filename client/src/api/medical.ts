import { getAccessToken } from "@/services/auth/tokenStorage";

export interface ConsentRequiredDetail {
  slug: string;
  version: number;
  bodyMd: string;
  consentTextId: string;
}

export class ConsentRequiredError extends Error {
  readonly detail: ConsentRequiredDetail;

  constructor(detail: ConsentRequiredDetail) {
    super("consent_required");
    this.name = "ConsentRequiredError";
    this.detail = detail;
  }
}

interface RawConsentRequiredBody {
  detail: {
    error: string;
    slug: string;
    version: number;
    body_md: string;
    consent_text_id: string;
  };
}

export interface RawSubMedicalSelfOut {
  blood_type_is_set: boolean;
  allergies_is_set: boolean;
  medications_is_set: boolean;
  emergency_contact_is_set: boolean;
  medical_notes_is_set: boolean;
  updated_at: string;
}

export interface RawSubMedicalUpdate {
  blood_type?: string | null;
  allergies?: string | null;
  medications?: string | null;
  emergency_contact?: string | null;
  medical_notes?: string | null;
}

export interface RawSubMedicalRevealOut {
  sub_id: string;
  blood_type?: string | null;
  allergies?: string | null;
  medications?: string | null;
  emergency_contact?: string | null;
  medical_notes?: string | null;
  updated_at: string;
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function medicalFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = (import.meta.env.VITE_API_BASE_URL as string) ?? "";
  const res = await fetch(`${base}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  if (res.status === 428) {
    const body = (await res.json()) as RawConsentRequiredBody;
    throw new ConsentRequiredError({
      slug: body.detail.slug,
      version: body.detail.version,
      bodyMd: body.detail.body_md,
      consentTextId: body.detail.consent_text_id,
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchOwnMedical(): Promise<RawSubMedicalSelfOut> {
  return medicalFetch<RawSubMedicalSelfOut>("/profile/medical");
}

export async function putOwnMedical(body: RawSubMedicalUpdate): Promise<RawSubMedicalSelfOut> {
  return medicalFetch<RawSubMedicalSelfOut>("/profile/medical", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function acceptConsent(slug: string, consentTextId: string): Promise<void> {
  const base = (import.meta.env.VITE_API_BASE_URL as string) ?? "";
  const res = await fetch(`${base}/consent/${slug}/accept`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ consent_text_id: consentTextId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
}

export async function revealSubMedical(subId: string): Promise<RawSubMedicalRevealOut> {
  return medicalFetch<RawSubMedicalRevealOut>(`/goddess/subs/${subId}/medical`);
}
