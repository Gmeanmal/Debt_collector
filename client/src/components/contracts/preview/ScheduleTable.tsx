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
  const paidPeriods = contract.payment_count;
  const totalPayments = periods.reduce((sum, p) => sum + parseFloat(p.payment), 0);
  const totalInterest = Math.max(0, totalPayments - parseFloat(contract.principal));

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
          {periods.map((p) => {
            const isPaid = p.period <= paidPeriods;
            const rowClass = isPaid
              ? "bg-status-success/10 hover:bg-status-success/15 transition-colors"
              : "hover:bg-base-surface-raised transition-colors";
            return (
              <tr key={p.period} className={rowClass}>
                <td className="px-4 py-2.5 tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    {isPaid && (
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full bg-status-success"
                        aria-hidden="true"
                      />
                    )}
                    <span className={isPaid ? "text-status-success" : "text-base-text-muted"}>
                      {p.period}
                    </span>
                  </span>
                </td>
                <td className={`px-4 py-2.5 ${isPaid ? "text-status-success" : "text-base-text"}`}>
                  {periodDueDate(contract, p.period)}
                </td>
                <td
                  className={`px-4 py-2.5 text-right tabular-nums ${
                    isPaid ? "text-status-success" : "text-base-text"
                  }`}
                >
                  {fmtGbp(p.payment)}
                </td>
                <td
                  className={`px-4 py-2.5 text-right tabular-nums font-semibold ${
                    isPaid ? "text-status-success" : "text-base-text"
                  }`}
                >
                  {fmtGbp(Math.max(0, parseFloat(p.balance_end)))}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t-2 border-base-border bg-base-surface-raised">
          <tr>
            <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-base-text-muted uppercase tracking-wide">
              Total interest
            </td>
            <td colSpan={2} className="px-4 py-3 text-right tabular-nums font-semibold text-base-text">
              {fmtGbp(totalInterest)}
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-base-text-muted uppercase tracking-wide">
              Total to pay
            </td>
            <td colSpan={2} className="px-4 py-3 text-right tabular-nums font-semibold text-pink-primary">
              {fmtGbp(totalPayments)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
