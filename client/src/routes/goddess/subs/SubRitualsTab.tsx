import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { queryKeys } from "@/lib/queryKeys";
import { fetchGoddessSubRituals } from "@/api/today";
import type { RawRitualOut } from "@/api/today";

interface Props {
  subId: string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  custom: "Custom days",
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatCustomDays(bitmask: number): string {
  return DAY_NAMES.filter((_, i) => bitmask & (1 << i)).join(", ");
}

function formatDeadline(time: string | null): string {
  if (!time) return "23:59";
  return time.slice(0, 5);
}

function RitualRow({ ritual }: { ritual: RawRitualOut }) {
  const freqLabel = FREQUENCY_LABELS[ritual.frequency] ?? ritual.frequency;
  const scheduleDetail =
    ritual.frequency === "custom" && ritual.custom_days_bitmask != null
      ? formatCustomDays(ritual.custom_days_bitmask)
      : null;

  return (
    <article className="bg-base-surface border border-base-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-sm font-semibold text-base-text">{ritual.title}</span>
          {ritual.description && (
            <p className="text-xs text-base-text-muted leading-relaxed line-clamp-2">
              {ritual.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          <Badge variant={ritual.paused ? "warning" : "default"}>
            {ritual.paused ? "Paused" : "Active"}
          </Badge>
          <Badge variant="info">{freqLabel}</Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-base-text-muted border-t border-base-border pt-3">
        {scheduleDetail && (
          <span>
            <span className="font-medium text-base-text">Days:</span> {scheduleDetail}
          </span>
        )}
        <span>
          <span className="font-medium text-base-text">Deadline:</span>{" "}
          {formatDeadline(ritual.deadline_time)}
        </span>
        <span>
          <span className="font-medium text-base-text">On complete:</span>{" "}
          <span className="text-status-success">+{ritual.points_on_complete} pts</span>
        </span>
        <span>
          <span className="font-medium text-base-text">On miss:</span>{" "}
          <span className="text-status-danger">{ritual.points_on_miss} pts</span>
        </span>
      </div>
    </article>
  );
}

export function SubRitualsTab({ subId }: Props) {
  const {
    data: rituals = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.rituals.forSub(subId),
    queryFn: () => fetchGoddessSubRituals(subId),
    enabled: Boolean(subId),
  });

  if (isLoading) {
    return <ListSkeleton rows={3} />;
  }

  if (isError) {
    return (
      <ErrorState title="Failed to load rituals" message={(error as Error | undefined)?.message} />
    );
  }

  const active = rituals.filter((r) => !r.paused);
  const paused = rituals.filter((r) => r.paused);

  if (rituals.length === 0) {
    return (
      <EmptyState
        title="No rituals assigned"
        message="Rituals can be assigned from the dedicated Rituals management page."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {active.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-base-text-muted uppercase tracking-widest mb-3">
            Active ({active.length})
          </h3>
          <div className="flex flex-col gap-3">
            {active.map((ritual) => (
              <RitualRow key={ritual.id} ritual={ritual} />
            ))}
          </div>
        </section>
      )}

      {paused.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-base-text-muted uppercase tracking-widest mb-3">
            Paused ({paused.length})
          </h3>
          <div className="flex flex-col gap-3">
            {paused.map((ritual) => (
              <RitualRow key={ritual.id} ritual={ritual} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
