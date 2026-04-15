import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  simulateDraftApi,
  type DebtContractOut,
  type DebtSimulationPeriod,
} from "@/services/debtContracts/debtContractsApi";
import { Modal } from "@/components/ui/Modal";
import { ScheduleComparisonTable } from "./ScheduleComparisonTable";

interface Props {
  contract: DebtContractOut;
  currentPeriods: DebtSimulationPeriod[];
}

function fmtGbp(v: number): string {
  return `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface WhatIfInputs {
  contract: DebtContractOut;
  currentPeriods: DebtSimulationPeriod[];
  daysLate: number;
  extraPayments: number;
}

interface WhatIfPreview {
  eventPeriod: number;
  balanceAtEvent: number;
  lateFee: number;
  extraReduction: number;
  adjustedBalance: number;
  remainingPeriods: number;
}

function buildPreview({
  contract,
  currentPeriods,
  daysLate,
  extraPayments,
}: WhatIfInputs): WhatIfPreview {
  const eventPeriod = contract.payment_count;
  const penaltyPct = parseFloat(contract.late_penalty_percent);
  const minPayment = parseFloat(contract.minimum_payment);

  const anchorRow = currentPeriods.find((p) => p.period === eventPeriod);
  const balanceAtEvent = anchorRow
    ? parseFloat(anchorRow.balance_end)
    : parseFloat(contract.principal);

  const lateFee = daysLate > 0 ? balanceAtEvent * penaltyPct : 0;
  const extraReduction = extraPayments * minPayment;
  const adjustedBalance = Math.max(0, balanceAtEvent + lateFee - extraReduction);

  return {
    eventPeriod,
    balanceAtEvent,
    lateFee,
    extraReduction,
    adjustedBalance,
    remainingPeriods: contract.duration_periods - eventPeriod,
  };
}

function mergePeriods(
  currentPeriods: DebtSimulationPeriod[],
  simulated: DebtSimulationPeriod[],
  eventPeriod: number,
): DebtSimulationPeriod[] {
  const kept = currentPeriods.filter((p) => p.period <= eventPeriod);
  const shifted = simulated.map((p) => ({ ...p, period: p.period + eventPeriod }));
  return [...kept, ...shifted];
}

export function SimulatorPanel({ contract, currentPeriods }: Props) {
  const [daysLate, setDaysLate] = useState(0);
  const [extraPayments, setExtraPayments] = useState(0);
  const [afterPeriods, setAfterPeriods] = useState<DebtSimulationPeriod[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const preview = buildPreview({ contract, currentPeriods, daysLate, extraPayments });
  const canSimulate = preview.remainingPeriods > 0;

  const mutation = useMutation({
    mutationFn: () =>
      simulateDraftApi({
        principal: Math.max(0.01, preview.adjustedBalance).toFixed(2),
        interest_rate: contract.interest_rate,
        interest_period: contract.interest_period,
        duration_periods: preview.remainingPeriods,
        payment_frequency: contract.payment_frequency,
        minimum_payment: contract.minimum_payment,
        late_penalty_severity: contract.late_penalty_severity,
        late_penalty_percent: contract.late_penalty_percent,
        dom_can_add_surprise_penalty: contract.dom_can_add_surprise_penalty,
        mid_contract_addition_mode: contract.mid_contract_addition_mode,
        exit_amount: contract.exit_amount,
      }),
    onSuccess: (data) => {
      setAfterPeriods(mergePeriods(currentPeriods, data.periods, preview.eventPeriod));
      setIsModalOpen(true);
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
          Applies the event at period {preview.eventPeriod} (current position). Earlier
          periods remain unchanged; only the remaining {preview.remainingPeriods} period
          {preview.remainingPeriods === 1 ? "" : "s"} are re-projected.
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
            aria-label="Days late applied at current period"
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
            aria-label="Number of extra minimum payments applied at current period"
          />
        </div>
      </div>

      <div
        role="status"
        className="flex flex-wrap gap-4 rounded-md bg-base-surface-raised border border-base-border px-4 py-3"
      >
        <span className="text-sm text-base-text-muted">
          Balance at P{preview.eventPeriod}:{" "}
          <span className="font-semibold text-base-text">{fmtGbp(preview.balanceAtEvent)}</span>
        </span>
        <span className="text-sm text-base-text-muted">
          Late fee:{" "}
          <span
            className={preview.lateFee > 0 ? "text-status-danger font-semibold" : "text-base-text"}
          >
            {fmtGbp(preview.lateFee)}
          </span>
        </span>
        <span className="text-sm text-base-text-muted">
          Extra paid:{" "}
          <span
            className={
              preview.extraReduction > 0
                ? "text-status-success font-semibold"
                : "text-base-text"
            }
          >
            −{fmtGbp(preview.extraReduction)}
          </span>
        </span>
        <span className="text-sm text-base-text-muted">
          Adjusted balance:{" "}
          <span className="font-semibold text-base-text">{fmtGbp(preview.adjustedBalance)}</span>
        </span>
      </div>

      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !canSimulate}
        className="self-start px-4 py-2 text-sm font-semibold rounded-md bg-pink-primary text-pink-foreground hover:bg-pink-primary-hover transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-pink-primary"
        aria-label="Compare current schedule with what-if scenario"
      >
        {mutation.isPending ? "Simulating…" : "Compare with what-if"}
      </button>

      {!canSimulate && (
        <p className="text-xs text-base-text-muted">Contract has no remaining periods to simulate.</p>
      )}

      {mutation.isError && (
        <p className="text-xs text-status-danger" role="alert">
          {mutation.error instanceof Error ? mutation.error.message : "Simulation failed"}
        </p>
      )}

      {isModalOpen && afterPeriods && (
        <Modal title="Schedule comparison" size="xl" onClose={() => setIsModalOpen(false)}>
          <div className="flex flex-col gap-3">
            <p className="text-xs text-base-text-muted">
              Event applied at period <strong>{preview.eventPeriod}</strong>. Periods 1–
              {preview.eventPeriod} stay identical. Rows in red on the <strong>After</strong>{" "}
              side differ from the current schedule.
            </p>
            <ScheduleComparisonTable
              beforePeriods={currentPeriods}
              afterPeriods={afterPeriods}
              contract={contract}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
