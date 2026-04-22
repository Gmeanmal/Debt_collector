import { useState } from "react";
import { RejectModal } from "@/components/shared/RejectModal";
import { useRejectWarning } from "@/hooks/useRejectWarning";
import type { SubPhotoQueueEntry } from "@/services/goddessPhotos/goddessPhotosApi";
import { formatLondon } from "@/services/format/datetime";
import { Button } from "@/components/ui/button";

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
  return formatLondon(iso, "datetime");
}

export function PhotoReviewCard({ entry, onApprove, onReject }: Props) {
  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveErr, setApproveErr] = useState<string | null>(null);
  const warning = useRejectWarning("photo");

  const subUsername = entry.sub_username ? `@${entry.sub_username}` : "Unknown sub";

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
    <article className="bg-bg-elev border border-line rounded-[10px] overflow-hidden flex flex-col">
      <div className="relative bg-bg-sunken aspect-square overflow-hidden">
        <img
          src={entry.presigned_get_url}
          alt={`Photo submitted by ${subUsername}`}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-[18px] flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="font-mono text-[11px] tracking-[0.08em] text-text-faint">{subUsername}</p>
          <p className="text-xs text-text-mute">{formatUploadedAt(entry.uploaded_at)}</p>
          <p className="text-xs text-text-faint">
            {entry.mime_type} · {formatBytes(entry.byte_size)}
          </p>
        </div>

        {approveErr && (
          <p role="alert" className="text-bad-ink text-xs">
            {approveErr}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            variant="soft"
            size="sm"
            className="flex-1"
            onClick={() => void handleApprove()}
            disabled={approving}
            aria-label={`Approve photo from ${subUsername}`}
          >
            {approving ? "Approving…" : "Approve"}
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="flex-1"
            onClick={() => setRejectOpen(true)}
            disabled={approving}
            aria-label={`Reject photo from ${subUsername}`}
          >
            Reject
          </Button>
        </div>
      </div>

      {rejectOpen && (
        <RejectModal
          title="Reject photo"
          description={`Photo from ${subUsername}`}
          warning={warning}
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
