import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { queryKeys } from "@/lib/queryKeys";
import { listSubMeritEvents, type MeritEvent } from "@/services/merits/meritsApi";
import { formatLondon } from "@/services/format/datetime";

interface Props {
  subId: string;
}

const SOURCE_KIND_LABELS: Record<string, string> = {
  ritual_complete: "Ritual completed",
  ritual_miss: "Ritual missed",
  task_complete: "Task completed",
  task_miss: "Task missed",
  manual: "Manual adjustment",
  reward_redeem: "Reward redeemed",
  punishment_invoke: "Punishment invoked",
  contract_miss: "Contract missed",
  rolling_late: "Rolling late",
};

function deltaVariant(delta: number): "default" | "info" | "danger" {
  if (delta > 0) return "info";
  if (delta < 0) return "danger";
  return "default";
}

function formatDateTime(iso: string): string {
  return formatLondon(iso, "datetime");
}

function MeritEventRow({ event }: { event: MeritEvent }) {
  const label = SOURCE_KIND_LABELS[event.source_kind] ?? event.source_kind;
  const sign = event.delta >= 0 ? "+" : "";

  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-base-border last:border-0">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-base-text">{label}</span>
        {event.note && (
          <span className="text-xs text-base-text-muted truncate">{event.note}</span>
        )}
        <span className="text-xs text-base-text-subtle">{formatDateTime(event.created_at)}</span>
      </div>
      <Badge variant={deltaVariant(event.delta)} className="shrink-0 tabular-nums">
        {sign}{event.delta} pts
      </Badge>
    </div>
  );
}

export function SubMeritsTab({ subId }: Props) {
  const { data: events = [], isLoading, isError, error } = useQuery({
    queryKey: queryKeys.meritEvents.forSub(subId),
    queryFn: () => listSubMeritEvents(subId),
    enabled: Boolean(subId),
  });

  if (isLoading) {
    return <ListSkeleton rows={5} />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load merit events"
        message={(error as Error | undefined)?.message}
      />
    );
  }

  const balance = events.reduce((sum, e) => sum + e.delta, 0);

  if (events.length === 0) {
    return <EmptyState title="No merit events" message="No points have been credited or debited yet." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-base-surface border border-base-border rounded-lg p-4 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-base-text-muted">Current balance</span>
        <span
          role="status"
          aria-label={`Merit balance: ${balance} points`}
          className={`text-xl font-bold tabular-nums ${balance >= 0 ? "text-status-success" : "text-status-danger"}`}
        >
          {balance >= 0 ? "+" : ""}{balance} pts
        </span>
      </div>

      <div className="bg-base-surface border border-base-border rounded-lg px-4">
        {events.map((event) => (
          <MeritEventRow key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
