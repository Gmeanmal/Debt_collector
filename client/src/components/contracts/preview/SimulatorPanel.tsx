import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  simulateDraftApi,
  type DebtContractOut,
  type DebtSimulationOut,
} from "@/services/debtContracts/debtContractsApi";

interface Props {
  contract: DebtContractOut;
  onSimulationResult?: (result: DebtSimulationOut) => void;
}

function fmtGbp(v: number): string {
  return `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function computeWhatIf(
  contract: DebtContractOut,
  daysLate: number,
  extraPayments: number,
): { lateFee: number; newBalance: number } {
  const principal = parseFloat(contract.principal);
  const penaltyPct = parseFloat(contract.late_penalty_percent);
  const minPayment = parseFloat(contract.minimum_payment);

  const lateFee = daysLate > 0 ? principal * penaltyPct : 0;
  const newBalance = Math.max(0, principal + lateFee - extraPayments * minPayment);

  return { lateFee, newBalance };
}

export function SimulatorPanel({ contract, onSimulationResult }: Props) {
  const [daysLate, setDaysLate] = useState(0);
  const [extraPayments, setExtraPayments] = useState(0);

  const { lateFee, newBalance } = computeWhatIf(contract, daysLate, extraPayments);

  const mutation = useMutation({
    mutationFn: () =>
      simulateDraftApi({
        principal: newBalance,
        interest_rate: contract.interest_rate,
        interest_period: contract.interest_period,
        duration_periods: contract.duration_periods,
        payment_frequency: contract.payment_frequency,
        minimum_payment: contract.minimum_payment,
        late_penalty_severity: contract.late_penalty_severity,
        late_penalty_percent: contract.late_penalty_percent,
        dom_can_add_surprise_penalty: contract.dom_can_add_surprise_penalty,
        mid_contract_addition_mode: contract.mid_contract_addition_mode,
        exit_amount: contract.exit_amount,
      }),
    onSuccess: (data) => {
      onSimulationResult?.(data);
    },
  });

  function handleDaysLate(e: React.ChangeEvent<HTMLInputElement>) {
    setDaysLate(Math.max(0, parseInt(e.target.value, 10) || 0));
  }

  function handleExtraPayments(e: React.ChangeEvent<HTMLInputElement>) {
    setExtraPayments(Math.max(0, parseInt(e.target.value, 10) || 0));
  }

  const inputClass =
    "w-full rounded-md border border-base-border bg-base-surface-raised px-3 py-1.5 text-sm text-base-text focus:outline-none focus:ring-2 focus:ring-pink-primary";

  return (
    <div className="bg-base-surface border border-base-border rounded-lg p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-base-text">What-if simulator</h2>
        <p className="text-xs text-base-text-muted mt-0.5">
          Adjust inputs to see how late payments or extra instalments affect the balance.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="days-late" className="text-xs font-medium text-base-text-muted">
            Days late
          </label>
          <input
            id="days-late"
            type="number"
            min={0}
            value={daysLate}
            onChange={handleDaysLate}
            className={inputClass}
            aria-label="Days late for penalty calculation"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="extra-payments" className="text-xs font-medium text-base-text-muted">
            Extra payments
          </label>
          <input
            id="extra-payments"
            type="number"
            min={0}
            value={extraPayments}
            onChange={handleExtraPayments}
            className={inputClass}
            aria-label="Number of extra minimum payments made"
          />
        </div>
      </div>

      <div
        role="status"
        className="flex flex-wrap gap-4 rounded-md bg-base-surface-raised border border-base-border px-4 py-3"
      >
        <span className="text-sm text-base-text-muted">
          Late fees:{" "}
          <span className={lateFee > 0 ? "text-status-danger font-semibold" : "text-base-text"}>
            {fmtGbp(lateFee)}
          </span>
        </span>
        <span className="text-sm text-base-text-muted">
          New balance: <span className="font-semibold text-base-text">{fmtGbp(newBalance)}</span>
        </span>
      </div>

      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="self-start px-4 py-2 text-sm font-semibold rounded-md bg-pink-primary text-pink-foreground hover:bg-pink-primary-hover transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-pink-primary"
        aria-label="Re-run full schedule simulation with new balance"
      >
        {mutation.isPending ? "Simulating…" : "Re-simulate schedule"}
      </button>

      {mutation.isError && (
        <p className="text-xs text-status-danger" role="alert">
          {mutation.error instanceof Error ? mutation.error.message : "Simulation failed"}
        </p>
      )}
    </div>
  );
}
