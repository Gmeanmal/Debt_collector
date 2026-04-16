import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  listPhotoQueue,
  approvePhoto,
  rejectPhoto,
} from "@/services/goddessPhotos/goddessPhotosApi";
import { PhotoReviewCard } from "@/components/goddess/PhotoReviewCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";

export function PhotoQueueRoute() {
  const qc = useQueryClient();

  const {
    data: queue = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.goddessPhotos.queue(),
    queryFn: listPhotoQueue,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approvePhoto(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.goddessPhotos.queue() }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectPhoto(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.goddessPhotos.queue() }),
  });

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
          Photo Queue
        </h1>

        {isLoading && <ListSkeleton rows={3} />}

        {isError && (
          <ErrorState
            title="Failed to load photo queue"
            message={(error as Error | undefined)?.message}
          />
        )}

        {!isLoading && !isError && queue.length === 0 && (
          <EmptyState
            title="No pending photos"
            message="When subs upload profile photos they will appear here for review."
          />
        )}

        {!isLoading && !isError && queue.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {queue.map((entry) => (
              <PhotoReviewCard
                key={entry.id}
                entry={entry}
                onApprove={async () => {
                  await approveMutation.mutateAsync(entry.id);
                }}
                onReject={async (reason) => {
                  await rejectMutation.mutateAsync({ id: entry.id, reason });
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
