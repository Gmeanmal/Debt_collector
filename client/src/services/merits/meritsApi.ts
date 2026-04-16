import { z } from "zod";
import {
  getOwnPointsBalanceApi,
  listSubRewardsApi,
  redeemRewardApi,
  listGoddessRewardsApi,
  createGoddessRewardApi,
  updateGoddessRewardApi,
  deleteGoddessRewardApi,
  listGoddessPunishmentsApi,
  createGoddessPunishmentApi,
  updateGoddessPunishmentApi,
  deleteGoddessPunishmentApi,
  invokeGoddessPunishmentApi,
} from "@/api/merits";
import { queryKeys } from "@/lib/queryKeys";

export const subRewardsKey = queryKeys.merits.subRewards();
export const subBalanceKey = queryKeys.merits.subBalance();
export const goddessRewardsKey = queryKeys.merits.goddessRewards();
export const goddessPunishmentsKey = queryKeys.merits.goddessPunishments();

export const PointsBalanceSchema = z.object({
  balance: z.number().int(),
  last_event_at: z.string().nullable(),
  event_count: z.number().int(),
});

export type PointsBalance = z.infer<typeof PointsBalanceSchema>;

export const RewardTierSchema = z.object({
  id: z.string().uuid(),
  goddess_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  cost: z.number().int().positive(),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type RewardTier = z.infer<typeof RewardTierSchema>;

export const RewardTierInSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
  description: z.string().nullable().optional(),
  cost: z.number().int().min(1, "Cost must be at least 1"),
  active: z.boolean().optional(),
});

export type RewardTierIn = z.infer<typeof RewardTierInSchema>;

export const RewardTierPatchInSchema = z.object({
  name: z.string().min(1).max(200).nullable().optional(),
  description: z.string().nullable().optional(),
  cost: z.number().int().min(1).nullable().optional(),
  active: z.boolean().nullable().optional(),
});

export type RewardTierPatchIn = z.infer<typeof RewardTierPatchInSchema>;

export const PunishmentTierSchema = z.object({
  id: z.string().uuid(),
  goddess_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  default_points_penalty: z.number().int().max(0),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type PunishmentTier = z.infer<typeof PunishmentTierSchema>;

export const PunishmentTierInSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
  description: z.string().nullable().optional(),
  default_points_penalty: z.number().int().max(0, "Penalty must be zero or negative").optional(),
  active: z.boolean().optional(),
});

export type PunishmentTierIn = z.infer<typeof PunishmentTierInSchema>;

export const PunishmentTierPatchInSchema = z.object({
  name: z.string().min(1).max(200).nullable().optional(),
  description: z.string().nullable().optional(),
  default_points_penalty: z.number().int().max(0).nullable().optional(),
  active: z.boolean().nullable().optional(),
});

export type PunishmentTierPatchIn = z.infer<typeof PunishmentTierPatchInSchema>;

export const RedeemOutSchema = z.object({
  redemption_id: z.string().uuid(),
  new_balance: z.number().int(),
});

export type RedeemOut = z.infer<typeof RedeemOutSchema>;

function normaliseError(err: unknown, fallback: string): Error {
  if (err instanceof Error) return err;
  return new Error(fallback);
}

export async function getOwnPointsBalance(): Promise<PointsBalance> {
  try {
    const raw = await getOwnPointsBalanceApi();
    return PointsBalanceSchema.parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to load points balance");
  }
}

export async function listSubRewards(): Promise<RewardTier[]> {
  try {
    const raw = await listSubRewardsApi();
    return z.array(RewardTierSchema).parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to load rewards");
  }
}

export async function redeemReward(rewardId: string): Promise<RedeemOut> {
  try {
    const raw = await redeemRewardApi(rewardId);
    return RedeemOutSchema.parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to redeem reward");
  }
}

export async function listGoddessRewards(): Promise<RewardTier[]> {
  try {
    const raw = await listGoddessRewardsApi();
    return z.array(RewardTierSchema).parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to load reward tiers");
  }
}

export async function createGoddessReward(payload: RewardTierIn): Promise<RewardTier> {
  try {
    const raw = await createGoddessRewardApi(payload);
    return RewardTierSchema.parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to create reward tier");
  }
}

export async function updateGoddessReward(
  rewardId: string,
  payload: RewardTierPatchIn,
): Promise<RewardTier> {
  try {
    const raw = await updateGoddessRewardApi(rewardId, payload);
    return RewardTierSchema.parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to update reward tier");
  }
}

export async function deleteGoddessReward(rewardId: string): Promise<void> {
  try {
    await deleteGoddessRewardApi(rewardId);
  } catch (err) {
    throw normaliseError(err, "Failed to delete reward tier");
  }
}

export async function listGoddessPunishments(): Promise<PunishmentTier[]> {
  try {
    const raw = await listGoddessPunishmentsApi();
    return z.array(PunishmentTierSchema).parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to load punishment tiers");
  }
}

export async function createGoddessPunishment(payload: PunishmentTierIn): Promise<PunishmentTier> {
  try {
    const raw = await createGoddessPunishmentApi(payload);
    return PunishmentTierSchema.parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to create punishment tier");
  }
}

export async function updateGoddessPunishment(
  punishmentId: string,
  payload: PunishmentTierPatchIn,
): Promise<PunishmentTier> {
  try {
    const raw = await updateGoddessPunishmentApi(punishmentId, payload);
    return PunishmentTierSchema.parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to update punishment tier");
  }
}

export async function deleteGoddessPunishment(punishmentId: string): Promise<void> {
  try {
    await deleteGoddessPunishmentApi(punishmentId);
  } catch (err) {
    throw normaliseError(err, "Failed to delete punishment tier");
  }
}

export async function invokeGoddessPunishment(
  punishmentId: string,
  subId: string,
): Promise<unknown> {
  try {
    return await invokeGoddessPunishmentApi(punishmentId, subId);
  } catch (err) {
    throw normaliseError(err, "Failed to invoke punishment");
  }
}
