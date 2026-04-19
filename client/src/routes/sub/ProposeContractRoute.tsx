import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ContractFormFields } from "@/components/contracts/ContractFormFields";
import { SimulationChart } from "@/components/contracts/SimulationChart";
import { PageHeader } from "@/components/ui/page-header";
import { SectionTitle } from "@/components/ui/section-title";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      navigate(`/debts/${contract.slug ?? contract.id}`);
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
        <PageHeader
          crumbs={["Home · Contracts · Propose"]}
          title={<span className="font-serif italic">Propose a Contract</span>}
          description="Submit proposed terms for your Goddess to review."
        />

        {banner && (
          <p
            role="status"
            className="text-sm rounded-md px-4 py-2 bg-bad-bg text-bad-ink border border-line"
          >
            {banner}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <SectionTitle eyebrow="Terms" title="Proposed terms" className="mb-4" />
              <ContractFormFields values={form} onChange={handleChange} />
              <div className="mt-6">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={proposeMutation.isPending}
                  className="w-full"
                >
                  {proposeMutation.isPending ? "Proposing…" : "Propose contract"}
                </Button>
              </div>
            </Card>

            <Card>
              <SectionTitle eyebrow="Preview" title="Live projection" className="mb-4" />
              {simError && <p className="text-xs text-warn-ink mb-3">{simError}</p>}
              {simulation ? (
                <SimulationChart simulation={simulation} principal={String(form.principal)} />
              ) : (
                <p className="text-text-mute text-sm">Calculating…</p>
              )}
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}
