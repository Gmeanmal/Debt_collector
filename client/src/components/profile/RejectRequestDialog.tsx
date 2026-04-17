import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { RejectModal } from "@/components/shared/RejectModal";
import { rejectChangeRequestApi } from "@/services/profile/profileApi";

export interface RejectRequestDialogProps {
  requestId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RejectRequestDialog({ requestId, onClose, onSuccess }: RejectRequestDialogProps) {
  const mutation = useMutation({
    mutationFn: (reason: string) => rejectChangeRequestApi(requestId, { reason }),
    onSuccess: () => {
      toast.success("Request rejected");
      onSuccess();
    },
  });

  return (
    <RejectModal
      title="Reject request"
      onClose={onClose}
      onConfirm={async (reason) => {
        await mutation.mutateAsync(reason);
      }}
    />
  );
}
