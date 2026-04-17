import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
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
          <label htmlFor="resend-email" className="text-sm font-medium text-base-text-muted">
            Email address
          </label>
          <input
            id="resend-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sub@example.com"
            className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-base-text placeholder:text-base-text-subtle focus:outline-none focus:ring-2 focus:ring-pink-primary"
          />
        </div>
        <button
          type="submit"
          disabled={mutation.isPending || !email}
          className="w-full bg-pink-primary text-pink-foreground font-semibold py-2 px-4 rounded-md hover:bg-pink-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-pink-primary focus:ring-offset-2 focus:ring-offset-base-surface disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {mutation.isPending && (
            <span className="inline-block w-3 h-3 border-2 border-pink-foreground/30 border-t-pink-foreground rounded-full animate-spin" />
          )}
          {mutation.isPending ? "Sending…" : "Send"}
        </button>
      </form>
    </Modal>
  );
}
