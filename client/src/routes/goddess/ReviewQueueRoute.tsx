import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getReviewQueue,
  submitBulkAction,
  reviewQueueKey,
} from "@/services/reviewQueue/reviewQueueApi";
import { ReviewQueueItemCard } from "@/components/reviewQueue/ReviewQueueItem";
import { BulkActionBar } from "@/components/reviewQueue/BulkActionBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";

export function ReviewQueueRoute() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [failDetails, setFailDetails] = useState<{ id: string; error: string }[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const {
    data: items = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: reviewQueueKey,
    queryFn: () => getReviewQueue({ limit: 50 }),
  });

  const bulkMutation = useMutation({
    mutationFn: submitBulkAction,
    onSuccess: (result) => {
      const s = result.succeeded.length;
      const f = result.failed.length;
      if (f === 0) {
        toast.success(`${s} item${s !== 1 ? "s" : ""} processed successfully`);
      } else {
        toast.warning(`${s} succeeded, ${f} failed`);
        setFailDetails(result.failed.map((item) => ({ id: item.id, error: item.error })));
        setDetailsOpen(false);
      }
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: reviewQueueKey });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Bulk action failed");
    },
  });

  function toggleItem(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function buildRefs() {
    return items
      .filter((item) => selected.has(item.id))
      .map((item) => ({ kind: item.kind, id: item.id }));
  }

  function handleApprove() {
    bulkMutation.mutate({ action: "approve", items: buildRefs() });
  }

  function handleReject(reason: string) {
    bulkMutation.mutate({ action: "reject", items: buildRefs(), reason });
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
          Review Queue
        </h1>

        <BulkActionBar
          selectedCount={selected.size}
          isPending={bulkMutation.isPending}
          onApprove={handleApprove}
          onReject={handleReject}
        />

        {isLoading && <ListSkeleton rows={3} />}

        {isError && (
          <ErrorState
            title="Failed to load review queue"
            message={(error as Error | undefined)?.message}
          />
        )}

        {!isLoading && !isError && items.length === 0 && (
          <EmptyState
            title="Queue is empty"
            message="No submitted rituals or tasks are awaiting review."
          />
        )}

        {failDetails.length > 0 && (
          <div className="bg-debt-muted border border-debt-ring rounded-lg p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-status-danger">
                {failDetails.length} item{failDetails.length !== 1 ? "s" : ""} failed
              </p>
              <button
                type="button"
                onClick={() => setDetailsOpen((v) => !v)}
                className="text-xs text-status-danger underline-offset-2 hover:underline"
              >
                {detailsOpen ? "Hide details" : "Show details"}
              </button>
            </div>
            {detailsOpen && (
              <ul className="text-xs text-status-danger/90 list-disc list-inside flex flex-col gap-1">
                {failDetails.map((f) => (
                  <li key={f.id}>{f.error}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <ReviewQueueItemCard
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onToggle={toggleItem}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
