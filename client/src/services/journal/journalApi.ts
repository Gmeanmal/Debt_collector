import { z } from "zod";
import {
  createJournalEntryApi,
  listOwnJournalApi,
  listSubJournalForGoddessApi,
  markJournalEntryReadApi,
  upsertJournalCommentApi,
} from "@/api/journal";
import { queryKeys } from "@/lib/queryKeys";

export const subJournalKey = queryKeys.journal.own();
export const goddessSubJournalKey = (subId: string) => queryKeys.journal.forSub(subId);

export const JournalMoodSchema = z.enum([
  "great",
  "good",
  "neutral",
  "low",
  "bad",
  "numb",
  "overwhelmed",
]);

export type JournalMood = z.infer<typeof JournalMoodSchema>;

export const JournalEntrySchema = z.object({
  id: z.string().uuid(),
  sub_id: z.string().uuid(),
  goddess_id: z.string().uuid(),
  body: z.string(),
  mood: JournalMoodSchema,
  photo_r2_key: z.string().nullable(),
  attachment_key: z.string().nullable(),
  attachment_mime: z.string().nullable(),
  attachment_presigned_url: z.string().nullable(),
  is_private: z.boolean(),
  created_at: z.string(),
  read_by_goddess_at: z.string().nullable(),
  goddess_comment: z.string().nullable(),
  goddess_comment_at: z.string().nullable(),
});

export type JournalEntry = z.infer<typeof JournalEntrySchema>;

export const CreateJournalEntrySchema = z.object({
  body: z.string().min(1, "Entry body is required"),
  mood: JournalMoodSchema,
  is_private: z.boolean().default(false),
});

export type CreateJournalEntryIn = z.infer<typeof CreateJournalEntrySchema>;

export const JournalCommentSchema = z.object({
  comment: z.string().min(1, "Comment cannot be empty"),
});

export type JournalCommentIn = z.infer<typeof JournalCommentSchema>;

function normaliseError(err: unknown, fallback: string): Error {
  if (err instanceof Error) return err;
  return new Error(fallback);
}

export async function createJournalEntry(
  payload: CreateJournalEntryIn,
  attachment: File | null,
): Promise<JournalEntry> {
  try {
    const raw = await createJournalEntryApi(
      payload.body,
      payload.mood,
      payload.is_private,
      attachment,
    );
    return JournalEntrySchema.parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to create journal entry");
  }
}

export async function listOwnJournal(params: {
  limit?: number;
  before?: string | null;
}): Promise<JournalEntry[]> {
  try {
    const raw = await listOwnJournalApi(params);
    return z.array(JournalEntrySchema).parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to load journal entries");
  }
}

export async function listSubJournalForGoddess(
  subId: string,
  params: { limit?: number; before?: string | null },
): Promise<JournalEntry[]> {
  try {
    const raw = await listSubJournalForGoddessApi(subId, params);
    return z.array(JournalEntrySchema).parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to load sub journal entries");
  }
}

export async function upsertJournalComment(
  entryId: string,
  comment: string,
): Promise<JournalEntry> {
  try {
    const raw = await upsertJournalCommentApi(entryId, comment);
    return JournalEntrySchema.parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to save comment");
  }
}

export async function markJournalEntryRead(
  username: string,
  entryId: string,
): Promise<JournalEntry> {
  try {
    const raw = await markJournalEntryReadApi(username, entryId);
    return JournalEntrySchema.parse(raw);
  } catch (err) {
    throw normaliseError(err, "Failed to mark entry as read");
  }
}
