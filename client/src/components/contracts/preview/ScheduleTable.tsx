import type {
  DebtSimulationPeriod,
  DebtContractOut,
} from "@/services/debtContracts/debtContractsApi";

interface Props {
  periods: DebtSimulationPeriod[];
  contract: DebtContractOut;
}

function fmtGbp(v: string | number): string {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

  return d.toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ScheduleTable({ periods, contract }: Props) {
  return (
    <div className="bg-base-surface border border-base-border rounded-lg overflow-x-auto">
      <div className="px-5 py-4 border-b border-base-border">
        <h2 className="text-sm font-semibold text-base-text">Repayment schedule</h2>
        <p className="text-xs text-base-text-muted mt-0.5">
          Projected assuming minimum payments, no late penalties.
        </p>
      </div>
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-base-border bg-base-surface-raised text-left">
            <th className="px-4 py-3 text-xs font-semibold text-base-text-muted uppercase tracking-wide">
              #
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-base-text-muted uppercase tracking-wide">
              Due date
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-base-text-muted uppercase tracking-wide text-right">
              Amount due
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-base-text-muted uppercase tracking-wide text-right">
              Balance after
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-base-border">
          {periods.map((p) => (
            <tr key={p.period} className="hover:bg-base-surface-raised transition-colors">
              <td className="px-4 py-2.5 text-base-text-muted tabular-nums">{p.period}</td>
              <td className="px-4 py-2.5 text-base-text">{periodDueDate(contract, p.period)}</td>
              <td className="px-4 py-2.5 text-base-text text-right tabular-nums">
                {fmtGbp(p.payment)}
              </td>
              <td
                className={`px-4 py-2.5 text-right tabular-nums font-semibold ${
                  parseFloat(p.balance_end) <= 0 ? "text-status-success" : "text-base-text"
                }`}
              >
                {fmtGbp(Math.max(0, parseFloat(p.balance_end)))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
