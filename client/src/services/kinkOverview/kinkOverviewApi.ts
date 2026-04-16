import { z } from "zod";
import { fetchKinkOverview } from "@/api/kinkOverview";
import { queryKeys } from "@/lib/queryKeys";

export const RATING_COLUMNS = [
  "hard_limit",
  "soft_limit",
  "not_set",
  "curious",
  "loves",
  "fetish_need",
] as const;

export type RatingColumn = (typeof RATING_COLUMNS)[number];

export const KinkOverviewItemSchema = z.object({
  item_id: z.string().uuid(),
  slug: z.string(),
  label: z.string(),
  category_label: z.string(),
  category_sort_order: z.number(),
  safety_flag: z.boolean(),
  counts: z.record(z.string(), z.number()),
});

export type KinkOverviewItem = z.infer<typeof KinkOverviewItemSchema>;

export const KinkOverviewSchema = z.object({
  total_subs: z.number(),
  items: z.array(KinkOverviewItemSchema),
});

export type KinkOverview = z.infer<typeof KinkOverviewSchema>;

export const kinkOverviewKey = queryKeys.kinkOverview.all();

export async function getKinkOverview(): Promise<KinkOverview> {
  const raw = await fetchKinkOverview();
  return KinkOverviewSchema.parse(raw);
}
