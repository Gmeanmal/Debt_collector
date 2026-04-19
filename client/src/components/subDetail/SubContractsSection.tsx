import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ContractStatusChip } from "@/components/contracts/ContractStatusChip";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { listGoddessDebtsApi } from "@/services/debtContracts/debtContractsApi";
import { queryKeys } from "@/lib/queryKeys";
import { formatGBP } from "@/services/format/currency";

interface Props {
  subId: string;
  username: string;
}

export function SubContractsSection({ subId, username }: Props) {
  const {
    data: all = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.goddess.contracts(),
    queryFn: () => listGoddessDebtsApi(),
  });

  const contracts = all.filter((c) => c.sub_id === subId);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-pink-primary">Contracts</h2>
        <Link
          to={`/goddess/subs/${username}/debts/new`}
          className="text-xs text-pink-primary hover:text-pink-primary-hover underline focus-visible:ring-2 focus-visible:ring-pink-primary rounded"
        >
          New contract
        </Link>
      </div>
      {isLoading && <ListSkeleton rows={2} />}
      {isError && (
        <ErrorState
          title="Failed to load contracts"
          message={(error as Error | undefined)?.message}
        />
      )}
      {!isLoading && !isError && contracts.length === 0 && (
        <p className="text-base-text-muted text-sm italic">No contracts for this sub yet.</p>
      )}
      <div className="flex flex-col gap-2">
        {contracts.map((c) => (
          <Link
            key={c.id}
            to={`/debts/${c.slug ?? c.id}`}
            className="bg-base-surface border border-base-border rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap hover:border-pink-primary transition-colors focus-visible:ring-2 focus-visible:ring-pink-primary"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-base-text">
                Principal {formatGBP(c.principal)}
              </span>
              <span className="text-xs text-base-text-muted">
                Min payment {formatGBP(c.minimum_payment)} · {c.payment_frequency}
              </span>
            </div>
            <ContractStatusChip status={c.status} />
          </Link>
        ))}
      </div>
    </section>
  );
}
