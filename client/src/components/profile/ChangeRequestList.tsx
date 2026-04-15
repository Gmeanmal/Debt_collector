import { Button } from "@/components/ui/button";
import type { ProfileChangeRequestOut } from "@/services/profile/profileApi";
import { AvatarImage } from "@/components/profile/AvatarImage";
import type { AvatarKey } from "@/services/profile/avatarMap";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  awaiting_fee_payment: "Fee required",
  cancelled: "Cancelled",
};

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-status-info/15 text-status-info border-status-info/30",
  approved: "bg-status-success/15 text-status-success border-status-success/30",
  rejected: "bg-status-danger/15 text-status-danger border-status-danger/30",
  awaiting_fee_payment: "bg-status-warning/15 text-status-warning border-status-warning/30",
  cancelled: "bg-base-surface-raised text-base-text-muted border-base-border",
};

interface ChangeRequestListProps {
  requests: ProfileChangeRequestOut[];
  onPayFee: (requestId: string) => void;
}

export function ChangeRequestList({ requests, onPayFee }: ChangeRequestListProps) {
  if (requests.length === 0) {
    return <p className="text-sm text-base-text-muted">No change requests submitted yet.</p>;
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
  const date = new Date(request.requested_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const changes: string[] = [];
  if (request.proposed_first_name) changes.push(`First name → ${request.proposed_first_name}`);
  if (request.proposed_last_name) changes.push(`Last name → ${request.proposed_last_name}`);
  if (request.proposed_display_name)
    changes.push(`Display name → ${request.proposed_display_name}`);
  if (request.proposed_avatar_key) changes.push(`Avatar → ${request.proposed_avatar_key}`);
  if (request.proposed_notes) changes.push(`Notes: ${request.proposed_notes}`);

  return (
    <div className="rounded-lg border border-base-border bg-base-surface-raised/40 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-base-text-muted">{date}</span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_CLASSES[request.status] ?? ""}`}
        >
          {STATUS_LABELS[request.status] ?? request.status}
        </span>
      </div>

      {request.proposed_avatar_key && (
        <AvatarImage avatarKey={request.proposed_avatar_key as AvatarKey} size="sm" />
      )}

      {changes.length > 0 && (
        <ul className="text-xs text-base-text-muted flex flex-col gap-0.5">
          {changes.map((c) => (
            <li key={c}>• {c}</li>
          ))}
        </ul>
      )}

      {request.status === "awaiting_fee_payment" && request.fee_amount && (
        <div className="flex items-center gap-3 mt-1">
          <span className="text-sm text-status-warning font-semibold">
            Fee: £{Number(request.fee_amount).toFixed(2)}
          </span>
          <Button size="sm" onClick={() => onPayFee(request.id)}>
            Pay fee
          </Button>
        </div>
      )}

      {request.status === "rejected" && request.resolution_note && (
        <p className="text-xs text-status-danger italic">{request.resolution_note}</p>
      )}
    </div>
  );
}
