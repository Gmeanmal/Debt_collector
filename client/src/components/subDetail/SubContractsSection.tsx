import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ContractStatusChip } from "@/components/contracts/ContractStatusChip";
import { listGoddessDebtsApi } from "@/services/debtContracts/debtContractsApi";

interface Props {
  subId: string;
}

export function SubContractsSection({ subId }: Props) {
  const {
    data: all = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["goddessContracts"],
    queryFn: listGoddessDebtsApi,
  });

  const contracts = all.filter((c) => c.sub_id === subId);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-pink-primary">Contracts</h2>
        <Link
          to={`/goddess/subs/${subId}/debts/new`}
          className="text-xs text-pink-primary hover:text-pink-primary-hover underline focus-visible:ring-2 focus-visible:ring-pink-primary rounded"
        >
          New contract
        </Link>
      </div>
      {isLoading && <p className="text-base-text-muted text-sm">Loading…</p>}
      {isError && <p className="text-status-danger text-sm">Failed to load contracts.</p>}
      {!isLoading && !isError && contracts.length === 0 && (
        <p className="text-base-text-muted text-sm italic">No contracts for this sub.</p>
      )}
      <div className="flex flex-col gap-2">
        {contracts.map((c) => (
          <Link
            key={c.id}
            to={`/debts/${c.id}`}
            className="bg-base-surface border border-base-border rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap hover:border-pink-primary transition-colors focus-visible:ring-2 focus-visible:ring-pink-primary"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-base-text">
                Principal £{Number(c.principal).toFixed(2)}
              </span>
              <span className="text-xs text-base-text-muted">
                Min payment £{Number(c.minimum_payment).toFixed(2)} · {c.payment_frequency}
              </span>
            </div>
            <ContractStatusChip status={c.status} />
          </Link>
        ))}
      </div>
    </section>
  );
}
