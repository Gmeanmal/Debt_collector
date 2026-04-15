import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { surprisePenaltyApi } from "@/services/debtContracts/debtContractsApi";
import { Modal } from "@/components/ui/Modal";
import { queryKeys } from "@/lib/queryKeys";

interface Props {
  contractId: string;
  onClose: () => void;
  onBanner?: (msg: string, kind: "success" | "error") => void;
}

export function SurprisePenaltyDialog({ contractId, onClose, onBanner }: Props) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: () => surprisePenaltyApi(contractId, { amount, reason: reason || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.contracts.detail(contractId) });
      qc.invalidateQueries({ queryKey: queryKeys.contracts.audit(contractId) });
      onBanner?.("Surprise penalty applied.", "success");
      onClose();
    },
    onError: (err: Error) => onBanner?.(err.message, "error"),
  });

  const disabled = mutation.isPending || !amount;

  return (
    <Modal title="Surprise penalty" onClose={onClose}>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-base-text" htmlFor="sp-amount">
          Amount (GBP)
        </label>
        <input
          id="sp-amount"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-base-text" htmlFor="sp-reason">
          Reason <span className="text-base-text-subtle font-normal">(optional)</span>
        </label>
        <textarea
          id="sp-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={3}
          className="bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-sm text-base-text-muted border border-base-border rounded hover:text-base-text transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={disabled}
          className="px-3 py-1.5 text-sm bg-debt-primary text-pink-foreground font-semibold rounded hover:bg-debt-primary-hover transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? "Applying…" : "Apply"}
        </button>
      </div>
    </Modal>
  );
}
