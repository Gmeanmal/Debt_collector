import { useState } from "react";
import { RejectModal } from "@/components/shared/RejectModal";
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

export function PhotoReviewCard({ entry, onApprove, onReject }: Props) {
  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveErr, setApproveErr] = useState<string | null>(null);

  const subLabel = entry.sub_username ? `@${entry.sub_username}` : "Unknown sub";

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

      {rejectOpen && (
        <RejectModal
          title="Reject photo"
          description={`Photo from ${subLabel}`}
          onClose={() => setRejectOpen(false)}
          onConfirm={async (reason) => {
            await onReject(reason);
            setRejectOpen(false);
          }}
        />
      )}
    </article>
  );
}
