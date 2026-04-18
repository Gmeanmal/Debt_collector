import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ContractStatusChip } from "@/components/contracts/ContractStatusChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import {
  listSubDebtsApi,
  type DebtContractOut,
  type PaymentFrequency,
} from "@/services/debtContracts/debtContractsApi";
import { queryKeys } from "@/lib/queryKeys";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London" });
}

function fmtGbp(v: string): string {
  return `£${parseFloat(v).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PERIOD_DAYS: Record<PaymentFrequency, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

function computeBehindInfo(c: DebtContractOut): { amount: number; periods: number } | null {
  if (c.on_track || c.status !== "active" || !c.signed_at) return null;
  const periodMs = PERIOD_DAYS[c.payment_frequency] * 86400 * 1000;
  const elapsed = Date.now() - new Date(c.signed_at).getTime();
  const periodsElapsed = Math.floor(elapsed / periodMs);
  const expectedPaid = periodsElapsed * parseFloat(c.minimum_payment);
  const actualPaid = parseFloat(c.total_paid);
  const amountBehind = Math.max(0, expectedPaid - actualPaid);
  const periodsBehind = Math.max(0, periodsElapsed - c.payment_count);
  return { amount: amountBehind, periods: periodsBehind };
}

function StatusCell({ contract }: { contract: DebtContractOut }) {
  const behind = computeBehindInfo(contract);
  if (!behind || behind.periods === 0) {
    return <ContractStatusChip status={contract.status} />;
  }
  return (
    <div className="flex flex-col gap-0.5">
      <ContractStatusChip status={contract.status} />
      <span className="text-xs text-status-danger font-semibold">
        Behind · {fmtGbp(behind.amount.toFixed(2))} · {behind.periods} period{behind.periods !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

export function SubContractsRoute() {
  const {
    data: contracts = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.sub.contracts(),
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
          <div className="bg-base-surface border border-base-border rounded-lg overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
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
                      <StatusCell contract={c} />
                    </td>
                    <td className="px-4 py-3 text-base-text-muted text-xs">
                      {fmtDate(c.updated_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/debts/${c.slug ?? c.id}`}
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
