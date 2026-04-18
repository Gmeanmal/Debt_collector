import { z } from "zod";
import {
  fetchPenaltyRules,
  createPenaltyRule,
  updatePenaltyRule,
  deletePenaltyRule,
} from "@/api/penaltyRules";
import { queryKeys } from "@/lib/queryKeys";

export const PenaltyTriggerSchema = z.enum([
  "contract_missed",
  "ritual_missed",
  "rolling_late",
  "task_missed",
]);
export type PenaltyTrigger = z.infer<typeof PenaltyTriggerSchema>;

export const PenaltyActionSchema = z.enum(["notify_only", "apply_points", "apply_fee"]);
export type PenaltyAction = z.infer<typeof PenaltyActionSchema>;

export const PenaltyRuleSchema = z.object({
  id: z.string().uuid(),
  goddess_id: z.string().uuid(),
  sub_id: z.string().uuid().nullable(),
  trigger: PenaltyTriggerSchema,
  action: PenaltyActionSchema,
  points_delta: z.number().int(),
  fee_amount: z.string().nullable(),
  fee_percent: z.string().nullable(),
  min_days_late: z.number().int().nullable(),
  name: z.string().nullable(),
  cooldown_hours: z.number().int().min(0),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type PenaltyRule = z.infer<typeof PenaltyRuleSchema>;

export const PenaltyRuleInSchema = z
  .object({
    trigger: PenaltyTriggerSchema,
    action: PenaltyActionSchema,
    points_delta: z.number().int(),
    fee_amount: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid GBP amount")
      .optional(),
    fee_percent: z
      .number()
      .min(0, "Must be 0–100")
      .max(100, "Must be 0–100")
      .optional(),
    min_days_late: z.number().int().min(1).max(90).optional(),
    name: z.string().max(100).optional(),
    cooldown_hours: z.number().int().min(0),
    active: z.boolean(),
    sub_id: z
      .string()
      .uuid("Must be a valid UUID")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v === "" ? null : v)),
  })
  .refine(
    (data) => {
      if (data.action === "apply_fee") {
        return (
          (data.fee_amount !== undefined && data.fee_amount !== "") ||
          data.fee_percent !== undefined
        );
      }
      return true;
    },
    { message: "Fee amount or fee percent is required when action is apply_fee", path: ["fee_amount"] },
  );

export type PenaltyRuleIn = z.infer<typeof PenaltyRuleInSchema>;

export const PenaltyRuleUpdateSchema = z.object({
  trigger: PenaltyTriggerSchema.optional(),
  action: PenaltyActionSchema.optional(),
  points_delta: z.number().int().optional(),
  fee_amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid GBP amount")
    .optional()
    .nullable(),
  fee_percent: z.number().min(0).max(100).optional().nullable(),
  min_days_late: z.number().int().min(1).max(90).optional().nullable(),
  name: z.string().max(100).optional().nullable(),
  cooldown_hours: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
  sub_id: z.string().uuid("Must be a valid UUID").nullable().optional(),
});

export type PenaltyRuleUpdate = z.infer<typeof PenaltyRuleUpdateSchema>;

export const penaltyRulesKey = queryKeys.penaltyRules.all();

export async function listPenaltyRules(): Promise<PenaltyRule[]> {
  const raw = await fetchPenaltyRules();
  return z.array(PenaltyRuleSchema).parse(raw);
}

export async function addPenaltyRule(body: PenaltyRuleIn): Promise<PenaltyRule> {
  const raw = await createPenaltyRule({
    trigger: body.trigger,
    action: body.action,
    points_delta: body.points_delta,
    fee_amount: body.fee_amount ?? null,
    fee_percent: body.fee_percent != null ? String(body.fee_percent) : null,
    min_days_late: body.min_days_late ?? null,
    name: body.name ?? null,
    cooldown_hours: body.cooldown_hours,
    active: body.active,
    sub_id: body.sub_id ?? null,
  });
  return PenaltyRuleSchema.parse(raw);
}

export async function editPenaltyRule(id: string, body: PenaltyRuleUpdate): Promise<PenaltyRule> {
  const raw = await updatePenaltyRule(id, {
    trigger: body.trigger ?? undefined,
    action: body.action ?? undefined,
    points_delta: body.points_delta ?? undefined,
    fee_amount: body.fee_amount,
    fee_percent: body.fee_percent != null ? String(body.fee_percent) : body.fee_percent,
    min_days_late: body.min_days_late,
    name: body.name,
    cooldown_hours: body.cooldown_hours ?? undefined,
    active: body.active ?? undefined,
    sub_id: body.sub_id,
  });
  return PenaltyRuleSchema.parse(raw);
}

export async function removePenaltyRule(id: string): Promise<void> {
  await deletePenaltyRule(id);
}
