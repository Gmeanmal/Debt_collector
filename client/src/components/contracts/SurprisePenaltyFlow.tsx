import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Button } from "@/components/ui/button";
import {
  listGoddessDebtsApi,
  surprisePenaltyPreviewApi,
  surprisePenaltyBySlugApi,
  type DebtContractOut,
  type SurprisePenaltyPreviewOut,
  type SurprisePenaltyCommitIn,
} from "@/services/debtContracts/debtContractsApi";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

interface Props {
  subId: string;
  onClose: () => void;
  onBanner?: (msg: string, kind: "success" | "error") => void;
}

type Step = "pick" | "amount" | "reason";

function fmtGbp(v: string): string {
  return `£${parseFloat(v).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function PreviewBlock({ data }: { data: SurprisePenaltyPreviewOut }) {
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <div className="flex justify-between">
        <span className="text-base-text-muted">Current outstanding</span>
        <span className="font-semibold text-base-text">{fmtGbp(data.current_outstanding)}</span>
      </div>
      <div className="flex justify-between text-status-danger">
        <span>Penalty added</span>
        <span className="font-semibold">+ {fmtGbp(data.delta)}</span>
      </div>
      <div className="flex justify-between border-t border-base-border pt-1.5 mt-0.5">
        <span className="text-base-text font-medium">New balance</span>
        <span className="font-bold text-base-text">{fmtGbp(data.new_outstanding)}</span>
      </div>
    </div>
  );
}

export function SurprisePenaltyFlow({ subId, onClose, onBanner }: Props) {
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>("pick");
  const [selectedContract, setSelectedContract] = useState<DebtContractOut | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<SurprisePenaltyPreviewOut | null>(null);

  const { data: allContracts = [] } = useQuery({
    queryKey: queryKeys.goddess.contracts(),
    queryFn: listGoddessDebtsApi,
  });

  const activeContracts = allContracts.filter(
    (c) => c.sub_id === subId && c.status === "active" && c.dom_can_add_surprise_penalty,
  );

  // Auto-skip to step 2 when there is exactly one eligible contract
  useEffect(() => {
    if (activeContracts.length === 1 && step === "pick") {
      setSelectedContract(activeContracts[0] ?? null);
      setStep("amount");
    }
  }, [activeContracts.length, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const previewMutation = useMutation<SurprisePenaltyPreviewOut, Error>({
    mutationFn: () => {
      if (!selectedContract?.slug) throw new Error("No contract selected");
      return surprisePenaltyPreviewApi(selectedContract.slug, amount);
    },
    onSuccess: (data) => {
      setPreview(data);
      setStep("reason");
    },
  });

  const commitMutation = useMutation<DebtContractOut, Error>({
    mutationFn: () => {
      if (!selectedContract?.slug) throw new Error("No contract selected");
      const commitBody: SurprisePenaltyCommitIn = {
        amount_gbp: amount,
        reason,
        confirmed_at: new Date().toISOString(),
      };
      return surprisePenaltyBySlugApi(selectedContract.slug, commitBody);
    },
    onSuccess: () => {
      const contractId = selectedContract?.id ?? "";
      qc.invalidateQueries({ queryKey: queryKeys.contracts.detail(contractId) });
      qc.invalidateQueries({ queryKey: queryKeys.contracts.audit(contractId) });
      qc.invalidateQueries({ queryKey: queryKeys.goddess.contracts() });
      onBanner?.("Surprise penalty applied.", "success");
      onClose();
    },
    onError: (err) => onBanner?.(err.message, "error"),
  });

  const titleMap: Record<Step, string> = {
    pick: "Surprise penalty — select contract",
    amount: "Surprise penalty — enter amount",
    reason: "Surprise penalty — confirm",
  };

  return (
    <Modal title={titleMap[step]} onClose={onClose} size="md">
      {/* Step 1: contract picker */}
      {step === "pick" && (
        <div className="flex flex-col gap-4">
          {activeContracts.length === 0 ? (
            <p className="text-sm text-base-text-muted">
              This sub has no active contracts with surprise-penalty enabled.
            </p>
          ) : (
            <>
              <p className="text-sm text-base-text-muted">
                Select the contract to apply the penalty to.
              </p>
              <SearchableSelect<DebtContractOut>
                options={activeContracts}
                value={selectedContract}
                onChange={setSelectedContract}
                getLabel={(c) => `£${parseFloat(c.principal).toFixed(2)} — ${c.status}`}
                getValue={(c) => c.id}
                placeholder="Choose contract…"
                renderOption={(c) => (
                  <span>
                    Principal {fmtGbp(c.principal)}
                    <span className="text-xs text-base-text-muted ml-2">
                      · {c.payment_frequency}
                    </span>
                  </span>
                )}
              />
            </>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="button"
              disabled={!selectedContract}
              onClick={() => setStep("amount")}
              aria-label="Next step"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: amount + server preview */}
      {step === "amount" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-base-text-muted">
            Enter the penalty amount. A preview will be computed before applying.
          </p>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-text" htmlFor="sp-amount">
              Amount (£)
            </label>
            <input
              id="sp-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={cn(
                "bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary",
              )}
            />
          </div>
          {previewMutation.isError && (
            <p className="text-xs text-status-danger">{previewMutation.error.message}</p>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setStep("pick")}
              disabled={previewMutation.isPending}
            >
              Back
            </Button>
            <Button
              variant="destructive"
              size="sm"
              type="button"
              disabled={!amount || parseFloat(amount) <= 0 || previewMutation.isPending}
              onClick={() => previewMutation.mutate()}
              aria-label="Preview penalty"
            >
              {previewMutation.isPending ? "Previewing…" : "Preview"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: confirm with reason */}
      {step === "reason" && preview && (
        <div className="flex flex-col gap-4">
          <div className="bg-base-surface-raised border border-base-border rounded-md p-4">
            <PreviewBlock data={preview} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-text" htmlFor="sp-reason">
              Reason <span className="text-base-text-subtle font-normal">(required)</span>
            </label>
            <textarea
              id="sp-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              className={cn(
                "bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm resize-none",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary",
              )}
            />
          </div>
          {commitMutation.isError && (
            <p className="text-xs text-status-danger">{commitMutation.error.message}</p>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setStep("amount")}
              disabled={commitMutation.isPending}
            >
              Back
            </Button>
            <Button
              variant="destructive"
              size="sm"
              type="button"
              disabled={reason.trim().length < 5 || commitMutation.isPending}
              onClick={() => commitMutation.mutate()}
              aria-label="Apply surprise penalty"
            >
              {commitMutation.isPending ? "Applying…" : "Apply penalty"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
