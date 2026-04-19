import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  listSubDebtsApi,
  type DebtContractOut,
  type DebtContractStatus,
} from "@/services/debtContracts/debtContractsApi";
import { ContractStatusChip } from "@/components/contracts/ContractStatusChip";
import { formatGBP } from "@/services/format/currency";
import { formatLondon } from "@/services/format/datetime";
import { queryKeys } from "@/lib/queryKeys";
import {
  LedgerSection,
  LedgerEmpty,
  LedgerError,
  LedgerLoading,
} from "@/components/ledger/LedgerSection";

const OPEN_STATUSES: ReadonlySet<DebtContractStatus> = new Set<DebtContractStatus>([
  "pending_sub",
  "pending_dom",
  "pending_dom_counter",
  "pending_sub_signature",
  "active",
]);

interface Summary {
  openCount: number;
  closedCount: number;
  totalPrincipal: number;
  totalPaid: number;
  totalRemaining: number;
}

function summarise(contracts: DebtContractOut[]): Summary {
  let openCount = 0;
  let closedCount = 0;
  let totalPrincipal = 0;
  let totalPaid = 0;
  let totalRemaining = 0;
  for (const c of contracts) {
    if (OPEN_STATUSES.has(c.status)) openCount += 1;
    else closedCount += 1;
    totalPrincipal += Number(c.principal);
    totalPaid += Number(c.total_paid);
    totalRemaining += Number(c.remaining);
  }
  return { openCount, closedCount, totalPrincipal, totalPaid, totalRemaining };
}

function ContractRow({ contract }: { contract: DebtContractOut }) {
  return (
    <li className="py-2 border-b border-base-border/40 last:border-b-0">
      <Link
        to={`/debts/${contract.slug}`}
        className="flex flex-col gap-1 hover:bg-base-surface-raised rounded p-2 -mx-2 focus-visible:ring-2 focus-visible:ring-pink-primary"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm text-base-text font-semibold">
            {formatGBP(contract.principal)} principal
          </span>
          <ContractStatusChip status={contract.status} />
        </div>
        <div className="flex items-center gap-3 text-xs text-base-text-muted flex-wrap">
          <span>Balance {formatGBP(contract.balance)}</span>
          <span>·</span>
          <span>{contract.progress_pct.toFixed(1)}% paid down</span>
          {contract.signed_at && (
            <>
              <span>·</span>
              <span>Signed {formatLondon(contract.signed_at, "date")}</span>
            </>
          )}
        </div>
      </Link>
    </li>
  );
}

export function ContractsSection() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.sub.contracts(),
    queryFn: listSubDebtsApi,
  });

  const contracts = data ?? [];
  const summary = summarise(contracts);
  const mostRecent = contracts
    .map((c) => c.updated_at)
    .filter((v): v is string => Boolean(v))
    .sort()
    .pop();

  return (
    <LedgerSection title="Contracts" updatedAt={mostRecent}>
      {isLoading && <LedgerLoading />}
      {isError && <LedgerError message={(error as Error | undefined)?.message} />}
      {!isLoading && !isError && contracts.length === 0 && (
        <LedgerEmpty message="No contracts on file." />
      )}
      {contracts.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-base-surface-raised border border-base-border rounded p-2">
              <p className="text-base-text-muted uppercase tracking-wide">Open</p>
              <p className="text-base-text font-semibold text-sm">{summary.openCount}</p>
            </div>
            <div className="bg-base-surface-raised border border-base-border rounded p-2">
              <p className="text-base-text-muted uppercase tracking-wide">Closed</p>
              <p className="text-base-text font-semibold text-sm">{summary.closedCount}</p>
            </div>
            <div className="bg-base-surface-raised border border-base-border rounded p-2">
              <p className="text-base-text-muted uppercase tracking-wide">Total paid</p>
              <p className="text-base-text font-semibold text-sm">{formatGBP(summary.totalPaid)}</p>
            </div>
            <div className="bg-base-surface-raised border border-base-border rounded p-2">
              <p className="text-base-text-muted uppercase tracking-wide">Remaining</p>
              <p className="text-base-text font-semibold text-sm">
                {formatGBP(summary.totalRemaining)}
              </p>
            </div>
          </div>

          <ul className="flex flex-col">
            {contracts.map((c) => (
              <ContractRow key={c.id} contract={c} />
            ))}
          </ul>
        </div>
      )}
    </LedgerSection>
  );
}
