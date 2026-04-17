import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { queryKeys } from "@/lib/queryKeys";
import { previewInvitationApi } from "@/services/invitations/invitationsApi";

interface Props {
  invitationId: string;
  onClose: () => void;
}

export function InvitationPreviewModal({ invitationId, onClose }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.invitations.preview(invitationId),
    queryFn: () => previewInvitationApi(invitationId),
  });

  return (
    <Modal title="Email preview" onClose={onClose} size="xl">
      {isLoading && <p className="text-base-text-muted text-sm">Loading preview…</p>}
      {isError && (
        <p className="text-status-danger text-sm">Failed to load email preview.</p>
      )}
      {data && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-base-text-muted">
            <span className="font-semibold text-base-text-muted">Subject:</span>{" "}
            {data.subject}
          </p>
          <iframe
            srcDoc={data.html}
            title="Invitation email preview"
            className="w-full min-h-[500px] rounded border border-base-border bg-white"
          />
        </div>
      )}
    </Modal>
  );
}
