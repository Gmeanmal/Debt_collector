import { useQuery } from "@tanstack/react-query";
import { Grid3x3 } from "lucide-react";
import { KinkHeatmap } from "@/components/kinkOverview/KinkHeatmap";
import { ErrorState } from "@/components/ui/ErrorState";
import { kinkOverviewKey, getKinkOverview } from "@/services/kinkOverview/kinkOverviewApi";

function HeatmapSkeleton() {
  return (
    <div className="rounded-lg border border-base-border overflow-hidden animate-pulse">
      <div className="h-10 bg-base-surface-raised border-b border-base-border" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-9 border-b border-base-border/40 bg-base-surface" />
      ))}
    </div>
  );
}

export function KinkOverviewRoute() {
  const { data, isLoading, error } = useQuery({
    queryKey: kinkOverviewKey,
    queryFn: getKinkOverview,
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-center gap-3">
        <Grid3x3 size={22} className="text-pink-primary shrink-0" />
        <div>
          <h1 className="text-2xl font-display font-semibold text-base-text">Kink overview</h1>
          {data && (
            <p className="text-sm text-base-text-muted mt-0.5">
              {data.total_subs} sub{data.total_subs !== 1 ? "s" : ""} — {data.items.length} item
              {data.items.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </header>

      {isLoading && <HeatmapSkeleton />}

      {error && (
        <ErrorState
          title="Could not load kink overview"
          message={error instanceof Error ? error.message : "Unknown error"}
        />
      )}

      {data && <KinkHeatmap overview={data} />}
    </div>
  );
}
