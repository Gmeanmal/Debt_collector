import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

export function HealthRoute() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/health");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-base-surface border border-base-border rounded-md p-8">
        <h1 className="font-display text-2xl text-pink-primary">Debt Collector</h1>
        <p className="mt-2 text-base-text-muted">
          Server: {isLoading ? "..." : error ? "DOWN" : (data?.status ?? "—")}
        </p>
      </div>
    </div>
  );
}
