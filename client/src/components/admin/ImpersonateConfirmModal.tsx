import { Modal } from "@/components/ui/Modal";

interface Props {
  displayName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

export function ImpersonateConfirmModal({ displayName, onConfirm, onCancel, isPending }: Props) {
  return (
    <Modal title="Impersonate user" onClose={onCancel} size="sm">
      <p className="text-sm text-base-text">
        You are about to impersonate <strong>{displayName}</strong>. All your actions will be
        logged to the audit trail. Continue?
      </p>
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="px-4 py-2 text-sm rounded-md bg-base-surface-raised border border-base-border text-base-text hover:bg-base-surface disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          aria-label={`Confirm impersonation of ${displayName}`}
          className="px-4 py-2 text-sm rounded-md bg-pink-primary text-pink-foreground font-semibold hover:bg-pink-primary-hover disabled:opacity-50"
        >
          {isPending ? "Impersonating…" : "Impersonate"}
        </button>
      </div>
    </Modal>
  );
}
