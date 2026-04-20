import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listGoddessSubToys,
  createToyForSub,
  updateToy,
  deleteToy,
  goddessSubToysKey,
} from "@/services/toys/toysApi";
import type { ToyCreateInput, ToyItem, ToyUpdateInput } from "@/services/toys/toysApi";
import { getSubByUsernameApi } from "@/services/payments/paymentsApi";
import { InventoryGrid } from "@/components/toys/InventoryGrid";
import { ToyForm } from "@/components/toys/ToyForm";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { queryKeys } from "@/lib/queryKeys";

type FormMode = "add" | "edit";

interface FormState {
  mode: FormMode;
  toy?: ToyItem;
}

export function GoddessInventoryRoute() {
  const { username } = useParams<{ username: string }>();
  const safeUsername = username ?? "";
  const qc = useQueryClient();

  const [formState, setFormState] = useState<FormState | null>(null);
  const [deleteErrorId, setDeleteErrorId] = useState<string | null>(null);

  const { data: sub } = useQuery({
    queryKey: queryKeys.goddess.subByUsername(safeUsername),
    queryFn: () => getSubByUsernameApi(safeUsername),
    enabled: Boolean(safeUsername),
  });

  const safeSubId = sub?.id ?? "";

  const toysKey = goddessSubToysKey(safeSubId);

  const {
    data: toys = [],
    isLoading,
    isError,
    error,
  } = useQuery({
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

  if (!safeUsername) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-bad-ink text-sm">No username in route.</p>
      </div>
    );
  }

  const pageTitle = sub ? (
    <span className="italic">Inventory — {sub.display_name}</span>
  ) : (
    <span className="italic">Inventory</span>
  );

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <PageHeader
          crumbs={["Home · People · Inventory"]}
          title={pageTitle}
          description={
            pendingCount > 0
              ? `${pendingCount} pending proposal${pendingCount > 1 ? "s" : ""} awaiting review`
              : undefined
          }
          actions={
            formState === null ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => setFormState({ mode: "add" })}
                aria-label="Add a new toy"
              >
                Add toy
              </Button>
            ) : undefined
          }
        />

        {formState !== null && (
          <div className="bg-bg-elev border border-line rounded-[10px] p-[18px] flex flex-col gap-2">
            <p className="text-sm font-semibold text-text">
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

        {deleteErrorId && <ErrorState title="Failed to delete toy" message="Please try again." />}

        {isLoading && <ListSkeleton rows={3} />}
        {isError && (
          <ErrorState
            title="Failed to load inventory"
            message={(error as Error | undefined)?.message}
          />
        )}

        {!isLoading && !isError && safeSubId && (
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
