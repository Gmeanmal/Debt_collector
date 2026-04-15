import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ContractStatusChip } from "@/components/contracts/ContractStatusChip";
import { ContractActions } from "@/components/contracts/ContractActions";
import { ContractAuditLog } from "@/components/contracts/ContractAuditLog";
import { ContractStats } from "@/components/contracts/ContractStats";
import { SimulationChart } from "@/components/contracts/SimulationChart";
import { SurprisePenaltyDialog } from "@/components/contracts/SurprisePenaltyDialog";
import { AdjustmentDialog } from "@/components/contracts/AdjustmentDialog";
import { BuyoutIntentPanel } from "@/components/contracts/BuyoutIntentPanel";
import {
  downloadContractPdfApi,
  getContractApi,
  getContractAuditApi,
  simulateDraftApi,
  type DebtContractOut,
  type DebtSimulationOut,
} from "@/services/debtContracts/debtContractsApi";
import { useAuth } from "@/services/auth/useAuth";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { queryKeys } from "@/lib/queryKeys";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London" });
}

function fmtGbp(v: string): string {
  return `£${parseFloat(v).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(fraction: string): string {
  const n = parseFloat(fraction);
  return isNaN(n) ? "—" : `${(n * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}

function TermRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-base-border last:border-0">
      <span className="text-sm text-base-text-muted">{label}</span>
      <span className="text-sm font-semibold text-base-text text-right">{value}</span>
    </div>
  );
}

function ContractTerms({ contract }: { contract: DebtContractOut }) {
  return (
    <div className="bg-base-surface border border-base-border rounded-lg p-5">
      <h2 className="text-sm font-semibold text-base-text mb-3">Current terms</h2>
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

function SimulationPanel({ contract }: { contract: DebtContractOut }) {
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

  if (simError) return <p className="text-xs text-status-warning">{simError}</p>;
  if (!simulation) return <p className="text-sm text-base-text-muted">Loading projection…</p>;
  return <SimulationChart simulation={simulation} principal={contract.principal} />;
}

export function ContractDetailRoute() {
  const { contractId } = useParams<{ contractId: string }>();
  const { user } = useAuth();
  const [banner, setBanner] = useState<{ msg: string; kind: "success" | "error" } | null>(null);
  const [showSurprise, setShowSurprise] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showBuyout, setShowBuyout] = useState(false);

  const safeId = contractId ?? "";

  const {
    data: contract,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.contracts.detail(safeId),
    queryFn: () => getContractApi(safeId),
    enabled: safeId.length > 0,
  });

  const { data: audit = [] } = useQuery({
    queryKey: queryKeys.contracts.audit(safeId),
    queryFn: () => getContractAuditApi(safeId),
    enabled: safeId.length > 0,
  });

  if (!safeId)
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <ErrorState title="No contract ID in the URL" />
        </div>
      </div>
    );
  if (isLoading)
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <ListSkeleton rows={3} />
        </div>
      </div>
    );
  if (isError || !contract)
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <ErrorState
            title="Failed to load contract"
            message={(error as Error | undefined)?.message}
          />
        </div>
      </div>
    );

  const role = user?.role ?? "sub";
  const canSubSign =
    role === "sub" &&
    (contract.status === "pending_sub" || contract.status === "pending_sub_signature");
  const canDownloadPdf = contract.status === "active" && Boolean(contract.signed_at);
  const isActive = contract.status === "active";
  const canSurprisePenalty =
    role === "goddess" && isActive && contract.dom_can_add_surprise_penalty;
  const canAdjustment =
    role === "goddess" && isActive && contract.mid_contract_addition_mode !== "disabled";
  const canRequestBuyout = role === "sub" && isActive;

  async function handleDownloadPdf() {
    try {
      const url = await downloadContractPdfApi(contract!.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to download PDF";
      setBanner({ msg, kind: "error" });
    }
  }

  const btnBase =
    "px-4 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 focus-visible:ring-2";

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
              Debt Contract
            </h1>
            {role === "admin" && (
              <p className="text-xs text-base-text-muted mt-1 font-mono">{contract.id}</p>
            )}
          </div>
          <ContractStatusChip status={contract.status} />
        </div>

        {banner && (
          <p
            role="status"
            className={`text-sm rounded-md px-4 py-2 border ${banner.kind === "success" ? "bg-status-success/10 text-status-success border-status-success/30" : "bg-debt-muted text-status-danger border-debt-ring"}`}
          >
            {banner.msg}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ContractTerms contract={contract} />
          <div className="bg-base-surface border border-base-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-base-text mb-3">Projection</h2>
            <SimulationPanel contract={contract} />
          </div>
        </div>

        <ContractStats contract={contract} />

        <div className="flex flex-wrap gap-3">
          {role === "goddess" && (
            <Link
              to={`/goddess/contracts/${contract.id}/preview`}
              className={`${btnBase} bg-base-surface-raised border border-base-border text-base-text hover:border-pink-primary focus-visible:ring-pink-primary`}
            >
              Preview contract
            </Link>
          )}
          {canSubSign && (
            <Link
              to={`/sub/debts/${contract.id}/sign`}
              className={`${btnBase} bg-pink-primary text-pink-foreground hover:bg-pink-primary-hover focus-visible:ring-pink-primary`}
            >
              Sign contract
            </Link>
          )}
          {canDownloadPdf && (
            <button
              type="button"
              onClick={handleDownloadPdf}
              className={`${btnBase} bg-base-surface-raised border border-base-border text-base-text hover:border-pink-primary focus-visible:ring-pink-primary`}
            >
              Download signed PDF
            </button>
          )}
          {canSurprisePenalty && (
            <button
              type="button"
              onClick={() => setShowSurprise(true)}
              className={`${btnBase} bg-debt-muted text-status-danger border border-debt-ring hover:bg-debt-primary/20 focus-visible:ring-debt-primary`}
            >
              Surprise penalty
            </button>
          )}
          {canAdjustment && (
            <button
              type="button"
              onClick={() => setShowAdjustment(true)}
              className={`${btnBase} bg-base-surface-raised border border-base-border text-base-text hover:border-pink-primary focus-visible:ring-pink-primary`}
            >
              Add adjustment
            </button>
          )}
          {canRequestBuyout && (
            <button
              type="button"
              onClick={() => setShowBuyout(true)}
              className={`${btnBase} bg-pink-primary text-pink-foreground hover:bg-pink-primary-hover focus-visible:ring-pink-primary`}
            >
              Request buyout
            </button>
          )}
        </div>

        {showSurprise && (
          <SurprisePenaltyDialog
            contractId={contract.id}
            onClose={() => setShowSurprise(false)}
            onBanner={(msg, kind) => setBanner({ msg, kind })}
          />
        )}
        {showAdjustment && (
          <AdjustmentDialog
            contractId={contract.id}
            onClose={() => setShowAdjustment(false)}
            onBanner={(msg, kind) => setBanner({ msg, kind })}
          />
        )}
        {showBuyout && (
          <BuyoutIntentPanel contractId={contract.id} onClose={() => setShowBuyout(false)} />
        )}

        <ContractActions
          contract={contract}
          role={role}
          onBanner={(msg, kind) => setBanner({ msg, kind })}
        />

        <ContractAuditLog entries={audit} />
      </div>
    </div>
  );
}
