import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ContractStatusChip } from "@/components/contracts/ContractStatusChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import {
  listSubDebtsApi,
  type DebtContractOut,
  type PaymentFrequency,
} from "@/services/debtContracts/debtContractsApi";
import { queryKeys } from "@/lib/queryKeys";
import { formatLondon } from "@/services/format/datetime";
import { formatGBP } from "@/services/format/currency";

function fmtDate(iso: string): string {
  return formatLondon(iso, "datetime");
}

function fmtGbp(v: number | string): string {
  return formatGBP(v);
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
      <span className="text-xs text-bad-ink font-semibold">
        Behind · {fmtGbp(behind.amount)} · {behind.periods} period
        {behind.periods !== 1 ? "s" : ""}
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
        <PageHeader
          crumbs={["Home · Contracts"]}
          title={<span className="font-serif italic">Your Contracts</span>}
          description="All debt contracts you are party to."
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
            message="Once your Goddess proposes a contract or you submit a proposal, it will show up here."
          />
        )}

        {contracts.length > 0 && (
          <Card className="p-0 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-line bg-bg-sunken text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-text-mute uppercase tracking-wide">
                    Principal
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-mute uppercase tracking-wide">
                    Balance
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-mute uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-mute uppercase tracking-wide">
                    Updated
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-bg-sunken transition-colors">
                    <td className="px-4 py-3 text-text">{fmtGbp(c.principal)}</td>
                    <td className="px-4 py-3 text-text">{fmtGbp(c.balance)}</td>
                    <td className="px-4 py-3">
                      <StatusCell contract={c} />
                    </td>
                    <td className="px-4 py-3 text-text-mute text-xs">{fmtDate(c.updated_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/debts/${c.slug ?? c.id}`}
                        className="text-xs font-semibold text-accent hover:underline focus-visible:ring-2 focus-visible:ring-accent rounded"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
