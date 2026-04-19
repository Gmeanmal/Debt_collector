import type { DebtContractOut, PaymentFrequency } from "@/services/debtContracts/debtContractsApi";
import { formatLondon } from "@/services/format/datetime";
import { formatGBP } from "@/services/format/currency";

const PERIOD_DAYS: Record<PaymentFrequency, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

function fmtShortDate(d: Date): string {
  return formatLondon(d, "date");
}

function fmtGbp(v: string): string {
  return formatGBP(v);
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
    results.push({
      date: new Date(next.getTime() + i * periodMs),
      amount: contract.minimum_payment,
    });
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
    <div className="bg-bg-elev border border-line rounded-[10px] p-[18px]">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint mb-3">
        Next 3 payments
      </h3>
      <ul className="flex flex-col gap-1.5">
        {payments.map((p, i) => (
          <li key={i} className="flex items-center justify-between text-sm">
            <span className="text-text-mute">{fmtShortDate(p.date)}</span>
            <span className="font-semibold text-text">{fmtGbp(p.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
