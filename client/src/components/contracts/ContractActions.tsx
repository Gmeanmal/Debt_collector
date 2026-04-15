import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ContractFormFields } from "@/components/contracts/ContractFormFields";
import { queryKeys } from "@/lib/queryKeys";
import {
  counterProposeApi,
  acceptCounterApi,
  rejectCounterApi,
  closeContractApi,
  type DebtContractOut,
  type DebtContractCreate,
  type DebtContractStatus,
} from "@/services/debtContracts/debtContractsApi";

type UserRole = "goddess" | "sub" | "admin";

interface Props {
  contract: DebtContractOut;
  role: UserRole;
  onBanner: (msg: string, kind: "success" | "error") => void;
}

function versionToCreate(c: DebtContractOut): DebtContractCreate {
  return {
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
  };
}

const PENDING_STATUSES: DebtContractStatus[] = [
  "pending_sub",
  "pending_dom",
  "pending_dom_counter",
  "pending_sub_signature",
];

export function ContractActions({ contract, role, onBanner }: Props) {
  const qc = useQueryClient();
  const [showCounter, setShowCounter] = useState(false);
  const [counterForm, setCounterForm] = useState<DebtContractCreate>(versionToCreate(contract));

  function invalidate() {
    qc.invalidateQueries({ queryKey: queryKeys.contracts.detail(contract.id) });
    qc.invalidateQueries({ queryKey: queryKeys.contracts.audit(contract.id) });
  }

  const counterMutation = useMutation({
    mutationFn: () => counterProposeApi(contract.id, counterForm),
    onSuccess: () => {
      onBanner("Counter-proposal submitted.", "success");
      setShowCounter(false);
      invalidate();
    },
    onError: (err: Error) => onBanner(err.message, "error"),
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptCounterApi(contract.id),
    onSuccess: () => {
      onBanner("Counter accepted.", "success");
      invalidate();
    },
    onError: (err: Error) => onBanner(err.message, "error"),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectCounterApi(contract.id),
    onSuccess: () => {
      onBanner("Counter rejected.", "success");
      invalidate();
    },
    onError: (err: Error) => onBanner(err.message, "error"),
  });

  const closeMutation = useMutation({
    mutationFn: () => closeContractApi(contract.id),
    onSuccess: () => {
      onBanner("Contract cancelled.", "success");
      invalidate();
    },
    onError: (err: Error) => onBanner(err.message, "error"),
  });

  const { status } = contract;
  const isPending = PENDING_STATUSES.includes(status);

  const canSubCounter =
    role === "sub" && (status === "pending_sub" || status === "pending_sub_signature");
  const canGoddessCounter = role === "goddess" && status === "pending_dom";
  const canGoddessAcceptCounter = role === "goddess" && status === "pending_dom_counter";
  const canGoddessRejectCounter = role === "goddess" && status === "pending_dom_counter";
  const canGoddessClose = role === "goddess" && isPending;

  const btnBase =
    "px-4 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 focus-visible:ring-2";

  if (
    status === "active" ||
    status === "closed" ||
    status === "breached" ||
    status === "completed" ||
    status === "cancelled_by_dom"
  ) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        {(canSubCounter || canGoddessCounter) && (
          <button
            type="button"
            onClick={() => {
              setCounterForm(versionToCreate(contract));
              setShowCounter((v) => !v);
            }}
            className={`${btnBase} bg-base-surface-raised border border-base-border text-base-text hover:border-pink-primary focus-visible:ring-pink-primary`}
          >
            Counter-propose
          </button>
        )}

        {canGoddessAcceptCounter && (
          <button
            type="button"
            disabled={acceptMutation.isPending}
            onClick={() => acceptMutation.mutate()}
            className={`${btnBase} bg-status-success/20 text-status-success border border-status-success/30 hover:bg-status-success/30 focus-visible:ring-status-success`}
          >
            {acceptMutation.isPending ? "Accepting…" : "Accept counter"}
          </button>
        )}

        {canGoddessRejectCounter && (
          <button
            type="button"
            disabled={rejectMutation.isPending}
            onClick={() => rejectMutation.mutate()}
            className={`${btnBase} bg-debt-muted text-status-danger border border-debt-ring hover:bg-debt-muted/80 focus-visible:ring-debt-primary`}
          >
            {rejectMutation.isPending ? "Rejecting…" : "Reject counter"}
          </button>
        )}

        {canGoddessClose && (
          <button
            type="button"
            disabled={closeMutation.isPending}
            onClick={() => {
              if (window.confirm("Cancel this contract?")) closeMutation.mutate();
            }}
            className={`${btnBase} bg-base-surface-raised text-base-text-muted border border-base-border hover:border-status-danger focus-visible:ring-status-danger`}
          >
            {closeMutation.isPending ? "Cancelling…" : "Cancel contract"}
          </button>
        )}
      </div>

      {showCounter && (
        <div className="bg-base-surface border border-base-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-base-text mb-4">Edit counter-proposal terms</h3>
          <ContractFormFields
            values={counterForm}
            onChange={(patch) => setCounterForm((prev) => ({ ...prev, ...patch }))}
          />
          <div className="flex gap-3 mt-4 justify-end">
            <button
              type="button"
              onClick={() => setShowCounter(false)}
              className={`${btnBase} bg-base-surface-raised border border-base-border text-base-text focus-visible:ring-base-border`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={counterMutation.isPending}
              onClick={() => counterMutation.mutate()}
              className={`${btnBase} bg-pink-primary text-pink-foreground hover:bg-pink-primary-hover focus-visible:ring-pink-primary`}
            >
              {counterMutation.isPending ? "Submitting…" : "Submit counter"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
