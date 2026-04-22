import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RejectModal } from "@/components/shared/RejectModal";
import { useRejectWarning } from "@/hooks/useRejectWarning";
import { rejectChangeRequestApi } from "@/services/profile/profileApi";
import { queryKeys } from "@/lib/queryKeys";

export interface RejectRequestDialogProps {
  requestId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RejectRequestDialog({ requestId, onClose, onSuccess }: RejectRequestDialogProps) {
  const qc = useQueryClient();
  const warning = useRejectWarning("profile_change");

  const mutation = useMutation({
    mutationFn: (reason: string) => rejectChangeRequestApi(requestId, { reason }),
    onSuccess: () => {
      toast.success("Request rejected");
      void qc.invalidateQueries({ queryKey: queryKeys.goddess.rateLimits() });
      onSuccess();
    },
  });

  return (
    <RejectModal
      title="Reject request"
      warning={warning}
      onClose={onClose}
      onConfirm={async (reason) => {
        await mutation.mutateAsync(reason);
      }}
    />
  );
}
