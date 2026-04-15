import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { setFeeChangeRequestApi } from "@/services/profile/profileApi";

interface SetFeeRequestDialogProps {
  requestId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function SetFeeRequestDialog({ requestId, onClose, onSuccess }: SetFeeRequestDialogProps) {
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      const val = parseFloat(amount);
      return setFeeChangeRequestApi(requestId, { fee_amount: val });
    },
    onSuccess: () => {
      toast.success("Fee set");
      onSuccess();
    },
    onError: () => toast.error("Failed to set fee"),
  });

  function handleSubmit() {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setAmountError("Enter a valid positive amount");
      return;
    }
    setAmountError("");
    mutation.mutate();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Set fee</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fee_amount">Fee amount (£)</Label>
            <Input
              id="fee_amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setAmountError("");
              }}
              placeholder="5.00"
            />
            {amountError && <p className="text-xs text-status-danger">{amountError}</p>}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending}>
              {mutation.isPending ? "Setting…" : "Set fee"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
