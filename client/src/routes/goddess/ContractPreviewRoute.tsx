import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ContractHeaderSummary } from "@/components/contracts/preview/ContractHeaderSummary";
import { ScheduleTable } from "@/components/contracts/preview/ScheduleTable";
import { SimulatorPanel } from "@/components/contracts/preview/SimulatorPanel";
import { BalanceDecayChart } from "@/components/contracts/preview/BalanceDecayChart";
import { ContractStatusChip } from "@/components/contracts/ContractStatusChip";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  getContractBySlugGoddessApi,
  simulateDraftApi,
  type DebtSimulationOut,
} from "@/services/debtContracts/debtContractsApi";
import { listGoddessSubsApi } from "@/services/payments/paymentsApi";
import { queryKeys } from "@/lib/queryKeys";
import { env } from "@/utils/env";
import { getAccessToken } from "@/services/auth/tokenStorage";

export function ContractPreviewRoute() {
  const { slug } = useParams<{ slug: string }>();
  const safeId = slug ?? "";

  const [simulation, setSimulation] = useState<DebtSimulationOut | null>(null);

  const {
    data: contract,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.contracts.bySlug(safeId),
    queryFn: () => getContractBySlugGoddessApi(safeId),
    enabled: safeId.length > 0,
  });

  const { data: subs = [] } = useQuery({
    queryKey: queryKeys.goddess.subs(),
    queryFn: listGoddessSubsApi,
  });

  const initMutation = useMutation({
    mutationFn: (c: typeof contract) => {
      if (!c) throw new Error("No contract");
      return simulateDraftApi({
        principal: c.principal,
        interest_rate: c.interest_rate,
        interest_period: c.interest_period,
        duration_periods: c.duration_periods,
        payment_frequency: c.payment_frequency,
        minimum_payment: c.minimum_payment,
        late_penalty_severity: c.late_penalty_severity,
        late_penalty_percent: c.late_penalty_percent,
        dom_can_add_surprise_penalty: c.dom_can_add_surprise_penalty,
        mid_contract_addition_mode: c.mid_contract_addition_mode,
        exit_amount: c.exit_amount,
      });
    },
    onSuccess: setSimulation,
  });

  // Trigger initial simulation once contract loads
  if (contract && !simulation && !initMutation.isPending && !initMutation.isError) {
    initMutation.mutate(contract);
  }

  function subDisplayName(subId: string): string {
    const sub = subs.find((s) => s.id === subId);
    if (!sub) return "Unknown sub";
    if (sub.first_name && sub.last_name) return `${sub.first_name} ${sub.last_name}`;
    return sub.display_name || sub.username;
  }

  function handleDraftPdf() {
    if (!contract) return;
    const token = getAccessToken();
    const base = env.VITE_API_BASE_URL;
    // Use the resolved contract UUID — never the slug — for the PDF endpoint
    const url = `${base}/debts/${contract.id}/pdf?draft=true`;
    void fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank", "noopener,noreferrer");
      });
  }

  if (!safeId) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto bg-bg-elev border border-line rounded-[10px] p-[18px]">
          <ErrorState title="No contract ID in the URL" />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto bg-bg-elev border border-line rounded-[10px] p-[18px]">
          <ListSkeleton rows={4} />
        </div>
      </div>
    );
  }

  if (isError || !contract) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto bg-bg-elev border border-line rounded-[10px] p-[18px]">
          <p className="text-bad-ink text-sm" role="alert">
            {(error as Error | undefined)?.message ?? "Failed to load contract"}
          </p>
        </div>
      </div>
    );
  }

  const periods = simulation?.periods ?? [];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div>
          <Link
            to={`/debts/${safeId}`}
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint hover:text-text-mute transition-colors"
          >
            ← Back to contract
          </Link>
          <PageHeader
            crumbs={["Home · Contracts · Preview"]}
            title={<span className="italic">Contract preview</span>}
            actions={
              <>
                <ContractStatusChip status={contract.status} />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDraftPdf}
                  disabled={!contract}
                  aria-label="Download draft PDF with watermark"
                >
                  Draft PDF
                </Button>
              </>
            }
          />
        </div>

        <ContractHeaderSummary
          contract={contract}
          subDisplayName={subDisplayName(contract.sub_id)}
        />

        {initMutation.isPending && periods.length === 0 && (
          <div className="bg-bg-elev border border-line rounded-[10px] p-[18px]">
            <p className="text-sm text-text-faint">Loading schedule…</p>
          </div>
        )}

        {initMutation.isError && periods.length === 0 && (
          <div className="bg-bg-elev border border-line rounded-[10px] p-[18px]">
            <p className="text-sm text-bad-ink" role="alert">
              Failed to load repayment schedule. Check connection and retry.
            </p>
          </div>
        )}

        {periods.length > 0 && (
          <>
            <ScheduleTable periods={periods} contract={contract} />

            <BalanceDecayChart periods={periods} />
          </>
        )}

        <SimulatorPanel contract={contract} currentPeriods={periods} />
      </div>
    </div>
  );
}
