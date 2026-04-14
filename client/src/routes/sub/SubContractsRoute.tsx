import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ContractStatusChip } from "@/components/contracts/ContractStatusChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { listSubDebtsApi } from "@/services/debtContracts/debtContractsApi";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London" });
}

function fmtGbp(v: string): string {
  return `£${parseFloat(v).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SubContractsRoute() {
  const {
    data: contracts = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["subContracts"],
    queryFn: listSubDebtsApi,
  });

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Your Contracts
          </h1>
          <p className="text-sm text-base-text-muted mt-1">All debt contracts you are party to.</p>
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
            message="Once your Goddess proposes a contract or you submit a proposal, it will show up here."
          />
        )}

        {contracts.length > 0 && (
          <div className="bg-base-surface border border-base-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-border bg-base-surface-raised text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-base-text-muted uppercase tracking-wide">
                    Principal
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-base-text-muted uppercase tracking-wide">
                    Balance
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
                    <td className="px-4 py-3 text-base-text">{fmtGbp(c.principal)}</td>
                    <td className="px-4 py-3 text-base-text">{fmtGbp(c.balance)}</td>
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
