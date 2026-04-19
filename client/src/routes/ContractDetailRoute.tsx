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
import { NextPaymentsCard } from "@/components/contracts/NextPaymentsCard";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
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
  const PRE_SIGNATURE_STATUSES: (typeof contract.status)[] = [
    "pending_sub",
    "pending_dom",
    "pending_dom_counter",
  ];
  const goddessCanPreview = role === "goddess" && PRE_SIGNATURE_STATUSES.includes(contract.status);
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
        <PageHeader
          crumbs={["Home · Contracts"]}
          title={<span className="italic">Debt contract</span>}
          description={
            role === "admin" ? (
              <span className="font-mono text-[11px] text-text-faint">{contract.id}</span>
            ) : undefined
          }
          actions={<ContractStatusChip status={contract.status} />}
        />

        {banner && (
          <p
            role="status"
            className={`text-sm rounded-md px-4 py-2 border ${banner.kind === "success" ? "bg-ok-bg text-ok-ink border-line" : "bg-bad-bg text-bad-ink border-line"}`}
          >
            {banner.msg}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ContractTerms contract={contract} />
          <div className="bg-bg-elev border border-line rounded-[10px] p-[18px]">
            <h2 className="text-sm font-semibold text-text mb-3">Projection</h2>
            <SimulationPanel contract={contract} />
          </div>
        </div>

        <ContractStats contract={contract} />

        {role === "sub" && <NextPaymentsCard contract={contract} />}

        <div className="flex flex-wrap gap-3">
          {goddessCanPreview && (
            <Button variant="ghost" asChild>
              <Link to={`/goddess/contracts/${contract.slug ?? safeSlug}/preview`}>
                Preview contract
              </Link>
            </Button>
          )}
          {canSubSign && (
            <Button variant="primary" asChild>
              <Link to={`/sub/debts/${contract.slug ?? safeSlug}/sign`}>Sign contract</Link>
            </Button>
          )}
          {canDownloadPdf && (
            <Button variant="ghost" type="button" onClick={handleDownloadPdf}>
              Download signed PDF
            </Button>
          )}
          {canSurprisePenalty && (
            <Button variant="danger" type="button" onClick={() => setShowSurprise(true)}>
              Surprise penalty
            </Button>
          )}
          {canAdjustment && (
            <Button variant="ghost" type="button" onClick={() => setShowAdjustment(true)}>
              Add adjustment
            </Button>
          )}
          {canRequestBuyout && (
            <Button variant="primary" type="button" onClick={() => setShowBuyout(true)}>
              Request buyout
            </Button>
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
