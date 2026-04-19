import { useQuery } from "@tanstack/react-query";
import { KinkHeatmap } from "@/components/kinkOverview/KinkHeatmap";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/page-header";
import { kinkOverviewKey, getKinkOverview } from "@/services/kinkOverview/kinkOverviewApi";

function HeatmapSkeleton() {
  return (
    <div className="rounded-[10px] border border-line overflow-hidden animate-pulse">
      <div className="h-10 bg-bg-sunken border-b border-line" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-9 border-b border-line/40 bg-bg-elev" />
      ))}
    </div>
  );
}

export function KinkOverviewRoute() {
  const { data, isLoading, error } = useQuery({
    queryKey: kinkOverviewKey,
    queryFn: getKinkOverview,
  });

  const description = data
    ? `${data.total_subs} sub${data.total_subs !== 1 ? "s" : ""} — ${data.items.length} item${data.items.length !== 1 ? "s" : ""}`
    : "A matrix of every sub's kink ratings.";

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        crumbs={["Home · Moderation · Kinks"]}
        title={<span className="italic">Kink overview</span>}
        description={description}
      />

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
