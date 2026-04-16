import { z } from "zod";
import { fetchTributeGauge } from "@/api/tributeMinimum";
import { queryKeys } from "@/lib/queryKeys";

export const TributePeriodSchema = z.enum(["weekly", "monthly"]);
export type TributePeriod = z.infer<typeof TributePeriodSchema>;

export const GaugeColorSchema = z.enum(["green", "amber", "red"]);
export type GaugeColor = z.infer<typeof GaugeColorSchema>;

export const TributeGaugeSchema = z.object({
  configured: z.boolean(),
  target_amount: z.string().nullable(),
  period: TributePeriodSchema.nullable(),
  actual_this_period: z.string(),
  ratio: z.string().nullable(),
  color: GaugeColorSchema,
  period_start: z.string(),
  period_end: z.string(),
});

export type TributeGauge = z.infer<typeof TributeGaugeSchema>;

export const tributeGaugeKey = (subId: string) => queryKeys.tributeGauge.forSub(subId);

function normaliseError(err: unknown, fallback: string): Error {
  if (err instanceof Error) return err;
  return new Error(fallback);
}

export async function getTributeGauge(subId: string): Promise<TributeGauge> {
  try {
    const raw = await fetchTributeGauge(subId);
    return TributeGaugeSchema.parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to load tribute gauge");
  }
}
