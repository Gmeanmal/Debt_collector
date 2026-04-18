import type { DebtContractStatus } from "@/services/debtContracts/debtContractsApi";

const STATUS_LABELS: Record<DebtContractStatus, string> = {
  pending_sub: "Pending sub",
  pending_dom: "Pending goddess",
  pending_dom_counter: "Awaiting your counter-offer",
  pending_sub_signature: "Pending signature",
  active: "Active",
  closed: "Closed",
  breached: "Breached",
  completed: "Completed",
  cancelled_by_dom: "Cancelled",
};

const STATUS_CLASSES: Record<DebtContractStatus, string> = {
  pending_sub: "bg-status-warning/15 text-status-warning border-status-warning/30",
  pending_dom: "bg-status-warning/15 text-status-warning border-status-warning/30",
  pending_dom_counter: "bg-status-warning/15 text-status-warning border-status-warning/30",
  pending_sub_signature: "bg-status-info/15 text-status-info border-status-info/30",
  active: "bg-status-success/15 text-status-success border-status-success/30",
  closed: "bg-base-surface-raised text-base-text-muted border-base-border",
  breached: "bg-debt-muted text-status-danger border-debt-ring",
  completed: "bg-status-success/15 text-status-success border-status-success/30",
  cancelled_by_dom: "bg-base-surface-raised text-base-text-muted border-base-border",
};

interface Props {
  status: DebtContractStatus;
}

export function ContractStatusChip({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
