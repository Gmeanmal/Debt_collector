import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ProfileChangeRequestOut } from "@/services/profile/profileApi";
import { AvatarImage } from "@/components/profile/AvatarImage";
import type { AvatarKey } from "@/services/profile/avatarMap";
import { formatLondon } from "@/services/format/datetime";
import { formatGBP } from "@/services/format/currency";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  awaiting_fee_payment: "Fee required",
  cancelled: "Cancelled",
};

type BadgeVariant = "pink" | "ok" | "bad" | "warn" | "neutral";

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  pending: "pink",
  approved: "ok",
  rejected: "bad",
  awaiting_fee_payment: "warn",
  cancelled: "neutral",
};

interface ChangeRequestListProps {
  requests: ProfileChangeRequestOut[];
  onPayFee: (requestId: string) => void;
}

export function ChangeRequestList({ requests, onPayFee }: ChangeRequestListProps) {
  if (requests.length === 0) {
    return <p className="text-sm text-text-mute">No change requests submitted yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {requests.map((req) => (
        <ChangeRequestRow key={req.id} request={req} onPayFee={onPayFee} />
      ))}
    </div>
  );
}

interface ChangeRequestRowProps {
  request: ProfileChangeRequestOut;
  onPayFee: (requestId: string) => void;
}

function ChangeRequestRow({ request, onPayFee }: ChangeRequestRowProps) {
  const date = formatLondon(request.requested_at, "date");

  const changes: string[] = [];
  if (request.proposed_first_name) changes.push(`First name → ${request.proposed_first_name}`);
  if (request.proposed_last_name) changes.push(`Last name → ${request.proposed_last_name}`);
  if (request.proposed_display_name)
    changes.push(`Display name → ${request.proposed_display_name}`);
  if (request.proposed_avatar_key) changes.push(`Avatar → ${request.proposed_avatar_key}`);
  if (request.proposed_notes) changes.push(`Notes: ${request.proposed_notes}`);

  const badgeVariant: BadgeVariant = STATUS_VARIANTS[request.status] ?? "neutral";

  return (
    <div className="rounded-[10px] border border-line bg-bg-elev p-[18px] flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-text-mute">{date}</span>
        <Badge variant={badgeVariant}>
          {STATUS_LABELS[request.status] ?? request.status}
        </Badge>
      </div>

      {request.proposed_avatar_key && (
        <AvatarImage avatarKey={request.proposed_avatar_key as AvatarKey} size="sm" />
      )}

      {changes.length > 0 && (
        <ul className="text-xs text-text-mute flex flex-col gap-0.5">
          {changes.map((c) => (
            <li key={c}>• {c}</li>
          ))}
        </ul>
      )}

      {request.status === "awaiting_fee_payment" && request.fee_amount && (
        <div className="flex items-center gap-3 mt-1">
          <span className="text-sm text-warn-ink font-semibold">
            Fee: {formatGBP(request.fee_amount)}
          </span>
          <Button size="sm" onClick={() => onPayFee(request.id)}>
            Pay fee
          </Button>
        </div>
      )}

      {request.status === "rejected" && request.resolution_note && (
        <p className="text-xs text-bad-ink italic">{request.resolution_note}</p>
      )}
    </div>
  );
}
