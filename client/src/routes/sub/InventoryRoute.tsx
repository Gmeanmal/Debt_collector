import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listSubToys, proposeToy, subToysKey } from "@/services/toys/toysApi";
import type { ToyCreateInput } from "@/services/toys/toysApi";
import { InventoryGrid } from "@/components/toys/InventoryGrid";
import { ToyForm } from "@/components/toys/ToyForm";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export function InventoryRoute() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const {
    data: toys = [],
    isLoading,
    isError,
    error,
  } = useQuery({
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
        <PageHeader
          crumbs={["Home · Profile · Inventory"]}
          title={<span className="font-serif italic">My Inventory</span>}
          description="Toys approved by your goddess. Propose a new item for review below."
          actions={
            !showForm ? (
              <Button
                type="button"
                onClick={() => setShowForm(true)}
                aria-label="Propose a new toy"
                variant="primary"
              >
                Propose toy
              </Button>
            ) : undefined
          }
        />

        {showForm && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-text">Propose a toy</p>
            <p className="text-xs text-text-mute">
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

        {!isLoading && !isError && <InventoryGrid toys={toys} goddessContext={false} />}
      </div>
    </div>
  );
}
