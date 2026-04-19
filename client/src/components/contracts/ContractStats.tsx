import type { DebtContractOut } from "@/services/debtContracts/debtContractsApi";
import { formatLondon } from "@/services/format/datetime";
import { formatGBP } from "@/services/format/currency";

function setProgressVar(node: HTMLElement | null, pct: number) {
  node?.style.setProperty("--progress", `${pct}%`);
}

interface Props {
  contract: DebtContractOut;
}

function fmtGbp(v: string): string {
  return formatGBP(v);
}

function fmtDate(iso: string): string {
  return formatLondon(iso, "datetime");
}

interface KpiProps {
  label: string;
  value: string;
}

function Kpi({ label, value }: KpiProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-text-faint">{label}</span>
      <span className="text-sm font-semibold text-text" role="status">
        {value}
      </span>
    </div>
  );
}

export function ContractStats({ contract }: Props) {
  const pct = Math.min(100, Math.max(0, contract.progress_pct));

  return (
    <div className="bg-bg-elev border border-line rounded-[10px] p-[18px] flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-text">Payment stats</h2>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-text-faint">
          <span>Progress</span>
          <span>{pct.toFixed(1)}%</span>
        </div>
        <div className="h-2 rounded-full bg-bg-sunken overflow-hidden">
          <div
            ref={(node) => setProgressVar(node, pct)}
            className="h-full rounded-full bg-accent w-[var(--progress)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        <Kpi label="Total paid" value={fmtGbp(contract.total_paid)} />
        <Kpi label="Total due" value={fmtGbp(contract.total_due)} />
        <Kpi label="Remaining" value={fmtGbp(contract.remaining)} />
        <Kpi label="Payments made" value={String(contract.payment_count)} />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-text-faint">On track</span>
          <span
            role="status"
            className={`text-sm font-semibold ${
              contract.on_track ? "text-ok-ink" : "text-bad-ink"
            }`}
          >
            {contract.on_track ? "Yes" : "Behind"}
          </span>
        </div>
        {contract.first_payment_at && (
          <Kpi label="First payment" value={fmtDate(contract.first_payment_at)} />
        )}
        {contract.last_payment_at && (
          <Kpi label="Last payment" value={fmtDate(contract.last_payment_at)} />
        )}
      </div>
    </div>
  );
}
