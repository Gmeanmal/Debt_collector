import { Button } from "@/components/ui/button";
import type { ProfileChangeRequestOut } from "@/services/profile/profileApi";
import { AvatarImage } from "@/components/profile/AvatarImage";
import type { AvatarKey } from "@/services/profile/avatarMap";
import { formatLondon } from "@/services/format/datetime";

interface ProfileRequestCardProps {
  request: ProfileChangeRequestOut;
  subDisplayName: string;
  subAvatarKey: AvatarKey;
  onApprove: () => void;
  onReject: () => void;
  onSetFee: () => void;
  isApproving: boolean;
}

export function ProfileRequestCard({
  request,
  subDisplayName,
  subAvatarKey,
  onApprove,
  onReject,
  onSetFee,
  isApproving,
}: ProfileRequestCardProps) {
  const date = formatLondon(request.requested_at, "date");

  const changes: string[] = [];
  if (request.proposed_first_name) changes.push(`First name → ${request.proposed_first_name}`);
  if (request.proposed_last_name) changes.push(`Last name → ${request.proposed_last_name}`);
  if (request.proposed_display_name)
    changes.push(`Display name → ${request.proposed_display_name}`);
  if (request.proposed_avatar_key) changes.push(`Avatar → ${request.proposed_avatar_key}`);
  if (request.proposed_notes) changes.push(`Notes: ${request.proposed_notes}`);

  const isPending = request.status === "pending";
  const isAwaitingFee = request.status === "awaiting_fee_payment";

  return (
    <div className="bg-bg-elev border border-line rounded-[10px] p-[18px] flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <AvatarImage avatarKey={subAvatarKey} size="sm" />
          <div>
            <p className="font-medium text-text text-sm">{subDisplayName}</p>
            <p className="text-xs text-text-mute">{date}</p>
          </div>
        </div>
        {request.proposed_avatar_key && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-mute">Proposed:</span>
            <AvatarImage avatarKey={request.proposed_avatar_key as AvatarKey} size="sm" />
          </div>
        )}
      </div>

      {changes.length > 0 && (
        <ul className="text-xs text-text-mute flex flex-col gap-0.5">
          {changes.map((c) => (
            <li key={c}>• {c}</li>
          ))}
        </ul>
      )}

      {(isPending || isAwaitingFee) && (
        <div className="flex gap-2 flex-wrap pt-1">
          {isPending && (
            <Button size="sm" onClick={onApprove} disabled={isApproving}>
              {isApproving ? "Approving…" : "Approve"}
            </Button>
          )}
          {isPending && (
            <Button size="sm" variant="ghost" onClick={onSetFee}>
              Set fee
            </Button>
          )}
          <Button size="sm" variant="danger" onClick={onReject}>
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
