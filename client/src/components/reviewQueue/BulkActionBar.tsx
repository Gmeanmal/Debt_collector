import { useState } from "react";
import { RejectModal } from "@/components/shared/RejectModal";

interface Props {
  selectedCount: number;
  isPending: boolean;
  onApprove: () => void;
  onReject: (reason: string) => void;
}

export function BulkActionBar({ selectedCount, isPending, onApprove, onReject }: Props) {
  const [rejectOpen, setRejectOpen] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-20 bg-base-surface border border-base-border rounded-lg shadow-[var(--shadow-card)] p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-sm font-medium text-base-text">{selectedCount} selected</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={isPending}
            className="px-3 py-1.5 text-sm bg-status-success/20 text-status-success border border-status-success/30 rounded font-semibold hover:bg-status-success/30 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-status-success"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => setRejectOpen(true)}
            disabled={isPending}
            className="px-3 py-1.5 text-sm bg-debt-muted text-status-danger border border-debt-ring rounded font-semibold hover:bg-debt-primary/20 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-debt-primary"
          >
            Reject
          </button>
        </div>
      </div>

      {rejectOpen && (
        <RejectModal
          title="Reject selected"
          description={`Reject ${selectedCount} selected item${selectedCount === 1 ? "" : "s"}`}
          placeholder="Explain why these items are being rejected…"
          onClose={() => setRejectOpen(false)}
          onConfirm={async (reason) => {
            onReject(reason);
            setRejectOpen(false);
          }}
        />
      )}
    </div>
  );
}
