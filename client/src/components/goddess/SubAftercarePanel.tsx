import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/queryKeys";
import {
  getSubAftercareForGoddess,
  goddessAftercareKey,
  markAftercareRead,
  type Aftercare,
} from "@/services/aftercare/aftercareApi";

interface Props {
  username: string;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function AftercareField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-semibold uppercase tracking-wider text-base-text-muted">
        {label}
      </dt>
      <dd className="text-sm text-base-text leading-relaxed">{value}</dd>
    </div>
  );
}

function IntensityBadge({ intensity }: { intensity: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-base-text-muted">
      Intensity
      <span className="font-bold text-pink-primary" role="status">
        {intensity}
      </span>
      <span className="text-base-text-muted">/5</span>
    </span>
  );
}

function AftercareBody({ aftercare }: { aftercare: Aftercare }) {
  const hasContent =
    aftercare.needs || aftercare.comfort_items || aftercare.contact_phrase || aftercare.notes;

  return (
    <div className="flex flex-col gap-4">
      <IntensityBadge intensity={aftercare.intensity} />

      {hasContent ? (
        <dl className="flex flex-col gap-3">
          <AftercareField label="What she needs" value={aftercare.needs} />
          <AftercareField label="Comfort items" value={aftercare.comfort_items} />
          <AftercareField label="Ready phrase" value={aftercare.contact_phrase} />
          <AftercareField label="Notes" value={aftercare.notes} />
        </dl>
      ) : (
        <p className="text-sm text-base-text-muted">No aftercare preferences saved yet.</p>
      )}
    </div>
  );
}

export function SubAftercarePanel({ username }: Props) {
  const qc = useQueryClient();
  const key = goddessAftercareKey(username);

  const { data: aftercare, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => getSubAftercareForGoddess(username),
    enabled: username.length > 0,
  });

  const markRead = useMutation({
    mutationFn: () => markAftercareRead(username),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: queryKeys.goddess.subByUsername(username) });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-base">Aftercare profile</CardTitle>
        <Button
          size="sm"
          variant="outline"
          disabled={markRead.isPending}
          onClick={() => markRead.mutate()}
          aria-label="Mark aftercare profile as read"
        >
          {markRead.isPending ? "Marking…" : "Mark as read"}
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {isLoading && (
          <div className="h-16 rounded-md bg-base-surface animate-pulse border border-base-border" />
        )}

        {!isLoading && aftercare && <AftercareBody aftercare={aftercare} />}

        {aftercare?.read_by_goddess_at && (
          <p className="text-xs text-base-text-muted mt-1">
            Goddess last read · {formatRelative(aftercare.read_by_goddess_at)}
          </p>
        )}

        {markRead.isError && (
          <p className="text-xs text-status-danger">
            {(markRead.error as Error | undefined)?.message ?? "Failed to mark as read."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
