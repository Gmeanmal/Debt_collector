import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { rejectChangeRequestApi } from "@/services/profile/profileApi";

interface RejectRequestDialogProps {
  requestId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RejectRequestDialog({ requestId, onClose, onSuccess }: RejectRequestDialogProps) {
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () => rejectChangeRequestApi(requestId, { note: note.trim() || null }),
    onSuccess: () => {
      toast.success("Request rejected");
      onSuccess();
    },
    onError: () => toast.error("Failed to reject"),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reject request</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reject_note">Note (optional)</Label>
            <textarea
              id="reject_note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for rejection…"
              className="flex min-h-[80px] w-full rounded-md border border-base-border bg-base-surface-raised/60 px-4 py-2 text-sm text-base-text placeholder:text-base-text-subtle focus:border-pink-primary/60 focus:outline-none focus:ring-2 focus:ring-pink-ring resize-y"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Rejecting…" : "Reject"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
