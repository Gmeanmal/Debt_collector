import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ContractStatusChip } from "@/components/contracts/ContractStatusChip";
import { ContractActions } from "@/components/contracts/ContractActions";
import { ContractAuditLog } from "@/components/contracts/ContractAuditLog";
import { ContractStats } from "@/components/contracts/ContractStats";
import { SurprisePenaltyFlow } from "@/components/contracts/SurprisePenaltyFlow";
import { AdjustmentDialog } from "@/components/contracts/AdjustmentDialog";
import { BuyoutPreviewModal } from "@/components/contracts/BuyoutPreviewModal";
import { ContractTerms, SimulationPanel } from "@/components/contracts/ContractDetailPanels";
import {
  downloadContractPdfApi,
  getContractApi,
  getContractAuditApi,
  getContractBySlugGoddessApi,
  getContractBySlugSubApi,
} from "@/services/debtContracts/debtContractsApi";
import { useAuth } from "@/services/auth/useAuth";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { queryKeys } from "@/lib/queryKeys";

const btnBase =
  "px-4 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 focus-visible:ring-2";

export function ContractDetailRoute() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [banner, setBanner] = useState<{ msg: string; kind: "success" | "error" } | null>(null);
  const [showSurprise, setShowSurprise] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showBuyout, setShowBuyout] = useState(false);

  const safeSlug = slug ?? "";
  const role = user?.role ?? "sub";

  const {
    data: contract,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.contracts.bySlug(safeSlug),
    queryFn: () => {
      if (role === "admin") return getContractApi(safeSlug);
      if (role === "goddess") return getContractBySlugGoddessApi(safeSlug);
      return getContractBySlugSubApi(safeSlug);
    },
    enabled: safeSlug.length > 0,
  });

  const contractId = contract?.id ?? "";

  const { data: audit = [] } = useQuery({
    queryKey: queryKeys.contracts.audit(contractId),
    queryFn: () => getContractAuditApi(contractId),
    enabled: contractId.length > 0,
  });

  if (!safeSlug)
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <ErrorState title="No contract slug in the URL" />
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
              to={`/goddess/contracts/${contract.slug ?? safeSlug}/preview`}
              className={`${btnBase} bg-base-surface-raised border border-base-border text-base-text hover:border-pink-primary focus-visible:ring-pink-primary`}
            >
              Preview contract
            </Link>
          )}
          {canSubSign && (
            <Link
              to={`/sub/debts/${contract.slug ?? safeSlug}/sign`}
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
          <SurprisePenaltyFlow
            subId={contract.sub_id}
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
          <BuyoutPreviewModal
            contractSlug={contract.slug ?? safeSlug}
            onClose={() => setShowBuyout(false)}
            onBanner={(msg, kind) => setBanner({ msg, kind })}
          />
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
