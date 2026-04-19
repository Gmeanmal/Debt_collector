import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ContractStatusChip } from "@/components/contracts/ContractStatusChip";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import {
  listGoddessDebtsApi,
  type DebtContractOut,
  type PaymentFrequency,
} from "@/services/debtContracts/debtContractsApi";
import { queryKeys } from "@/lib/queryKeys";
import { formatLondon } from "@/services/format/datetime";
import { formatGBP } from "@/services/format/currency";

interface Props {
  subId: string;
  username: string;
}

function fmtGbp(v: string): string {
  return formatGBP(v);
}

function fmtDate(iso: string): string {
  return formatLondon(iso, "datetime");
}

// Approximate monthly multiplier for each frequency
const MONTHLY_MULTIPLIER: Record<PaymentFrequency, number> = {
  monthly: 1,
  biweekly: 26 / 12,
  weekly: 52 / 12,
};

function deriveMonthly(c: DebtContractOut): string {
  const base = parseFloat(c.minimum_payment);
  const mult = MONTHLY_MULTIPLIER[c.payment_frequency];
  return fmtGbp((base * mult).toFixed(2));
}

function deriveRate(c: DebtContractOut): string {
  const rate = parseFloat(c.interest_rate) * 100;
  return isNaN(rate) ? "—" : `${rate.toFixed(2)}%`;
}

export function SubContractsTab({ subId, username }: Props) {
  const {
    data: contracts = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.goddess.contractsList({ sub_id: subId }),
    queryFn: () => listGoddessDebtsApi({ sub_id: subId }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button variant="primary" size="sm" asChild>
          <Link to={`/goddess/subs/${username}/debts/new`}>New contract</Link>
        </Button>
      </div>

      {isLoading && <ListSkeleton rows={3} />}
      {isError && (
        <ErrorState
          title="Failed to load contracts"
          message={(error as Error | undefined)?.message}
        />
      )}

      {!isLoading && !isError && contracts.length === 0 && (
        <p className="text-text-mute text-sm italic">No contracts for this sub yet.</p>
      )}

      {contracts.length > 0 && (
        <div className="bg-bg-elev border border-line rounded-[10px] overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-line bg-bg-inset text-left">
                <th className="px-4 py-3 text-xs font-mono font-medium text-text-faint uppercase tracking-[0.10em]">
                  Principal
                </th>
                <th className="px-4 py-3 text-xs font-mono font-medium text-text-faint uppercase tracking-[0.10em]">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-mono font-medium text-text-faint uppercase tracking-[0.10em]">
                  Monthly
                </th>
                <th className="px-4 py-3 text-xs font-mono font-medium text-text-faint uppercase tracking-[0.10em]">
                  Rate
                </th>
                <th className="px-4 py-3 text-xs font-mono font-medium text-text-faint uppercase tracking-[0.10em]">
                  Updated
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-bg-inset transition-colors">
                  <td className="px-4 py-3 font-mono tabular-nums text-text">{fmtGbp(c.principal)}</td>
                  <td className="px-4 py-3">
                    <ContractStatusChip status={c.status} />
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-text">
                    {c.status === "active" ? deriveMonthly(c) : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-text">{deriveRate(c)}</td>
                  <td className="px-4 py-3 text-text-faint text-xs">
                    {fmtDate(c.updated_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/debts/${c.slug ?? c.id}`}>View</Link>
                    </Button>
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
