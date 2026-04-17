import type { components } from "@/types/api.generated";

type InvitationStatus = components["schemas"]["InvitationStatus"];

const STATUS_CLASSES: Record<InvitationStatus, string> = {
  active: "bg-pink-muted text-pink-primary",
  pending_entry_tribute_paid: "bg-status-warning/15 text-status-warning",
  consumed: "bg-base-surface-raised text-base-text-muted",
  expired: "bg-debt-muted text-status-danger",
};

const STATUS_LABELS: Record<InvitationStatus, string> = {
  active: "Active",
  pending_entry_tribute_paid: "Awaiting payment",
  consumed: "Consumed",
  expired: "Expired",
};

interface Props {
  status: InvitationStatus;
}

export function InvitationStatusChip({ status }: Props) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
