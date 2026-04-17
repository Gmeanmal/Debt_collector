import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getGoddessDashboardChartsApi } from "@/services/dashboards/dashboardsApi";
import type { DashboardChartsOut } from "@/types/dashboard";

interface UseGoddessDashboardChartsResult {
  data: DashboardChartsOut | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useGoddessDashboardCharts(): UseGoddessDashboardChartsResult {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.goddess.dashboardCharts(),
    queryFn: getGoddessDashboardChartsApi,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    data,
    isLoading,
    isError,
    error: error as Error | null,
  };
}
