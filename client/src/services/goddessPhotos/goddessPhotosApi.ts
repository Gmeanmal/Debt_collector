import { z } from "zod";
import {
  listPhotoQueue as apiListPhotoQueue,
  approvePhoto as apiApprovePhoto,
  rejectPhoto as apiRejectPhoto,
} from "@/api/goddessPhotos";

export const SubPhotoQueueEntrySchema = z.object({
  id: z.string(),
  sub_id: z.string(),
  sub_username: z.string().nullable().optional(),
  uploaded_at: z.string(),
  mime_type: z.string(),
  byte_size: z.number(),
  presigned_get_url: z.string().url(),
});

export const SubPhotoReviewSchema = z.object({
  id: z.string(),
  status: z.string(),
  reviewed_at: z.string().nullable().optional(),
  rejection_reason: z.string().nullable().optional(),
});

export type SubPhotoQueueEntry = z.infer<typeof SubPhotoQueueEntrySchema>;
export type SubPhotoReview = z.infer<typeof SubPhotoReviewSchema>;

function normaliseError(err: unknown, fallback: string): Error {
  if (err instanceof Error) return err;
  return new Error(fallback);
}

export async function listPhotoQueue(): Promise<SubPhotoQueueEntry[]> {
  try {
    const raw = await apiListPhotoQueue();
    return z.array(SubPhotoQueueEntrySchema).parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to load photo queue");
  }
}

export async function approvePhoto(id: string): Promise<SubPhotoReview> {
  try {
    const raw = await apiApprovePhoto(id);
    return SubPhotoReviewSchema.parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to approve photo");
  }
}

export async function rejectPhoto(id: string, reason: string): Promise<SubPhotoReview> {
  try {
    const raw = await apiRejectPhoto(id, reason);
    return SubPhotoReviewSchema.parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to reject photo");
  }
}
