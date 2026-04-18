import { Modal } from "@/components/ui/Modal";

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

export function DeleteConfirmModal({ onConfirm, onCancel, isPending }: Props) {
  return (
    <Modal title="Delete row" onClose={onCancel} size="sm">
      <p className="text-sm text-base-text">
        This will permanently delete the row. This action cannot be undone.
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
          aria-label="Confirm delete"
          className="px-4 py-2 text-sm rounded-md bg-status-danger text-base-bg font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Deleting…" : "Delete"}
        </button>
      </div>
    </Modal>
  );
}
