import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listPendingPaymentsApi,
  rejectDeclarationApi,
  validateDeclarationApi,
  type PaymentCategory,
  type PaymentOut,
} from "@/services/payments/paymentsApi";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { RejectModal } from "@/components/shared/RejectModal";
import { PendingValidationRow } from "@/components/payments/PendingValidationRow";
import {
  PendingValidationsBulkBar,
  PendingValidationsSelectAll,
} from "@/components/payments/PendingValidationsBulkBar";
import { ProofLightbox } from "@/components/payments/ProofLightbox";
import { queryKeys } from "@/lib/queryKeys";
import { formatGBP } from "@/services/format/currency";

interface RejectPanelProps {
  decl: PaymentOut;
  onClose: () => void;
}

function RejectPanel({ decl, onClose }: RejectPanelProps) {
  const qc = useQueryClient();

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectDeclarationApi(decl.id, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.goddess.pendingPayments() });
      onClose();
    },
  });

  const description = `${formatGBP(decl.amount)} — ${decl.sub_display_name ?? "sub"}`;

  return (
    <RejectModal
      title="Reject declaration"
      description={description}
      onClose={onClose}
      onConfirm={(reason) => rejectMutation.mutateAsync(reason)}
    />
  );
}

function extractMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

export function PendingValidationsRoute() {
  const qc = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<PaymentOut | null>(null);
  const [lightboxTarget, setLightboxTarget] = useState<PaymentOut | null>(null);
  const [recategoryByRow, setRecategoryByRow] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkPending, setBulkPending] = useState(false);

  const {
    data: pending = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.goddess.pendingPayments(),
    queryFn: listPendingPaymentsApi,
  });

  const validateMutation = useMutation({
    mutationFn: ({ id, cat }: { id: string; cat: string }) =>
      validateDeclarationApi(id, {
        recategorize_to: cat ? (cat as PaymentCategory) : undefined,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.goddess.pendingPayments() }),
  });

  const pendingIds = useMemo(() => pending.map((p) => p.id), [pending]);
  const selectedValidIds = useMemo(
    () => pendingIds.filter((id) => selectedIds.has(id)),
    [pendingIds, selectedIds],
  );
  const selectedCount = selectedValidIds.length;
  const allSelected = pending.length > 0 && selectedCount === pending.length;
  const someSelected = selectedCount > 0;

  function setRecategory(id: string, val: string) {
    setRecategoryByRow((prev) => ({ ...prev, [id]: val }));
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(next: boolean) {
    if (next) setSelectedIds(new Set(pendingIds));
    else setSelectedIds(new Set());
  }

  async function handleBulkValidate() {
    if (selectedCount === 0 || bulkPending) return;
    setBulkPending(true);
    setBulkError(null);
    const ids = [...selectedValidIds];
    const results = await Promise.allSettled(ids.map((id) => validateDeclarationApi(id, {})));
    const failures = results.flatMap((r, idx) =>
      r.status === "rejected" ? [{ id: ids[idx]!, reason: extractMessage(r.reason) }] : [],
    );
    qc.invalidateQueries({ queryKey: queryKeys.goddess.pendingPayments() });
    setSelectedIds(new Set());
    if (failures.length > 0) {
      const firstReason = failures[0]!.reason;
      setBulkError(`${failures.length} of ${ids.length} validations failed: ${firstReason}`);
    }
    setBulkPending(false);
  }

  function handleOpenProof(declaration: PaymentOut) {
    if (!declaration.proof_presigned_url) return;
    setLightboxTarget(declaration);
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
          Pending Validations
        </h1>

        {isLoading && <ListSkeleton rows={3} />}
        {isError && (
          <ErrorState
            title="Failed to load pending payments"
            message={(error as Error | undefined)?.message}
          />
        )}

        {!isLoading && !isError && pending.length === 0 && (
          <EmptyState
            title="No pending declarations"
            message="When subs declare payments, they will appear here for you to approve."
          />
        )}

        {bulkError && <ErrorState title="Bulk validation incomplete" message={bulkError} />}

        {validateMutation.isError && (
          <ErrorState
            title="Validation failed"
            message={(validateMutation.error as Error | undefined)?.message ?? "Validation failed"}
          />
        )}

        {pending.length > 0 && (
          <PendingValidationsSelectAll
            allSelected={allSelected}
            someSelected={someSelected}
            onToggleAll={toggleAll}
            totalCount={pending.length}
            selectedCount={selectedCount}
          />
        )}

        <div className="flex flex-col gap-3">
          {pending.map((p) => (
            <PendingValidationRow
              key={p.id}
              declaration={p}
              selected={selectedIds.has(p.id)}
              onToggleSelect={toggleRow}
              recategoriseValue={recategoryByRow[p.id] ?? ""}
              onRecategoriseChange={setRecategory}
              onValidate={(id) => validateMutation.mutate({ id, cat: recategoryByRow[id] ?? "" })}
              onReject={setRejectTarget}
              onOpenProof={handleOpenProof}
              validateDisabled={validateMutation.isPending || bulkPending}
            />
          ))}
        </div>
      </div>

      <PendingValidationsBulkBar
        selectedCount={selectedCount}
        onValidateSelected={() => {
          void handleBulkValidate();
        }}
        isPending={bulkPending}
      />

      {rejectTarget && <RejectPanel decl={rejectTarget} onClose={() => setRejectTarget(null)} />}

      {lightboxTarget?.proof_presigned_url && (
        <ProofLightbox
          src={lightboxTarget.proof_presigned_url}
          alt={`Payment proof for ${lightboxTarget.sub_display_name ?? "sub"}'s ${formatGBP(lightboxTarget.amount)} declaration`}
          onClose={() => setLightboxTarget(null)}
        />
      )}
    </div>
  );
}
