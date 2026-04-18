import type {
  DebtSimulationPeriod,
  DebtContractOut,
} from "@/services/debtContracts/debtContractsApi";
import { formatLondon } from "@/services/format/datetime";
import { formatGBP } from "@/services/format/currency";

interface Props {
  beforePeriods: DebtSimulationPeriod[];
  afterPeriods: DebtSimulationPeriod[];
  contract: DebtContractOut;
}

function fmtGbp(v: string | number): string {
  return formatGBP(v);
}

function periodDueDate(contract: DebtContractOut, periodIndex: number): string {
  const base = contract.signed_at ?? contract.created_at;
  const d = new Date(base);
  const freq = contract.payment_frequency;
  if (freq === "weekly") {
    d.setDate(d.getDate() + 7 * periodIndex);
  } else if (freq === "biweekly") {
    d.setDate(d.getDate() + 14 * periodIndex);
  } else {
    d.setMonth(d.getMonth() + periodIndex);
  }
  return formatLondon(d, "date");
}

interface SideProps {
  title: string;
  periods: DebtSimulationPeriod[];
  diffs: Set<number>;
  highlight: "none" | "danger";
  contract: DebtContractOut;
}

function ScheduleSide({ title, periods, diffs, highlight, contract }: SideProps) {
  const dangerRow = "bg-status-danger/10 text-status-danger";
  const normalRow = "hover:bg-base-surface-raised transition-colors";

  return (
    <div className="flex-1 min-w-0 bg-base-surface border border-base-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-base-border">
        <h3 className="text-sm font-semibold text-base-text">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="border-b border-base-border bg-base-surface-raised text-left">
              <th className="px-3 py-2 text-[10px] font-semibold text-base-text-muted uppercase tracking-wide">
                #
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold text-base-text-muted uppercase tracking-wide">
                Due
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold text-base-text-muted uppercase tracking-wide text-right">
                Payment
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold text-base-text-muted uppercase tracking-wide text-right">
                Balance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base-border">
            {periods.map((p) => {
              const isDiff = diffs.has(p.period);
              const rowClass = isDiff && highlight === "danger" ? dangerRow : normalRow;
              return (
                <tr key={p.period} className={rowClass}>
                  <td className="px-3 py-2 tabular-nums text-base-text-muted">{p.period}</td>
                  <td className="px-3 py-2 text-base-text whitespace-nowrap">
                    {periodDueDate(contract, p.period)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtGbp(p.payment)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">
                    {fmtGbp(Math.max(0, parseFloat(p.balance_end)))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function computeDiffs(before: DebtSimulationPeriod[], after: DebtSimulationPeriod[]): Set<number> {
  const byPeriod = new Map<number, DebtSimulationPeriod>();
  for (const b of before) byPeriod.set(b.period, b);

  const diffs = new Set<number>();
  for (const a of after) {
    const b = byPeriod.get(a.period);
    if (!b) {
      diffs.add(a.period);
      continue;
    }
    if (
      parseFloat(a.payment) !== parseFloat(b.payment) ||
      parseFloat(a.balance_end) !== parseFloat(b.balance_end)
    ) {
      diffs.add(a.period);
    }
  }
  return diffs;
}

export function ScheduleComparisonTable({ beforePeriods, afterPeriods, contract }: Props) {
  const diffs = computeDiffs(beforePeriods, afterPeriods);

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <ScheduleSide
        title="Before"
        periods={beforePeriods}
        diffs={diffs}
        highlight="none"
        contract={contract}
      />
      <ScheduleSide
        title="After"
        periods={afterPeriods}
        diffs={diffs}
        highlight="danger"
        contract={contract}
      />
    </div>
  );
}
