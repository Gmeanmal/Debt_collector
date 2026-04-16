import { z } from "zod";
import {
  fetchSubToys,
  proposeSubToy,
  fetchGoddessSubToys,
  createGoddessSubToy,
  updateGoddessToy,
  deleteGoddessToy,
  approveGoddessToy,
  rejectGoddessToy,
} from "@/api/toys";
import { queryKeys } from "@/lib/queryKeys";

export const ToyCategorySchema = z.enum([
  "restraint",
  "impact",
  "vibrator",
  "plug",
  "cage",
  "gag",
  "clothing",
  "collar",
  "other",
]);

export type ToyCategory = z.infer<typeof ToyCategorySchema>;

export const ToyProposedBySchema = z.enum(["sub", "goddess"]);
export type ToyProposedBy = z.infer<typeof ToyProposedBySchema>;

export const ToyItemSchema = z.object({
  id: z.string().uuid(),
  sub_id: z.string().uuid(),
  goddess_id: z.string().uuid(),
  category: ToyCategorySchema,
  name: z.string(),
  description: z.string().nullable(),
  photo_r2_key: z.string().nullable(),
  proposed_by: ToyProposedBySchema,
  approved: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ToyItem = z.infer<typeof ToyItemSchema>;

export const ToyCreateSchema = z.object({
  category: ToyCategorySchema,
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or fewer"),
  description: z.string().nullable().optional(),
  photo_r2_key: z.string().nullable().optional(),
});

export type ToyCreateInput = z.infer<typeof ToyCreateSchema>;

export const ToyUpdateSchema = z.object({
  category: ToyCategorySchema.nullable().optional(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be 200 characters or fewer")
    .nullable()
    .optional(),
  description: z.string().nullable().optional(),
  photo_r2_key: z.string().nullable().optional(),
});

export type ToyUpdateInput = z.infer<typeof ToyUpdateSchema>;

export const subToysKey = queryKeys.toys.own();
export const goddessSubToysKey = (subId: string) => queryKeys.toys.forSub(subId);

function normaliseError(err: unknown, fallback: string): Error {
  if (err instanceof Error) return err;
  return new Error(fallback);
}

export async function listSubToys(): Promise<ToyItem[]> {
  try {
    const raw = await fetchSubToys();
    return z.array(ToyItemSchema).parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to load toy inventory");
  }
}

export async function proposeToy(input: ToyCreateInput): Promise<ToyItem> {
  try {
    const raw = await proposeSubToy(input);
    return ToyItemSchema.parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to propose toy");
  }
}

export async function listGoddessSubToys(subId: string): Promise<ToyItem[]> {
  try {
    const raw = await fetchGoddessSubToys(subId);
    return z.array(ToyItemSchema).parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to load sub toy inventory");
  }
}

export async function createToyForSub(
  subId: string,
  input: ToyCreateInput,
): Promise<ToyItem> {
  try {
    const raw = await createGoddessSubToy(subId, input);
    return ToyItemSchema.parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to add toy");
  }
}

export async function updateToy(
  toyId: string,
  input: ToyUpdateInput,
): Promise<ToyItem> {
  try {
    const raw = await updateGoddessToy(toyId, input);
    return ToyItemSchema.parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to update toy");
  }
}

export async function deleteToy(toyId: string): Promise<void> {
  try {
    await deleteGoddessToy(toyId);
  } catch (err) {
    throw normaliseError(err, "Failed to delete toy");
  }
}

export async function approveToy(toyId: string): Promise<ToyItem> {
  try {
    const raw = await approveGoddessToy(toyId);
    return ToyItemSchema.parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to approve toy");
  }
}

export async function rejectToy(toyId: string): Promise<void> {
  try {
    await rejectGoddessToy(toyId);
  } catch (err) {
    throw normaliseError(err, "Failed to reject toy");
  }
}
