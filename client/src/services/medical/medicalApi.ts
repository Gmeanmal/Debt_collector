import { z } from "zod";
import { fetchOwnMedical, putOwnMedical, acceptConsent, revealSubMedical } from "@/api/medical";
import { queryKeys } from "@/lib/queryKeys";

export const SubMedicalSelfOutSchema = z.object({
  blood_type_is_set: z.boolean(),
  allergies_is_set: z.boolean(),
  medications_is_set: z.boolean(),
  emergency_contact_is_set: z.boolean(),
  medical_notes_is_set: z.boolean(),
  updated_at: z.string(),
});

export type SubMedicalSelfOut = z.infer<typeof SubMedicalSelfOutSchema>;

export const SubMedicalRevealOutSchema = z.object({
  sub_id: z.string().uuid(),
  blood_type: z.string().nullable().optional(),
  allergies: z.string().nullable().optional(),
  medications: z.string().nullable().optional(),
  emergency_contact: z.string().nullable().optional(),
  medical_notes: z.string().nullable().optional(),
  updated_at: z.string(),
});

export type SubMedicalRevealOut = z.infer<typeof SubMedicalRevealOutSchema>;

export const SubMedicalUpdateSchema = z.object({
  blood_type: z.string().nullable().optional(),
  allergies: z.string().nullable().optional(),
  medications: z.string().nullable().optional(),
  emergency_contact: z.string().nullable().optional(),
  medical_notes: z.string().nullable().optional(),
});

export type SubMedicalUpdate = z.infer<typeof SubMedicalUpdateSchema>;

export const medicalKey = queryKeys.medical;

export async function getOwnMedical(): Promise<SubMedicalSelfOut> {
  const raw = await fetchOwnMedical();
  return SubMedicalSelfOutSchema.parse(raw);
}

export async function saveOwnMedical(body: SubMedicalUpdate): Promise<SubMedicalSelfOut> {
  const normalized: SubMedicalUpdate = {
    blood_type: body.blood_type || null,
    allergies: body.allergies || null,
    medications: body.medications || null,
    emergency_contact: body.emergency_contact || null,
    medical_notes: body.medical_notes || null,
  };
  const raw = await putOwnMedical(normalized);
  return SubMedicalSelfOutSchema.parse(raw);
}

export async function revealSubMedicalApi(subId: string): Promise<SubMedicalRevealOut> {
  const raw = await revealSubMedical(subId);
  return SubMedicalRevealOutSchema.parse(raw);
}

export async function acceptMedicalConsent(consentTextId: string): Promise<void> {
  await acceptConsent("medical", consentTextId);
}
