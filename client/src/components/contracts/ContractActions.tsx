import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ContractFormFields } from "@/components/contracts/ContractFormFields";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
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
  const [cancelOpen, setCancelOpen] = useState(false);
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
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              setCounterForm(versionToCreate(contract));
              setShowCounter((v) => !v);
            }}
          >
            Counter-propose
          </Button>
        )}

        {canGoddessAcceptCounter && (
          <Button
            variant="secondary"
            type="button"
            disabled={acceptMutation.isPending}
            onClick={() => acceptMutation.mutate()}
          >
            {acceptMutation.isPending ? "Accepting…" : "Accept counter"}
          </Button>
        )}

        {canGoddessRejectCounter && (
          <Button
            variant="danger"
            type="button"
            disabled={rejectMutation.isPending}
            onClick={() => rejectMutation.mutate()}
          >
            {rejectMutation.isPending ? "Rejecting…" : "Reject counter"}
          </Button>
        )}

        {canGoddessClose && (
          <Button
            variant="ghost"
            type="button"
            disabled={closeMutation.isPending}
            onClick={() => setCancelOpen(true)}
          >
            {closeMutation.isPending ? "Cancelling…" : "Cancel contract"}
          </Button>
        )}
        {cancelOpen && (
          <Modal title="Cancel contract" onClose={() => setCancelOpen(false)} size="sm">
            <p className="text-sm text-text">Cancel this contract?</p>
            <div className="flex gap-3 justify-end mt-2">
              <Button variant="ghost" type="button" onClick={() => setCancelOpen(false)}>
                Back
              </Button>
              <Button
                variant="danger"
                type="button"
                disabled={closeMutation.isPending}
                onClick={() => {
                  setCancelOpen(false);
                  closeMutation.mutate();
                }}
              >
                {closeMutation.isPending ? "Cancelling…" : "Confirm cancel"}
              </Button>
            </div>
          </Modal>
        )}
      </div>

      {showCounter && (
        <div className="bg-bg-elev border border-line rounded-[10px] p-[18px]">
          <h3 className="text-sm font-semibold text-text mb-4">Edit counter-proposal terms</h3>
          <ContractFormFields
            values={counterForm}
            onChange={(patch) => setCounterForm((prev) => ({ ...prev, ...patch }))}
          />
          <div className="flex gap-3 mt-4 justify-end">
            <Button variant="ghost" type="button" onClick={() => setShowCounter(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="button"
              disabled={counterMutation.isPending}
              onClick={() => counterMutation.mutate()}
            >
              {counterMutation.isPending ? "Submitting…" : "Submit counter"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
