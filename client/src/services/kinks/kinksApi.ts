import { z } from "zod";
import { fetchSubKinkMatrix, upsertSubKinkRating } from "@/api/kinks";
import { queryKeys } from "@/lib/queryKeys";

export const KinkRatingSchema = z.enum([
  "hard_limit",
  "soft_limit",
  "curious",
  "loves",
  "fetish_need",
  "not_set",
]);

export type KinkRating = z.infer<typeof KinkRatingSchema>;

export const KinkItemSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  safety_flag: z.boolean(),
  is_custom: z.boolean(),
  rating: KinkRatingSchema,
  note: z.string().nullable(),
  needs_confirmation: z.boolean(),
});

export type KinkItem = z.infer<typeof KinkItemSchema>;

export const KinkCategorySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  label: z.string(),
  safety_flag: z.boolean(),
  sort_order: z.number(),
  items: z.array(KinkItemSchema),
});

export type KinkCategory = z.infer<typeof KinkCategorySchema>;

export const KinkMatrixSchema = z.object({
  categories: z.array(KinkCategorySchema),
});

export type KinkMatrix = z.infer<typeof KinkMatrixSchema>;

export const SubKinkRatingOutSchema = z.object({
  item_id: z.string().uuid(),
  rating: KinkRatingSchema,
  note: z.string().nullable(),
  needs_confirmation: z.boolean(),
  updated_at: z.string(),
});

export type SubKinkRatingOut = z.infer<typeof SubKinkRatingOutSchema>;

export const kinksKey = queryKeys.kinks.matrix();

export async function getKinkMatrix(): Promise<KinkMatrix> {
  const raw = await fetchSubKinkMatrix();
  return KinkMatrixSchema.parse(raw);
}

export async function updateKinkRating(
  itemId: string,
  rating: KinkRating,
): Promise<SubKinkRatingOut> {
  const raw = await upsertSubKinkRating(itemId, rating);
  return SubKinkRatingOutSchema.parse(raw);
}
