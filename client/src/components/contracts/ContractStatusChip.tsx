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
  pending_sub: "bg-warn-bg text-warn-ink border-line",
  pending_dom: "bg-warn-bg text-warn-ink border-line",
  pending_dom_counter: "bg-warn-bg text-warn-ink border-line",
  pending_sub_signature: "bg-bg-elev text-text-mute border-line",
  active: "bg-ok-bg text-ok-ink border-line",
  closed: "bg-bg-elev text-text-faint border-line",
  breached: "bg-bad-bg text-bad-ink border-line",
  completed: "bg-ok-bg text-ok-ink border-line",
  cancelled_by_dom: "bg-bg-elev text-text-faint border-line",
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
