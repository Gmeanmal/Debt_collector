import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ContractFormFields } from "@/components/contracts/ContractFormFields";
import { SimulationChart } from "@/components/contracts/SimulationChart";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import {
  proposeAsGoddessApi,
  simulateDraftApi,
  type DebtContractCreate,
  type DebtSimulationOut,
} from "@/services/debtContracts/debtContractsApi";
import { getSubByUsernameApi } from "@/services/payments/paymentsApi";
import { queryKeys } from "@/lib/queryKeys";

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

export function ContractFormRoute() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<DebtContractCreate>(DEFAULT_FORM);
  const [simulation, setSimulation] = useState<DebtSimulationOut | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeUsername = username ?? "";

  const { data: sub } = useQuery({
    queryKey: queryKeys.goddess.subByUsername(safeUsername),
    queryFn: () => getSubByUsernameApi(safeUsername),
    enabled: safeUsername.length > 0,
  });

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
    mutationFn: () => {
      if (!sub?.id) throw new Error("Sub not resolved");
      return proposeAsGoddessApi(sub.id, form);
    },
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

  if (!safeUsername) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-bad-ink text-sm">No username in route.</p>
      </div>
    );
  }

  const subLabel = sub ? `${sub.display_name} (@${sub.username})` : `@${safeUsername}`;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <PageHeader
          crumbs={["Home · Contracts · New"]}
          title={<span className="italic">Draft a contract</span>}
          description={`Sub: ${subLabel}`}
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
            <div className="bg-bg-elev border border-line rounded-[10px] p-[18px]">
              <h2 className="text-base font-semibold text-text mb-4">Contract terms</h2>
              <ContractFormFields values={form} onChange={handleChange} />
              <div className="mt-6">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={proposeMutation.isPending || !sub}
                  className="w-full"
                >
                  {proposeMutation.isPending ? "Proposing…" : "Propose contract"}
                </Button>
              </div>
            </div>

            <div className="bg-bg-elev border border-line rounded-[10px] p-[18px]">
              <h2 className="text-base font-semibold text-text mb-4">Live projection</h2>
              {simError && <p className="text-xs text-warn-ink mb-3">{simError}</p>}
              {simulation ? (
                <SimulationChart simulation={simulation} principal={String(form.principal)} />
              ) : (
                <p className="text-text-mute text-sm">Calculating…</p>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
