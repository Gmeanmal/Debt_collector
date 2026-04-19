import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { queryKeys } from "@/lib/queryKeys";

export function HealthRoute() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.health.all(),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/health");
      if (error) throw error;
      return data;
    },
  });

  const statusText = isLoading ? "…" : error ? "DOWN" : (data?.status ?? "—");
  const statusClass = error ? "text-bad-ink" : "text-ok-ink";

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="bg-bg-elev border border-line rounded-[10px] p-8 flex flex-col gap-2">
        <h1 className="font-serif italic text-2xl text-text">Debt Collector</h1>
        <p className="text-sm text-text-mute">
          Server:{" "}
          <span className={`font-mono uppercase tracking-[0.14em] ${statusClass}`}>
            {statusText}
          </span>
        </p>
      </div>
    </div>
  );
}
