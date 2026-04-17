import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getGoddessDashboardSummaryApi } from "@/services/dashboards/goddessDashboardApi";
import type { DashboardSummary } from "@/types/dashboard";

interface UseGoddessDashboardSummaryResult {
  data: DashboardSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useGoddessDashboardSummary(): UseGoddessDashboardSummaryResult {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.goddess.dashboardSummary(),
    queryFn: getGoddessDashboardSummaryApi,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  return { data, isLoading, isError, error: error as Error | null };
}
