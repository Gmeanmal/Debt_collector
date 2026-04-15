import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ContractStatusChip } from "@/components/contracts/ContractStatusChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { listGoddessDebtsApi } from "@/services/debtContracts/debtContractsApi";
import { listGoddessSubsApi } from "@/services/payments/paymentsApi";
import { useAuth } from "@/services/auth/useAuth";
import { queryKeys } from "@/lib/queryKeys";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London" });
}

function fmtGbp(v: string): string {
  return `£${parseFloat(v).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function GoddessContractsRoute() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const {
    data: contracts = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.goddess.contracts(),
    queryFn: listGoddessDebtsApi,
  });

  const { data: subs = [] } = useQuery({
    queryKey: queryKeys.goddess.subs(),
    queryFn: listGoddessSubsApi,
  });

  function subLabel(subId: string): string {
    const sub = subs.find((s) => s.id === subId);
    if (sub) return sub.display_name || sub.username;
    return isAdmin ? subId : `${subId.slice(0, 6)}…`;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Debt Contracts
          </h1>
          <p className="text-sm text-base-text-muted mt-1">All contracts across your subs.</p>
        </div>

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
            message="Propose a debt contract to one of your subs to get started."
          />
        )}

        {contracts.length > 0 && (
          <div className="bg-base-surface border border-base-border rounded-lg overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-base-border bg-base-surface-raised text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-base-text-muted uppercase tracking-wide">
                    Sub
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-base-text-muted uppercase tracking-wide">
                    Principal
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-base-text-muted uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-base-text-muted uppercase tracking-wide">
                    Updated
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-base-border">
                {contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-base-surface-raised transition-colors">
                    <td className="px-4 py-3 text-sm text-base-text">{subLabel(c.sub_id)}</td>
                    <td className="px-4 py-3 text-base-text">{fmtGbp(c.principal)}</td>
                    <td className="px-4 py-3">
                      <ContractStatusChip status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-base-text-muted text-xs">
                      {fmtDate(c.updated_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/debts/${c.id}`}
                        className="text-xs font-semibold text-pink-primary hover:underline focus-visible:ring-2 focus-visible:ring-pink-primary rounded"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
