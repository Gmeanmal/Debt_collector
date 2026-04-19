import { useEffect, useRef, useState } from "react";
import { SimulationChart } from "@/components/contracts/SimulationChart";
import {
  simulateDraftApi,
  type DebtContractOut,
  type DebtSimulationOut,
} from "@/services/debtContracts/debtContractsApi";
import { formatLondon } from "@/services/format/datetime";
import { formatGBP } from "@/services/format/currency";

function fmtDate(iso: string): string {
  return formatLondon(iso, "datetime");
}

function fmtGbp(v: string): string {
  return formatGBP(v);
}

function fmtPct(fraction: string): string {
  const n = parseFloat(fraction);
  return isNaN(n) ? "—" : `${(n * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}

function TermRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-line last:border-0">
      <span className="text-sm text-text-mute">{label}</span>
      <span className="text-sm font-semibold text-text text-right">{value}</span>
    </div>
  );
}

export function ContractTerms({ contract }: { contract: DebtContractOut }) {
  return (
    <div className="bg-bg-elev border border-line rounded-[10px] p-[18px]">
      <h2 className="text-sm font-semibold text-text mb-3">Current terms</h2>
      <TermRow label="Principal" value={fmtGbp(contract.principal)} />
      <TermRow label="Interest rate" value={fmtPct(contract.interest_rate)} />
      <TermRow label="Interest period" value={contract.interest_period} />
      <TermRow label="Duration" value={`${contract.duration_periods} periods`} />
      <TermRow label="Payment frequency" value={contract.payment_frequency} />
      <TermRow label="Minimum payment" value={fmtGbp(contract.minimum_payment)} />
      <TermRow label="Late penalty severity" value={contract.late_penalty_severity} />
      <TermRow label="Late penalty" value={fmtPct(contract.late_penalty_percent)} />
      <TermRow label="Exit amount" value={fmtGbp(contract.exit_amount)} />
      <TermRow label="Balance" value={fmtGbp(contract.balance)} />
      <TermRow label="Created" value={fmtDate(contract.created_at)} />
      <TermRow label="Updated" value={fmtDate(contract.updated_at)} />
    </div>
  );
}

export function SimulationPanel({ contract }: { contract: DebtContractOut }) {
  const [simulation, setSimulation] = useState<DebtSimulationOut | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      simulateDraftApi({
        principal: contract.principal,
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
      })
        .then((r) => {
          setSimulation(r);
          setSimError(null);
        })
        .catch((err: Error) => setSimError(err.message));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [contract]);

  if (simError) return <p className="text-xs text-warn-ink">{simError}</p>;
  if (!simulation) return <p className="text-sm text-text-mute">Loading projection…</p>;
  return <SimulationChart simulation={simulation} principal={contract.principal} />;
}
