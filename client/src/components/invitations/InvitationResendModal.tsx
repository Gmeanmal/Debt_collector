import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { resendInvitationApi } from "@/services/invitations/invitationsApi";

interface Props {
  invitationId: string;
  onClose: () => void;
}

export function InvitationResendModal({ invitationId, onClose }: Props) {
  const [email, setEmail] = useState("");

  const mutation = useMutation({
    mutationFn: (addr: string) => resendInvitationApi(invitationId, addr),
    onSuccess: (_data, addr) => {
      toast.success(`Email sent to ${addr}`);
      onClose();
    },
    onError: (err: unknown) => {
      const status = (err as { status?: number }).status;
      if (status === 409) {
        toast.error("Invitation is no longer active");
      } else {
        toast.error("Failed to send email");
      }
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (email) mutation.mutate(email);
  }

  return (
    <Modal title="Resend invitation email" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="resend-email" className="text-sm font-medium text-text-mute">
            Email address
          </label>
          <input
            id="resend-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sub@example.com"
            className="bg-bg-sunken border border-line rounded-md px-3 py-2 text-text placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          disabled={mutation.isPending || !email}
          className="w-full"
        >
          {mutation.isPending && (
            <span className="inline-block w-3 h-3 border-2 border-accent-ink/30 border-t-accent-ink rounded-full animate-spin" />
          )}
          {mutation.isPending ? "Sending…" : "Send"}
        </Button>
      </form>
    </Modal>
  );
}
