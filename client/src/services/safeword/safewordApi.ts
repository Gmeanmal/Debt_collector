import { z } from "zod";
import { fetchSafeword, upsertSafeword } from "@/api/safeword";
import { queryKeys } from "@/lib/queryKeys";

export const SafewordRecordSchema = z.object({
  word: z.string(),
  signal: z.string().nullable(),
  emergency_contact_name: z.string().nullable(),
  emergency_contact_phone: z.string().nullable(),
  updated_at: z.string(),
});

export type SafewordRecord = z.infer<typeof SafewordRecordSchema>;

export const SafewordUpsertSchema = z.object({
  word: z.string().min(1),
  signal: z.string().nullable().optional(),
  emergency_contact_name: z.string().nullable().optional(),
  emergency_contact_phone: z.string().nullable().optional(),
});

export type SafewordUpsert = z.infer<typeof SafewordUpsertSchema>;

export const safewordKey = queryKeys.safeword.own();

export async function getSafeword(): Promise<SafewordRecord> {
  const raw = await fetchSafeword();
  return SafewordRecordSchema.parse(raw);
}

export async function setSafeword(body: SafewordUpsert): Promise<SafewordRecord> {
  const raw = await upsertSafeword(body);
  return SafewordRecordSchema.parse(raw);
}
