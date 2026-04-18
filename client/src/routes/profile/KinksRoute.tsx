import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KinkMatrix } from "@/components/kinks/KinkMatrix";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/button";
import { getKinkMatrix, updateKinkRating, kinksKey } from "@/services/kinks/kinksApi";
import type { KinkMatrix as KinkMatrixType, KinkRating } from "@/services/kinks/kinksApi";

export function KinksRoute() {
  const queryClient = useQueryClient();
  const [pendingItemIds, setPendingItemIds] = useState<Set<string>>(new Set());
  const [recentlyUpdatedAt, setRecentlyUpdatedAt] = useState<Map<string, number>>(new Map());
  const [showOnlyUnrated, setShowOnlyUnrated] = useState(false);

  const {
    data: matrix,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: kinksKey,
    queryFn: getKinkMatrix,
  });

  const mutation = useMutation({
    mutationFn: ({ itemId, rating }: { itemId: string; rating: KinkRating }) =>
      updateKinkRating(itemId, rating),

    onMutate: async ({ itemId, rating }) => {
      setPendingItemIds((prev) => new Set(prev).add(itemId));
      await queryClient.cancelQueries({ queryKey: kinksKey });
      const snapshot = queryClient.getQueryData<KinkMatrixType>(kinksKey);

      queryClient.setQueryData<KinkMatrixType>(kinksKey, (old) => {
        if (!old) return old;
        return {
          categories: old.categories.map((cat) => ({
            ...cat,
            items: cat.items.map((item) => (item.id === itemId ? { ...item, rating } : item)),
          })),
        };
      });

      return { snapshot, itemId };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        queryClient.setQueryData<KinkMatrixType>(kinksKey, ctx.snapshot);
      }
      toast.error("Failed to update rating. Please try again.");
    },

    onSuccess: (result) => {
      queryClient.setQueryData<KinkMatrixType>(kinksKey, (old) => {
        if (!old) return old;
        return {
          categories: old.categories.map((cat) => ({
            ...cat,
            items: cat.items.map((item) =>
              item.id === result.item_id
                ? { ...item, rating: result.rating, needs_confirmation: result.needs_confirmation }
                : item,
            ),
          })),
        };
      });
      setRecentlyUpdatedAt((prev) => new Map(prev).set(result.item_id, Date.now()));
    },

    onSettled: (_data, _err, vars) => {
      setPendingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(vars.itemId);
        return next;
      });
    },
  });

  function handleRatingChange(itemId: string, rating: KinkRating) {
    mutation.mutate({ itemId, rating });
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Kink matrix
          </h1>
          <p className="text-sm text-base-text-muted mt-1">
            Set your ratings for each kink. Items marked with a warning icon are safety-critical and
            require your acknowledgement.
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
          <input
            type="checkbox"
            checked={showOnlyUnrated}
            onChange={(e) => setShowOnlyUnrated(e.target.checked)}
            className="accent-pink-primary h-4 w-4"
            aria-label="Show only unrated"
          />
          <span className="text-sm text-base-text">Show only unrated</span>
        </label>

        {isLoading && <ListSkeleton rows={5} />}

        {isError && (
          <ErrorState
            title="Failed to load kink matrix"
            message={error instanceof Error ? error.message : "An unexpected error occurred."}
            cta={
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            }
          />
        )}

        {matrix && (
          <KinkMatrix
            matrix={matrix}
            onRatingChange={handleRatingChange}
            pendingItemIds={pendingItemIds}
            recentlyUpdatedAt={recentlyUpdatedAt}
            showOnlyUnrated={showOnlyUnrated}
          />
        )}
      </div>
    </div>
  );
}
