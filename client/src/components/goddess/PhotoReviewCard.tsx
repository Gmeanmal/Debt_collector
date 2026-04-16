import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import type { SubPhotoQueueEntry } from "@/services/goddessPhotos/goddessPhotosApi";

interface Props {
  entry: SubPhotoQueueEntry;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

interface RejectModalProps {
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

function RejectModal({ onClose, onConfirm }: RejectModalProps) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleConfirm() {
    const trimmed = reason.trim();
    if (trimmed.length < 1) {
      setErr("A rejection reason is required.");
      return;
    }
    if (trimmed.length > 500) {
      setErr("Reason must be 500 characters or fewer.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onConfirm(trimmed);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Rejection failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Reject photo" onClose={onClose}>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-base-text" htmlFor="reject-reason">
          Reason{" "}
          <span className="text-base-text-subtle font-normal">(required, max 500 chars)</span>
        </label>
        <textarea
          id="reject-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={3}
          className="bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-debt-primary"
        />
        {err && <p className="text-status-danger text-xs">{err}</p>}
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="px-3 py-1.5 text-sm text-base-text-muted border border-base-border rounded hover:text-base-text transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={busy}
          className="px-3 py-1.5 text-sm bg-debt-primary text-pink-foreground font-semibold rounded hover:bg-debt-primary-hover transition-colors disabled:opacity-50"
        >
          {busy ? "Rejecting…" : "Reject"}
        </button>
      </div>
    </Modal>
  );
}

export function PhotoReviewCard({ entry, onApprove, onReject }: Props) {
  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveErr, setApproveErr] = useState<string | null>(null);

  const subLabel = entry.sub_username ?? entry.sub_id;

  async function handleApprove() {
    setApproving(true);
    setApproveErr(null);
    try {
      await onApprove();
    } catch (e) {
      setApproveErr(e instanceof Error ? e.message : "Approval failed.");
    } finally {
      setApproving(false);
    }
  }

  return (
    <article className="bg-base-surface border border-base-border rounded-lg overflow-hidden flex flex-col">
      <div className="relative bg-base-surface-raised aspect-square overflow-hidden">
        <img
          src={entry.presigned_get_url}
          alt={`Photo submitted by ${subLabel}`}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-base-text">{subLabel}</p>
          <p className="text-xs text-base-text-muted">{formatUploadedAt(entry.uploaded_at)}</p>
          <p className="text-xs text-base-text-subtle">
            {entry.mime_type} · {formatBytes(entry.byte_size)}
          </p>
        </div>

        {approveErr && (
          <p role="alert" className="text-status-danger text-xs">
            {approveErr}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleApprove()}
            disabled={approving}
            aria-label={`Approve photo from ${subLabel}`}
            className="flex-1 px-3 py-1.5 text-xs bg-status-success/20 text-status-success border border-status-success/30 rounded font-semibold hover:bg-status-success/30 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-status-success"
          >
            {approving ? "Approving…" : "Approve"}
          </button>
          <button
            type="button"
            onClick={() => setRejectOpen(true)}
            disabled={approving}
            aria-label={`Reject photo from ${subLabel}`}
            className="flex-1 px-3 py-1.5 text-xs bg-debt-muted text-status-danger border border-debt-ring rounded font-semibold hover:bg-debt-primary/20 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-debt-primary"
          >
            Reject
          </button>
        </div>
      </div>

      {rejectOpen && <RejectModal onClose={() => setRejectOpen(false)} onConfirm={onReject} />}
    </article>
  );
}
