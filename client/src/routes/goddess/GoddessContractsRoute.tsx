import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ContractStatusChip } from "@/components/contracts/ContractStatusChip";
import { ContractFilters } from "@/components/contracts/ContractFilters";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import {
  listGoddessDebtsApi,
  type GoddessContractFilters,
} from "@/services/debtContracts/debtContractsApi";
import { listGoddessSubsApi } from "@/services/payments/paymentsApi";
import { useAuth } from "@/services/auth/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { formatLondon } from "@/services/format/datetime";
import { formatGBP } from "@/services/format/currency";

function fmtDate(iso: string): string {
  return formatLondon(iso, "datetime");
}

function fmtGbp(v: string): string {
  return formatGBP(v);
}

const EMPTY_FILTERS: GoddessContractFilters = {};

export function GoddessContractsRoute() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [pendingFilters, setPendingFilters] = useState<GoddessContractFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<GoddessContractFilters>(EMPTY_FILTERS);

  const minVal = pendingFilters.min_amount;
  const maxVal = pendingFilters.max_amount;
  const hasAmountError = minVal !== undefined && maxVal !== undefined && minVal > maxVal;

  const {
    data: contracts = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.goddess.contractsList(appliedFilters),
    queryFn: () => listGoddessDebtsApi(appliedFilters),
  });

  const { data: subs = [] } = useQuery({
    queryKey: queryKeys.goddess.subs(),
    queryFn: listGoddessSubsApi,
  });

  function subInfo(subId: string): { displayName: string; username: string } | null {
    const sub = subs.find((s) => s.id === subId);
    if (sub) return { displayName: sub.display_name, username: sub.username };
    return null;
  }

  function subFallback(subId: string): string {
    return isAdmin ? subId : "Unknown sub";
  }

  function handleFiltersChange(f: GoddessContractFilters) {
    const min = f.min_amount;
    const max = f.max_amount;
    const invalid = min !== undefined && max !== undefined && min > max;
    if (!invalid) {
      setAppliedFilters(f);
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <PageHeader
          crumbs={["Home · People · Contracts"]}
          title={<span className="italic">Debt contracts</span>}
          description="All contracts across your subs."
        />

        <ContractFilters
          filters={pendingFilters}
          subs={subs}
          onFiltersChange={(f) => {
            setPendingFilters(f);
            handleFiltersChange(f);
          }}
        />

        {isLoading && <ListSkeleton rows={3} />}
        {isError && (
          <ErrorState
            title="Failed to load contracts"
            message={(error as Error | undefined)?.message}
          />
        )}

        {!isLoading && !isError && contracts.length === 0 && (
          <EmptyState
            title="No contracts yet"
            message={
              hasAmountError
                ? "Fix the amount filter above."
                : "Propose a debt contract to one of your subs to get started."
            }
          />
        )}

        {contracts.length > 0 && (
          <div className="bg-bg-elev border border-line rounded-[10px] overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line bg-bg-sunken text-left">
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">
                    Sub
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">
                    Principal
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">
                    Status
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">
                    Updated
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {contracts.map((c) => {
                  const info = subInfo(c.sub_id);
                  return (
                    <tr key={c.id} className="hover:bg-bg-sunken transition-colors">
                      <td className="px-4 py-3">
                        {info ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-text">{info.displayName}</span>
                            <span className="font-mono text-[11px] tracking-[0.08em] text-text-faint">
                              @{info.username}
                            </span>
                          </div>
                        ) : (
                          <span className="text-text">{subFallback(c.sub_id)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-text">
                        {fmtGbp(c.principal)}
                      </td>
                      <td className="px-4 py-3">
                        <ContractStatusChip status={c.status} />
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-text-faint">
                        {fmtDate(c.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/debts/${c.slug ?? c.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
