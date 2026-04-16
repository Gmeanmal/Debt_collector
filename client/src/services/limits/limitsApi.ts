import { z } from "zod";
import {
  fetchLimits,
  createLimit,
  updateLimit,
  deleteLimit,
  fetchTriggers,
  createTrigger,
  updateTrigger,
  deleteTrigger,
} from "@/api/limits";
import { queryKeys } from "@/lib/queryKeys";

export const LimitKindSchema = z.enum(["hard", "soft"]);
export type LimitKind = z.infer<typeof LimitKindSchema>;

export const LimitSeveritySchema = z.enum(["low", "medium", "high"]);
export type LimitSeverity = z.infer<typeof LimitSeveritySchema>;

export const LimitItemSchema = z.object({
  id: z.string().uuid(),
  sub_id: z.string().uuid(),
  kind: LimitKindSchema,
  severity: LimitSeveritySchema,
  body: z.string(),
  acknowledged_by_goddess_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type LimitItem = z.infer<typeof LimitItemSchema>;

export const LimitCreateSchema = z.object({
  kind: LimitKindSchema,
  severity: LimitSeveritySchema,
  label: z.string().min(1),
  notes: z.string().nullable().optional(),
});

export type LimitCreate = z.infer<typeof LimitCreateSchema>;

export const LimitUpdateSchema = z.object({
  kind: LimitKindSchema.nullable().optional(),
  severity: LimitSeveritySchema.nullable().optional(),
  label: z.string().min(1).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type LimitUpdate = z.infer<typeof LimitUpdateSchema>;

export const TriggerItemSchema = z.object({
  id: z.string().uuid(),
  sub_id: z.string().uuid(),
  severity: LimitSeveritySchema,
  trigger_text: z.string(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type TriggerItem = z.infer<typeof TriggerItemSchema>;

export const TriggerCreateSchema = z.object({
  severity: LimitSeveritySchema,
  trigger_text: z.string().min(1),
  notes: z.string().nullable().optional(),
});

export type TriggerCreate = z.infer<typeof TriggerCreateSchema>;

export const TriggerUpdateSchema = z.object({
  severity: LimitSeveritySchema.nullable().optional(),
  trigger_text: z.string().min(1).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type TriggerUpdate = z.infer<typeof TriggerUpdateSchema>;

export const limitsKey = queryKeys.limits.own();
export const triggersKey = queryKeys.limits.triggers();

export async function getLimits(): Promise<LimitItem[]> {
  const raw = await fetchLimits();
  return z.array(LimitItemSchema).parse(raw);
}

export async function addLimit(body: LimitCreate): Promise<LimitItem> {
  const raw = await createLimit(body);
  return LimitItemSchema.parse(raw);
}

export async function editLimit(id: string, body: LimitUpdate): Promise<LimitItem> {
  const raw = await updateLimit(id, body);
  return LimitItemSchema.parse(raw);
}

export async function removeLimit(id: string): Promise<void> {
  await deleteLimit(id);
}

export async function getTriggers(): Promise<TriggerItem[]> {
  const raw = await fetchTriggers();
  return z.array(TriggerItemSchema).parse(raw);
}

export async function addTrigger(body: TriggerCreate): Promise<TriggerItem> {
  const raw = await createTrigger(body);
  return TriggerItemSchema.parse(raw);
}

export async function editTrigger(id: string, body: TriggerUpdate): Promise<TriggerItem> {
  const raw = await updateTrigger(id, body);
  return TriggerItemSchema.parse(raw);
}

export async function removeTrigger(id: string): Promise<void> {
  await deleteTrigger(id);
}
