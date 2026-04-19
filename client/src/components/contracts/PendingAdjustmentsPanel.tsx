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
import { Button } from "@/components/ui/button";
import { formatLondon } from "@/services/format/datetime";
import { formatGBP } from "@/services/format/currency";

function fmtGbp(v: string): string {
  return formatGBP(v);
}

function fmtDate(iso: string): string {
  return formatLondon(iso, "datetime");
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
          className="bg-bg-elev border border-line rounded-[10px] p-4 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-semibold text-text text-sm">{fmtGbp(adj.amount)}</p>
              <p className="text-xs text-text-mute mt-0.5">
                Proposed {fmtDate(adj.created_at)} ·{" "}
                <Link
                  to={`/debts/${adj.contract_id}`}
                  className="text-accent hover:underline"
                >
                  view contract
                </Link>
              </p>
              {adj.reason && (
                <p className="text-xs text-text-faint italic mt-1">{adj.reason}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => accept.mutate(adj.id)}
                disabled={accept.isPending}
              >
                Accept
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => refuse.mutate(adj.id)}
                disabled={refuse.isPending}
              >
                Refuse
              </Button>
            </div>
          </div>
          {(accept.isError || refuse.isError) && (
            <p className="text-xs text-bad-ink">
              {((accept.error ?? refuse.error) as Error | undefined)?.message ?? "Action failed"}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
