import { apiClient } from "@/api/client";
import type { components } from "@/types/api.generated";

export type GenderTaxonomyOut = components["schemas"]["GenderTaxonomyOut"];

export async function listGenderTaxonomyApi(): Promise<GenderTaxonomyOut[]> {
  const { data, error } = await apiClient.GET("/reference/genders");
  if (error || !data) throw new Error("Failed to load gender taxonomy");
  return data;
}
