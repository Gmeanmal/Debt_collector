import type { DebtContractOut } from "@/services/debtContracts/debtContractsApi";

interface Props {
  contract: DebtContractOut;
  subDisplayName: string;
}

function fmtGbp(v: string): string {
  return `£${parseFloat(v).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(fraction: string): string {
  const n = parseFloat(fraction);
  return isNaN(n) ? "—" : `${(n * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}

function humanFrequency(freq: string): string {
  const map: Record<string, string> = {
    weekly: "Weekly",
    biweekly: "Bi-weekly",
    monthly: "Monthly",
  };
  return map[freq] ?? freq;
}

interface SummaryItemProps {
  label: string;
  value: string;
}

function SummaryItem({ label, value }: SummaryItemProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-base-text-muted font-medium">
        {label}
      </span>
      <span className="text-sm font-semibold text-base-text" role="status">
        {value}
      </span>
    </div>
  );
}

export function ContractHeaderSummary({ contract, subDisplayName }: Props) {
  const totalOwed = fmtGbp(
    String(parseFloat(contract.minimum_payment) * contract.duration_periods),
  );

  return (
    <div className="bg-base-surface border border-base-border rounded-lg p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h2 className="text-xs uppercase tracking-wide text-base-text-muted font-medium mb-1">
            Contract preview
          </h2>
          <p className="text-lg font-semibold text-base-text">{subDisplayName}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-xs text-base-text-muted">Principal</span>
          <span className="text-2xl font-bold text-pink-primary" role="status">
            {fmtGbp(contract.principal)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryItem label="Duration" value={`${contract.duration_periods} periods`} />
        <SummaryItem label="Frequency" value={humanFrequency(contract.payment_frequency)} />
        <SummaryItem
          label={`Interest (${contract.interest_period})`}
          value={fmtPct(contract.interest_rate)}
        />
        <SummaryItem label="Min. payment" value={fmtGbp(contract.minimum_payment)} />
        <SummaryItem label="Total owed" value={totalOwed} />
      </div>
    </div>
  );
}
