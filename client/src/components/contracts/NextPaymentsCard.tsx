import type { DebtContractOut, PaymentFrequency } from "@/services/debtContracts/debtContractsApi";

const PERIOD_DAYS: Record<PaymentFrequency, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

function fmtShortDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  });
}

function fmtGbp(v: string): string {
  return `£${parseFloat(v).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function computeNextPayments(contract: DebtContractOut): { date: Date; amount: string }[] {
  const periodMs = PERIOD_DAYS[contract.payment_frequency] * 86400 * 1000;
  const base = contract.last_payment_at ?? contract.first_payment_at ?? contract.created_at;
  const baseDate = new Date(base);
  const results: { date: Date; amount: string }[] = [];
  let next = new Date(baseDate.getTime() + periodMs);
  const now = Date.now();
  // Advance until the next date is in the future
  while (next.getTime() <= now) {
    next = new Date(next.getTime() + periodMs);
  }
  for (let i = 0; i < 3; i++) {
    results.push({ date: new Date(next.getTime() + i * periodMs), amount: contract.minimum_payment });
  }
  return results;
}

interface Props {
  contract: DebtContractOut;
}

export function NextPaymentsCard({ contract }: Props) {
  if (contract.status !== "active") return null;

  const payments = computeNextPayments(contract);

  return (
    <div className="bg-base-surface border border-base-border rounded-lg p-4">
      <h3 className="text-xs font-semibold text-base-text-muted uppercase tracking-wide mb-3">
        Next 3 payments
      </h3>
      <ul className="flex flex-col gap-1.5">
        {payments.map((p, i) => (
          <li key={i} className="flex items-center justify-between text-sm">
            <span className="text-base-text-muted">{fmtShortDate(p.date)}</span>
            <span className="font-semibold text-base-text">{fmtGbp(p.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
