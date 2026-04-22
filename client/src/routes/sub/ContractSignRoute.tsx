import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SignaturePad } from "@/components/signature/SignaturePad";
import { ContractCeremony } from "@/components/contracts/ContractCeremony";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getContractBySlugSubApi,
  signContractApi,
} from "@/services/debtContracts/debtContractsApi";
import { useAuth } from "@/services/auth/useAuth";
import { queryKeys } from "@/lib/queryKeys";

const SIGNABLE_STATUSES = ["pending_sub", "pending_sub_signature"] as const;

function stripPngPrefix(dataUrl: string): string {
  const prefix = "data:image/png;base64,";
  return dataUrl.startsWith(prefix) ? dataUrl.slice(prefix.length) : dataUrl;
}

export function ContractSignRoute() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [ceremony, setCeremony] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const safeSlug = slug ?? "";

  const {
    data: contract,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.contracts.bySlug(safeSlug),
    queryFn: () => getContractBySlugSubApi(safeSlug),
    enabled: safeSlug.length > 0,
  });

  const contractId = contract?.id ?? "";

  const signMutation = useMutation({
    mutationFn: (signaturePngB64: string) => signContractApi(contractId, signaturePngB64),
    onSuccess: (signed) => {
      qc.invalidateQueries({ queryKey: queryKeys.contracts.bySlug(safeSlug) });
      qc.invalidateQueries({ queryKey: queryKeys.contracts.detail(contractId) });
      qc.invalidateQueries({ queryKey: queryKeys.contracts.audit(contractId) });
      navigate(`/debts/${signed.slug ?? safeSlug}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleReady(dataUrl: string) {
    setError(null);
    signMutation.mutate(stripPngPrefix(dataUrl));
  }

  if (!safeSlug)
    return (
      <div className="p-4 md:p-8">
        <p className="text-bad-ink text-sm">No contract slug.</p>
      </div>
    );

  if (isLoading)
    return (
      <div className="p-4 md:p-8">
        <p className="text-text-mute text-sm">Loading…</p>
      </div>
    );

  if (isError || !contract)
    return (
      <div className="p-4 md:p-8">
        <p className="text-bad-ink text-sm">Failed to load contract.</p>
      </div>
    );

  const isSignable = (SIGNABLE_STATUSES as readonly string[]).includes(contract.status);

  if (!isSignable) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          <PageHeader
            crumbs={["Home · Contracts · Sign"]}
            title={<span className="font-serif italic">Sign Contract</span>}
          />
          <p className="text-sm rounded-md px-4 py-2 bg-bad-bg text-bad-ink border border-line">
            This contract is not awaiting your signature (status: {contract.status}).
          </p>
          <Link
            to={`/debts/${contract.slug ?? safeSlug}`}
            className="text-sm text-accent hover:underline"
          >
            Back to contract
          </Link>
        </div>
      </div>
    );
  }

  if (ceremony) {
    return (
      <ContractCeremony
        contract={contract}
        pending={signMutation.isPending}
        error={error}
        onSign={(sigB64) => signMutation.mutate(sigB64)}
        onAbort={() => setCeremony(false)}
      />
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <PageHeader
          crumbs={["Home · Contracts · Sign"]}
          title={<span className="font-serif italic">Sign Contract</span>}
          description="Draw your signature below to finalise the contract. This action is binding."
        />

        {isAdmin && (
          <p className="font-mono text-[11px] tracking-[0.08em] text-text-faint">{contractId}</p>
        )}

        {error && (
          <p
            role="status"
            className="text-sm rounded-md px-4 py-2 bg-bad-bg text-bad-ink border border-line"
          >
            {error}
          </p>
        )}

        <div className="flex items-center justify-between rounded-[6px] border border-line bg-bg-elev px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-text">Take your time.</p>
            <p className="text-xs text-text-mute">
              Enter ceremony mode to read each clause one by one before signing.
            </p>
          </div>
          <Button
            type="button"
            variant="soft"
            size="sm"
            onClick={() => setCeremony(true)}
            aria-label="Enter ceremony signing mode"
          >
            Enter ceremony
          </Button>
        </div>

        <Card>
          <SignaturePad onReady={handleReady} disabled={signMutation.isPending} />
          {signMutation.isPending && (
            <p className="text-xs text-text-mute mt-3">Submitting signature…</p>
          )}
        </Card>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => navigate(`/debts/${contract.slug ?? safeSlug}`)}
          >
            Cancel and go back
          </Button>
        </div>
      </div>
    </div>
  );
}
