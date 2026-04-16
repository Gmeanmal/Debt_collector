import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listSubToys,
  proposeToy,
  subToysKey,
} from "@/services/toys/toysApi";
import type { ToyCreateInput } from "@/services/toys/toysApi";
import { InventoryGrid } from "@/components/toys/InventoryGrid";
import { ToyForm } from "@/components/toys/ToyForm";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";

export function InventoryRoute() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: toys = [], isLoading, isError, error } = useQuery({
    queryKey: subToysKey,
    queryFn: listSubToys,
  });

  const proposeMutation = useMutation({
    mutationFn: (input: ToyCreateInput) => proposeToy(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: subToysKey });
      setShowForm(false);
    },
  });

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
              My Inventory
            </h1>
            <p className="text-sm text-base-text-muted mt-1">
              Toys approved by your goddess. Propose a new item for review below.
            </p>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              aria-label="Propose a new toy"
              className="px-4 py-2 text-sm bg-pink-primary text-pink-foreground font-semibold rounded-md hover:bg-pink-primary-hover transition-colors focus-visible:ring-2 focus-visible:ring-pink-primary shrink-0"
            >
              Propose toy
            </button>
          )}
        </div>

        {showForm && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-base-text">Propose a toy</p>
            <p className="text-xs text-base-text-muted">
              Your proposal will be visible in your inventory once your goddess approves it.
            </p>
            <ToyForm
              isPending={proposeMutation.isPending}
              isError={proposeMutation.isError}
              submitLabel="Submit proposal"
              onSubmit={(input) => proposeMutation.mutate(input)}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {isLoading && <ListSkeleton rows={3} />}
        {isError && (
          <ErrorState
            title="Failed to load inventory"
            message={(error as Error | undefined)?.message}
          />
        )}

        {!isLoading && !isError && (
          <InventoryGrid toys={toys} goddessContext={false} />
        )}
      </div>
    </div>
  );
}
