import { z } from "zod";
import {
  fetchTodayOccurrences,
  fetchOwnRituals,
  fetchOpenTasks,
  completeOccurrence,
  submitOccurrence,
  submitTask,
  uploadEvidencePhoto,
  type OccurrenceActionBody,
} from "@/api/today";
import { queryKeys } from "@/lib/queryKeys";

export const todayRitualsKey = queryKeys.today.rituals();
export const todayTasksKey = queryKeys.today.tasks();

export const occurrenceStatusValues = [
  "pending",
  "completed",
  "submitted",
  "approved",
  "rejected",
  "missed",
] as const;

export type OccurrenceStatus = (typeof occurrenceStatusValues)[number];

export const taskStatusValues = ["open", "submitted", "approved", "rejected", "cancelled"] as const;
export type TaskStatus = (typeof taskStatusValues)[number];

export const RitualOccurrenceSchema = z.object({
  id: z.string().uuid(),
  ritual_id: z.string().uuid(),
  date: z.string(),
  status: z.enum(occurrenceStatusValues),
  note: z.string().nullable(),
  evidence_r2_key: z.string().nullable(),
  completed_at: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  created_at: z.string(),
});

export type RitualOccurrence = z.infer<typeof RitualOccurrenceSchema>;

export const RitualSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  frequency: z.string(),
  deadline_time: z.string().nullable(),
  points_on_complete: z.number(),
  points_on_miss: z.number(),
  paused: z.boolean(),
});

export type Ritual = z.infer<typeof RitualSchema>;

export const OpenTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  due_at: z.string().nullable(),
  points_on_complete: z.number(),
  points_on_miss: z.number(),
  status: z.enum(taskStatusValues),
  note: z.string().nullable(),
  evidence_r2_key: z.string().nullable(),
  created_at: z.string(),
});

export type OpenTask = z.infer<typeof OpenTaskSchema>;

export const todayRitualsMapKey = queryKeys.today.ritualsList();

export interface OccurrenceWithRitual {
  occurrence: RitualOccurrence;
  ritual: Ritual;
}

export async function getTodayOccurrences(): Promise<OccurrenceWithRitual[]> {
  const [rawOccurrences, rawRituals] = await Promise.all([
    fetchTodayOccurrences(),
    fetchOwnRituals(),
  ]);
  const ritualMap = new Map<string, Ritual>();
  for (const r of rawRituals) {
    ritualMap.set(r.id, RitualSchema.parse(r));
  }
  return rawOccurrences.flatMap((o) => {
    const ritual = ritualMap.get(o.ritual_id);
    if (!ritual) return [];
    return [{ occurrence: RitualOccurrenceSchema.parse(o), ritual }];
  });
}

export async function getOpenTasks(): Promise<OpenTask[]> {
  const raw = await fetchOpenTasks();
  return raw
    .filter((t) => t.status === "open" || t.status === "submitted")
    .map((t) => OpenTaskSchema.parse(t));
}

export async function uploadEvidence(file: File): Promise<string> {
  const photo = await uploadEvidencePhoto(file);
  return photo.r2_key;
}

export async function completeOccurrenceService(
  id: string,
  body: OccurrenceActionBody,
): Promise<RitualOccurrence> {
  const raw = await completeOccurrence(id, body);
  return RitualOccurrenceSchema.parse(raw);
}

export async function submitOccurrenceService(
  id: string,
  body: OccurrenceActionBody,
): Promise<RitualOccurrence> {
  const raw = await submitOccurrence(id, body);
  return RitualOccurrenceSchema.parse(raw);
}

export async function submitTaskService(id: string, body: OccurrenceActionBody): Promise<OpenTask> {
  const raw = await submitTask(id, body);
  return OpenTaskSchema.parse(raw);
}
