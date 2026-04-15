import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ContractStatusChip } from "@/components/contracts/ContractStatusChip";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { listGoddessDebtsApi } from "@/services/debtContracts/debtContractsApi";
import { queryKeys } from "@/lib/queryKeys";

interface Props {
  subId: string;
}

function fmtGbp(v: string): string {
  return `£${parseFloat(v).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London" });
}

export function SubContractsTab({ subId }: Props) {
  const {
    data: all = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.goddess.contracts(),
    queryFn: listGoddessDebtsApi,
  });

  const contracts = all.filter((c) => c.sub_id === subId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link
          to={`/goddess/subs/${subId}/debts/new`}
          className="px-3 py-1.5 text-sm bg-pink-primary text-pink-foreground font-semibold rounded hover:bg-pink-primary-hover transition-colors focus-visible:ring-2 focus-visible:ring-pink-primary"
        >
          New contract
        </Link>
      </div>

      {isLoading && <ListSkeleton rows={3} />}
      {isError && (
        <ErrorState
          title="Failed to load contracts"
          message={(error as Error | undefined)?.message}
        />
      )}

      {!isLoading && !isError && contracts.length === 0 && (
        <p className="text-base-text-muted text-sm italic">No contracts for this sub yet.</p>
      )}

      {contracts.length > 0 && (
        <div className="bg-base-surface border border-base-border rounded-lg overflow-x-auto">
          <table className="w-full min-w-[400px] text-sm">
            <thead>
              <tr className="border-b border-base-border bg-base-surface-raised text-left">
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
  );
}
