import { useState } from "react";

interface Props {
  selectedCount: number;
  isPending: boolean;
  onApprove: () => void;
  onReject: (reason: string) => void;
}

export function BulkActionBar({ selectedCount, isPending, onApprove, onReject }: Props) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  function handleRejectSubmit() {
    if (!reason.trim()) {
      setReasonError("Reason is required");
      return;
    }
    if (reason.length > 500) {
      setReasonError("Reason must be 500 characters or fewer");
      return;
    }
    onReject(reason.trim());
    setReason("");
    setReasonError("");
    setRejectOpen(false);
  }

  function handleOpenReject() {
    setRejectOpen(true);
    setReason("");
    setReasonError("");
  }

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
            onClick={handleOpenReject}
            disabled={isPending}
            className="px-3 py-1.5 text-sm bg-debt-muted text-status-danger border border-debt-ring rounded font-semibold hover:bg-debt-primary/20 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-debt-primary"
          >
            Reject
          </button>
        </div>
      </div>

      {rejectOpen && (
        <div className="flex flex-col gap-2 border-t border-base-border pt-3">
          <label className="text-sm font-medium text-base-text" htmlFor="bulk-reject-reason">
            Rejection reason <span className="text-status-danger">*</span>
          </label>
          <textarea
            id="bulk-reject-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setReasonError("");
            }}
            maxLength={500}
            rows={3}
            className="bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-debt-primary"
            placeholder="Explain why these items are being rejected…"
          />
          {reasonError && <p className="text-xs text-status-danger">{reasonError}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setRejectOpen(false)}
              className="px-3 py-1.5 text-sm text-base-text-muted border border-base-border rounded hover:text-base-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRejectSubmit}
              disabled={isPending}
              className="px-3 py-1.5 text-sm bg-debt-primary text-pink-foreground font-semibold rounded hover:bg-debt-primary-hover transition-colors disabled:opacity-50"
            >
              Confirm reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
