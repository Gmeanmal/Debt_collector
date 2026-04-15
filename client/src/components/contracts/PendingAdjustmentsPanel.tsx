import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  acceptAdjustmentApi,
  listPendingAdjustmentsApi,
  refuseAdjustmentApi,
  type ContractAdjustmentOut,
} from "@/services/debtContracts/debtContractsApi";
import { queryKeys } from "@/lib/queryKeys";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";

function fmtGbp(v: string): string {
  return `£${parseFloat(v).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London" });
}

export function PendingAdjustmentsPanel() {
  const qc = useQueryClient();
  const {
    data: items = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.contracts.pendingAdjustments(),
    queryFn: listPendingAdjustmentsApi,
  });

  const accept = useMutation({
    mutationFn: (id: string) => acceptAdjustmentApi(id),
    onSuccess: (adj: ContractAdjustmentOut) => {
      qc.invalidateQueries({ queryKey: queryKeys.contracts.pendingAdjustments() });
      qc.invalidateQueries({ queryKey: queryKeys.contracts.detail(adj.contract_id) });
      qc.invalidateQueries({ queryKey: queryKeys.contracts.audit(adj.contract_id) });
    },
  });

  const refuse = useMutation({
    mutationFn: (id: string) => refuseAdjustmentApi(id),
    onSuccess: (adj: ContractAdjustmentOut) => {
      qc.invalidateQueries({ queryKey: queryKeys.contracts.pendingAdjustments() });
      qc.invalidateQueries({ queryKey: queryKeys.contracts.detail(adj.contract_id) });
    },
  });

  if (isLoading) return <ListSkeleton rows={2} />;
  if (isError)
    return (
      <ErrorState
        title="Failed to load pending adjustments"
        message={(error as Error | undefined)?.message}
      />
    );
  if (items.length === 0)
    return (
      <EmptyState
        title="Nothing to approve"
        message="Adjustments proposed by your Goddess will show up here."
      />
    );

  return (
    <div className="flex flex-col gap-3">
      {items.map((adj) => (
        <div
          key={adj.id}
          className="bg-base-surface border border-base-border rounded-lg p-4 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-semibold text-base-text text-sm">{fmtGbp(adj.amount)}</p>
              <p className="text-xs text-base-text-muted mt-0.5">
                Proposed {fmtDate(adj.created_at)} ·{" "}
                <Link
                  to={`/debts/${adj.contract_id}`}
                  className="text-pink-primary hover:underline"
                >
                  view contract
                </Link>
              </p>
              {adj.reason && (
                <p className="text-xs text-base-text-subtle italic mt-1">{adj.reason}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => accept.mutate(adj.id)}
                disabled={accept.isPending}
                className="px-3 py-1 text-xs bg-status-success/20 text-status-success border border-status-success/30 rounded font-semibold hover:bg-status-success/30 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-status-success"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => refuse.mutate(adj.id)}
                disabled={refuse.isPending}
                className="px-3 py-1 text-xs bg-debt-muted text-status-danger border border-debt-ring rounded font-semibold hover:bg-debt-primary/20 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-debt-primary"
              >
                Refuse
              </button>
            </div>
          </div>
          {(accept.isError || refuse.isError) && (
            <p className="text-xs text-status-danger">
              {((accept.error ?? refuse.error) as Error | undefined)?.message ?? "Action failed"}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
