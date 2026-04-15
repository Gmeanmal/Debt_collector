import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ContractFormFields } from "@/components/contracts/ContractFormFields";
import { SimulationChart } from "@/components/contracts/SimulationChart";
import {
  proposeAsSubApi,
  simulateDraftApi,
  type DebtContractCreate,
  type DebtSimulationOut,
} from "@/services/debtContracts/debtContractsApi";

const DEFAULT_FORM: DebtContractCreate = {
  principal: 500,
  interest_rate: 0.2,
  interest_period: "monthly",
  duration_periods: 12,
  payment_frequency: "monthly",
  minimum_payment: 50,
  late_penalty_severity: "medium",
  late_penalty_percent: 0.1,
  dom_can_add_surprise_penalty: false,
  mid_contract_addition_mode: "disabled",
  exit_amount: 600,
};

export function ProposeContractRoute() {
  const navigate = useNavigate();
  const [form, setForm] = useState<DebtContractCreate>(DEFAULT_FORM);
  const [simulation, setSimulation] = useState<DebtSimulationOut | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      simulateDraftApi(form)
        .then((result) => {
          setSimulation(result);
          setSimError(null);
        })
        .catch((err: Error) => {
          setSimError(err.message);
        });
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form]);

  const proposeMutation = useMutation({
    mutationFn: () => proposeAsSubApi(form),
    onSuccess: (contract) => {
      navigate(`/debts/${contract.id}`);
    },
    onError: (err: Error) => {
      setBanner(err.message);
    },
  });

  function handleChange(patch: Partial<DebtContractCreate>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    proposeMutation.mutate();
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Propose a Contract
          </h1>
          <p className="text-sm text-base-text-muted mt-1">
            Submit proposed terms for your Goddess to review.
          </p>
        </div>

        {banner && (
          <p
            role="status"
            className="text-sm rounded-md px-4 py-2 bg-debt-muted text-status-danger border border-debt-ring"
          >
            {banner}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-base-surface border border-base-border rounded-lg p-6">
              <h2 className="text-base font-semibold text-base-text mb-4">Proposed terms</h2>
              <ContractFormFields values={form} onChange={handleChange} />
              <div className="mt-6">
                <button
                  type="submit"
                  disabled={proposeMutation.isPending}
                  className="w-full px-4 py-2.5 text-sm bg-pink-primary text-pink-foreground font-semibold rounded-md hover:bg-pink-primary-hover transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-pink-primary"
                >
                  {proposeMutation.isPending ? "Proposing…" : "Propose contract"}
                </button>
              </div>
            </div>

            <div className="bg-base-surface border border-base-border rounded-lg p-6">
              <h2 className="text-base font-semibold text-base-text mb-4">Live projection</h2>
              {simError && <p className="text-xs text-status-warning mb-3">{simError}</p>}
              {simulation ? (
                <SimulationChart simulation={simulation} principal={String(form.principal)} />
              ) : (
                <p className="text-base-text-muted text-sm">Calculating…</p>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
