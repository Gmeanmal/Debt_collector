import type { components } from "@/types/api.generated";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

type InvitationStatus = components["schemas"]["InvitationStatus"];

const STATUS_TONE: Record<InvitationStatus, BadgeProps["variant"]> = {
  active: "pink",
  pending_entry_tribute_paid: "warn",
  consumed: "neutral",
  expired: "bad",
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
  return <Badge variant={STATUS_TONE[status]}>{STATUS_LABELS[status]}</Badge>;
}
