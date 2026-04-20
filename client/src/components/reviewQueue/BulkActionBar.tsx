import { useState } from "react";
import { RejectModal } from "@/components/shared/RejectModal";
import { Button } from "@/components/ui/button";

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
    <div className="sticky top-0 z-20 bg-bg-elev border border-line rounded-[10px] shadow-md p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-sm font-medium text-text">{selectedCount} selected</span>
        <div className="flex gap-2">
          <Button variant="soft" size="sm" onClick={onApprove} disabled={isPending}>
            Approve
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setRejectOpen(true)}
            disabled={isPending}
          >
            Reject
          </Button>
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
