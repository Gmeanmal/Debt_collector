import { useQuery } from "@tanstack/react-query";
import { listGenderTaxonomyApi, type GenderTaxonomyOut } from "@/api/reference";
import { queryKeys } from "@/lib/queryKeys";

interface UseGenderTaxonomyResult {
  genders: GenderTaxonomyOut[];
  isLoading: boolean;
}

export function useGenderTaxonomy(): UseGenderTaxonomyResult {
  const { data = [], isLoading } = useQuery({
    queryKey: queryKeys.reference.genders(),
    queryFn: listGenderTaxonomyApi,
    staleTime: 1000 * 60 * 60,
  });

  return { genders: data, isLoading };
}
