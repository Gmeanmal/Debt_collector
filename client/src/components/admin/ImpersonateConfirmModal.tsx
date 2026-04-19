import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";

interface Props {
  displayName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

export function ImpersonateConfirmModal({ displayName, onConfirm, onCancel, isPending }: Props) {
  return (
    <Modal title="Impersonate user" onClose={onCancel} size="sm">
      <p className="text-sm text-text">
        You are about to impersonate <strong>{displayName}</strong>. All your actions will be logged
        to the audit trail. Continue?
      </p>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="ink"
          size="sm"
          onClick={onConfirm}
          disabled={isPending}
          aria-label={`Confirm impersonation of ${displayName}`}
        >
          {isPending ? "Impersonating…" : "Impersonate"}
        </Button>
      </div>
    </Modal>
  );
}
