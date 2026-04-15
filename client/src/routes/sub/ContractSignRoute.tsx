import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SignaturePad } from "@/components/signature/SignaturePad";
import { getContractApi, signContractApi } from "@/services/debtContracts/debtContractsApi";
import { useAuth } from "@/services/auth/useAuth";
import { queryKeys } from "@/lib/queryKeys";

const SIGNABLE_STATUSES = ["pending_sub", "pending_sub_signature"] as const;

function stripPngPrefix(dataUrl: string): string {
  const prefix = "data:image/png;base64,";
  return dataUrl.startsWith(prefix) ? dataUrl.slice(prefix.length) : dataUrl;
}

export function ContractSignRoute() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const safeId = contractId ?? "";

  const {
    data: contract,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.contracts.debtDetail(safeId),
    queryFn: () => getContractApi(safeId),
    enabled: safeId.length > 0,
  });

  const signMutation = useMutation({
    mutationFn: (signaturePngB64: string) => signContractApi(safeId, signaturePngB64),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.contracts.debtDetail(safeId) });
      qc.invalidateQueries({ queryKey: queryKeys.contracts.detail(safeId) });
      qc.invalidateQueries({ queryKey: queryKeys.contracts.audit(safeId) });
      navigate(`/debts/${safeId}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleReady(dataUrl: string) {
    setError(null);
    signMutation.mutate(stripPngPrefix(dataUrl));
  }

  if (!safeId)
    return (
      <div className="p-4 md:p-8">
        <p className="text-status-danger text-sm">No contract ID.</p>
      </div>
    );

  if (isLoading)
    return (
      <div className="p-4 md:p-8">
        <p className="text-base-text-muted text-sm">Loading…</p>
      </div>
    );

  if (isError || !contract)
    return (
      <div className="p-4 md:p-8">
        <p className="text-status-danger text-sm">Failed to load contract.</p>
      </div>
    );

  const isSignable = (SIGNABLE_STATUSES as readonly string[]).includes(contract.status);

  if (!isSignable) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Sign Contract
          </h1>
          <p className="text-sm rounded-md px-4 py-2 bg-debt-muted text-status-danger border border-debt-ring">
            This contract is not awaiting your signature (status: {contract.status}).
          </p>
          <Link to={`/debts/${contract.id}`} className="text-sm text-pink-primary hover:underline">
            Back to contract
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Sign Contract
          </h1>
          <p className="text-sm text-base-text-muted mt-1">
            Draw your signature below to finalise the contract. This action is binding.
          </p>
          {isAdmin && <p className="text-xs text-base-text-muted mt-1 font-mono">{contract.id}</p>}
        </div>

        {error && (
          <p
            role="status"
            className="text-sm rounded-md px-4 py-2 bg-debt-muted text-status-danger border border-debt-ring"
          >
            {error}
          </p>
        )}

        <div className="bg-base-surface border border-base-border rounded-lg p-6">
          <SignaturePad onReady={handleReady} disabled={signMutation.isPending} />
          {signMutation.isPending && (
            <p className="text-xs text-base-text-muted mt-3">Submitting signature…</p>
          )}
        </div>

        <Link
          to={`/debts/${contract.id}`}
          className="text-sm text-base-text-muted hover:text-pink-primary"
        >
          Cancel and go back
        </Link>
      </div>
    </div>
  );
}
