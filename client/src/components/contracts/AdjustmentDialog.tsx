import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAdjustmentApi } from "@/services/debtContracts/debtContractsApi";

interface Props {
  contractId: string;
  onClose: () => void;
  onBanner?: (msg: string, kind: "success" | "error") => void;
}

export function AdjustmentDialog({ contractId, onClose, onBanner }: Props) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: () => createAdjustmentApi(contractId, { amount, reason: reason || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract", contractId] });
      qc.invalidateQueries({ queryKey: ["contractAudit", contractId] });
      qc.invalidateQueries({ queryKey: ["pendingAdjustments"] });
      onBanner?.("Adjustment submitted.", "success");
      onClose();
    },
    onError: (err: Error) => onBanner?.(err.message, "error"),
  });

  const disabled = mutation.isPending || !amount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base-bg/80 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-base-surface border border-base-border rounded-lg w-full max-w-sm p-6 shadow-[var(--shadow-card)] flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-semibold text-base-text">Mid-contract adjustment</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-base-text-muted hover:text-base-text focus-visible:ring-2 focus-visible:ring-pink-primary rounded"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-base-text-muted">
          If the contract requires sub approval, this will be queued for the sub to accept or
          refuse.
        </p>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-base-text" htmlFor="adj-amount">
            Amount (GBP)
          </label>
          <input
            id="adj-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-base-text" htmlFor="adj-reason">
            Reason <span className="text-base-text-subtle font-normal">(optional)</span>
          </label>
          <textarea
            id="adj-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            className="bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-base-text-muted border border-base-border rounded hover:text-base-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={disabled}
            className="px-3 py-1.5 text-sm bg-pink-primary text-pink-foreground font-semibold rounded hover:bg-pink-primary-hover transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
