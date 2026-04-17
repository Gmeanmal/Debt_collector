import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getGoddessDashboardApi } from "@/services/dashboards/dashboardsApi";
import type { GoddessDashboardOut } from "@/services/dashboards/dashboardsApi";

interface UseGoddessDashboardResult {
  data: GoddessDashboardOut | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useGoddessDashboard(): UseGoddessDashboardResult {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.goddess.dashboard(),
    queryFn: getGoddessDashboardApi,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  return { data, isLoading, isError, error: error as Error | null };
}
