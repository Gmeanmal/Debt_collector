import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/Modal";
import { queryKeys } from "@/lib/queryKeys";
import { sendGoddessMessageToSub } from "@/services/goddessSubDetail/goddessSubDetailApi";

const MIN_LENGTH = 5;
const MAX_LENGTH = 500;

interface Props {
  username: string;
  displayName: string;
}

interface MessageFormProps {
  displayName: string;
  onClose: () => void;
  onSend: (body: string) => void;
  isPending: boolean;
}

function MessageForm({ displayName, onClose, onSend, isPending }: MessageFormProps) {
  const [body, setBody] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = body.trim();
  const tooShort = trimmed.length < MIN_LENGTH;
  const disabled = tooShort || isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    onSend(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-base-text-muted">
        This message will appear in {displayName}&apos;s notification drawer.
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="goddess-message-body" className="text-sm font-medium text-base-text">
          Message <span className="text-status-danger">*</span>
        </label>
        <textarea
          id="goddess-message-body"
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={MAX_LENGTH}
          rows={4}
          placeholder="Write your message…"
          className="bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
          aria-describedby="goddess-message-count"
        />
        <span id="goddess-message-count" className="text-xs text-base-text-subtle text-right">
          {body.length}/{MAX_LENGTH}
        </span>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={disabled}
          aria-label={`Send message to ${displayName}`}
        >
          {isPending ? "Sending…" : "Send"}
        </Button>
      </div>
    </form>
  );
}

export function SendMessageQuickAction({ username, displayName }: Props) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (body: string) => sendGoddessMessageToSub(username, body),
    onSuccess: () => {
      toast.success(`Message sent to ${displayName}`);
      setOpen(false);
      void qc.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to send message");
    },
  });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={`Send message to ${displayName}`}
      >
        <MessageCircle size={15} aria-hidden="true" />
        Message
      </Button>

      {open && (
        <Modal title={`Message ${displayName}`} onClose={() => setOpen(false)}>
          <MessageForm
            displayName={displayName}
            onClose={() => setOpen(false)}
            onSend={(body) => mutation.mutate(body)}
            isPending={mutation.isPending}
          />
        </Modal>
      )}
    </>
  );
}
