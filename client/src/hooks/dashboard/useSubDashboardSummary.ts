import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getSubDashboardSummaryApi } from "@/services/dashboards/subDashboardApi";
import type { SubDashboardSummary } from "@/types/dashboard";

interface UseSubDashboardSummaryResult {
  data: SubDashboardSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useSubDashboardSummary(): UseSubDashboardSummaryResult {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.sub.dashboardSummary(),
    queryFn: getSubDashboardSummaryApi,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  return {
    data,
    isLoading,
    isError,
    error: error instanceof Error ? error : null,
  };
}
