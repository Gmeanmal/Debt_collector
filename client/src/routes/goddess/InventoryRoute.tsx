import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listGoddessSubToys,
  createToyForSub,
  updateToy,
  deleteToy,
  goddessSubToysKey,
} from "@/services/toys/toysApi";
import type { ToyCreateInput, ToyItem, ToyUpdateInput } from "@/services/toys/toysApi";
import { listGoddessSubsApi } from "@/services/payments/paymentsApi";
import { InventoryGrid } from "@/components/toys/InventoryGrid";
import { ToyForm } from "@/components/toys/ToyForm";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { queryKeys } from "@/lib/queryKeys";

type FormMode = "add" | "edit";

interface FormState {
  mode: FormMode;
  toy?: ToyItem;
}

export function GoddessInventoryRoute() {
  const { subId } = useParams<{ subId: string }>();
  const safeSubId = subId ?? "";
  const qc = useQueryClient();

  const [formState, setFormState] = useState<FormState | null>(null);
  const [deleteErrorId, setDeleteErrorId] = useState<string | null>(null);

  const { data: subs = [] } = useQuery({
    queryKey: queryKeys.goddess.subs(),
    queryFn: listGoddessSubsApi,
    enabled: Boolean(safeSubId),
  });

  const sub = subs.find((s) => s.id === safeSubId);

  const toysKey = goddessSubToysKey(safeSubId);

  const { data: toys = [], isLoading, isError, error } = useQuery({
    queryKey: toysKey,
    queryFn: () => listGoddessSubToys(safeSubId),
    enabled: Boolean(safeSubId),
  });

  const createMutation = useMutation({
    mutationFn: (input: ToyCreateInput) => createToyForSub(safeSubId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: toysKey });
      setFormState(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ toyId, input }: { toyId: string; input: ToyUpdateInput }) =>
      updateToy(toyId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: toysKey });
      setFormState(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (toyId: string) => deleteToy(toyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: toysKey });
      setDeleteErrorId(null);
    },
    onError: (_err, toyId) => {
      setDeleteErrorId(toyId);
    },
  });

  function handleEdit(toy: ToyItem) {
    setFormState({ mode: "edit", toy });
  }

  function handleDelete(toyId: string) {
    setDeleteErrorId(null);
    deleteMutation.mutate(toyId);
  }

  function handleFormSubmit(input: ToyCreateInput) {
    if (formState?.mode === "add") {
      createMutation.mutate(input);
    } else if (formState?.mode === "edit" && formState.toy) {
      updateMutation.mutate({ toyId: formState.toy.id, input });
    }
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;
  const isMutationError = createMutation.isError || updateMutation.isError;

  const pendingCount = toys.filter((t) => !t.approved).length;

  if (!safeSubId) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-status-danger text-sm">No sub ID in route.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <Link
            to={`/goddess/subs/${safeSubId}`}
            className="text-xs text-base-text-muted hover:text-base-text transition-colors focus-visible:ring-2 focus-visible:ring-pink-ring rounded w-fit"
          >
            ← Sub profile
          </Link>
          <div className="flex items-start justify-between gap-3 flex-wrap mt-1">
            <div>
              <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
                Toy Inventory
                {sub && (
                  <span className="text-base-text font-medium text-lg ml-2">
                    — {sub.display_name}
                  </span>
                )}
              </h1>
              {pendingCount > 0 && (
                <p className="text-sm text-status-warning mt-1">
                  {pendingCount} pending proposal{pendingCount > 1 ? "s" : ""} awaiting review
                </p>
              )}
            </div>

            {formState === null && (
              <button
                type="button"
                onClick={() => setFormState({ mode: "add" })}
                aria-label="Add a new toy"
                className="px-4 py-2 text-sm bg-pink-primary text-pink-foreground font-semibold rounded-md hover:bg-pink-primary-hover transition-colors focus-visible:ring-2 focus-visible:ring-pink-primary shrink-0"
              >
                Add toy
              </button>
            )}
          </div>
        </div>

        {formState !== null && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-base-text">
              {formState.mode === "add" ? "Add toy" : "Edit toy"}
            </p>
            <ToyForm
              initial={formState.toy}
              isPending={isMutating}
              isError={isMutationError}
              submitLabel={formState.mode === "add" ? "Add toy" : "Save changes"}
              onSubmit={handleFormSubmit}
              onCancel={() => setFormState(null)}
            />
          </div>
        )}

        {deleteErrorId && (
          <ErrorState title="Failed to delete toy" message="Please try again." />
        )}

        {isLoading && <ListSkeleton rows={3} />}
        {isError && (
          <ErrorState
            title="Failed to load inventory"
            message={(error as Error | undefined)?.message}
          />
        )}

        {!isLoading && !isError && (
          <InventoryGrid
            toys={toys}
            goddessContext
            subId={safeSubId}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
