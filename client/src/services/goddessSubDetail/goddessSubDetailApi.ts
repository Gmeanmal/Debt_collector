import { z } from "zod";
import {
  fetchSubKinkMatrixForGoddess,
  fetchSubLimitsForGoddess,
  fetchSubTriggersForGoddess,
  fetchSubSafewordForGoddess,
  fetchSubTopApprovedPhoto,
  postGoddessMessageToSub,
} from "@/api/goddessSubDetail";
import { KinkMatrixSchema, type KinkMatrix } from "@/services/kinks/kinksApi";
import {
  LimitItemSchema,
  TriggerItemSchema,
  type LimitItem,
  type TriggerItem,
} from "@/services/limits/limitsApi";

export const SubSafewordSchema = z.object({
  word: z.string(),
  signal: z.string().nullable(),
  emergency_contact_name: z.string().nullable(),
  emergency_contact_phone: z.string().nullable(),
  updated_at: z.string(),
});

export type SubSafeword = z.infer<typeof SubSafewordSchema>;

export const TopPhotoSchema = z.object({
  id: z.string().uuid(),
  presigned_get_url: z.string().url(),
  reviewed_at: z.string().nullable(),
});

export type TopPhoto = z.infer<typeof TopPhotoSchema>;

export async function getSubKinkMatrixForGoddess(subId: string): Promise<KinkMatrix> {
  const raw = await fetchSubKinkMatrixForGoddess(subId);
  return KinkMatrixSchema.parse(raw);
}

export async function getSubLimitsForGoddess(subId: string): Promise<LimitItem[]> {
  const raw = await fetchSubLimitsForGoddess(subId);
  return z.array(LimitItemSchema).parse(raw);
}

export async function getSubTriggersForGoddess(subId: string): Promise<TriggerItem[]> {
  const raw = await fetchSubTriggersForGoddess(subId);
  return z.array(TriggerItemSchema).parse(raw);
}

export async function getSubSafewordForGoddess(subId: string): Promise<SubSafeword | null> {
  const raw = await fetchSubSafewordForGoddess(subId);
  if (raw === null) return null;
  return SubSafewordSchema.parse(raw);
}

export async function getSubTopApprovedPhoto(subId: string): Promise<TopPhoto | null> {
  const raw = await fetchSubTopApprovedPhoto(subId);
  if (raw === null) return null;
  return TopPhotoSchema.parse(raw);
}

export async function sendGoddessMessageToSub(username: string, body: string): Promise<void> {
  await postGoddessMessageToSub(username, body);
}
