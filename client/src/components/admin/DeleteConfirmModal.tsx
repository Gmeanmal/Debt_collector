import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

export function DeleteConfirmModal({ onConfirm, onCancel, isPending }: Props) {
  return (
    <Modal title="Delete row" onClose={onCancel} size="sm">
      <p className="text-sm text-text">
        This will permanently delete the row. This action cannot be undone.
      </p>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={onConfirm}
          disabled={isPending}
          aria-label="Confirm delete"
        >
          {isPending ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </Modal>
  );
}
