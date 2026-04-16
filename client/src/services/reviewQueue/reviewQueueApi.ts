import { z } from "zod";
import {
  fetchReviewQueue,
  bulkReviewAction,
  type RawBulkActionIn,
} from "@/api/reviewQueue";
import { queryKeys } from "@/lib/queryKeys";

export const reviewQueueKey = queryKeys.reviewQueue.all();

const reviewItemKindValues = ["ritual_occurrence", "task"] as const;
export type ReviewItemKind = (typeof reviewItemKindValues)[number];

export const ReviewQueueItemSchema = z.object({
  kind: z.enum(reviewItemKindValues),
  id: z.string().uuid(),
  sub_id: z.string().uuid(),
  sub_username: z.string(),
  sub_display_name: z.string().nullable(),
  title: z.string(),
  submitted_at: z.string(),
  evidence_r2_key: z.string().nullable(),
  evidence_presigned_url: z.string().nullable(),
  note: z.string().nullable(),
  points_on_complete: z.number(),
});

export type ReviewQueueItem = z.infer<typeof ReviewQueueItemSchema>;

export const BulkItemResultSchema = z.object({
  kind: z.enum(reviewItemKindValues),
  id: z.string().uuid(),
});

export const BulkItemFailureSchema = z.object({
  kind: z.enum(reviewItemKindValues),
  id: z.string().uuid(),
  error: z.string(),
});

export const BulkActionOutSchema = z.object({
  succeeded: z.array(BulkItemResultSchema),
  failed: z.array(BulkItemFailureSchema),
});

export type BulkActionOut = z.infer<typeof BulkActionOutSchema>;

export async function getReviewQueue(params?: {
  limit?: number;
  before?: string;
}): Promise<ReviewQueueItem[]> {
  const raw = await fetchReviewQueue(params);
  return raw.map((item) => ReviewQueueItemSchema.parse(item));
}

export async function submitBulkAction(body: RawBulkActionIn): Promise<BulkActionOut> {
  const raw = await bulkReviewAction(body);
  return BulkActionOutSchema.parse(raw);
}
