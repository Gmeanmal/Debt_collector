import { z } from "zod";
import { fetchAftercare, putAftercare, type RawAftercareUpdate } from "@/api/aftercare";
import { queryKeys } from "@/lib/queryKeys";

export const aftercareKey = queryKeys.aftercare.own();

export const AftercareSchema = z.object({
  sub_id: z.string().uuid(),
  needs: z.string().nullable(),
  comfort_items: z.string().nullable(),
  contact_phrase: z.string().nullable(),
  notes: z.string().nullable(),
  updated_at: z.string(),
});

export type Aftercare = z.infer<typeof AftercareSchema>;

export async function getOwnAftercare(): Promise<Aftercare> {
  const raw = await fetchAftercare();
  return AftercareSchema.parse(raw);
}

export async function saveOwnAftercare(body: RawAftercareUpdate): Promise<Aftercare> {
  const raw = await putAftercare(body);
  return AftercareSchema.parse(raw);
}
