import { useEffect, useRef, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";

export interface RejectModalProps {
  title?: string;
  description?: ReactNode;
  confirmLabel?: string;
  placeholder?: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

const MIN_LENGTH = 5;
const MAX_LENGTH = 500;
const INLINE_ERROR = `Reason must be at least ${MIN_LENGTH} characters.`;

export function RejectModal({
  title = "Reject",
  description,
  confirmLabel = "Reject",
  placeholder,
  onClose,
  onConfirm,
}: RejectModalProps) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const trimmed = reason.trim();
  const tooShort = trimmed.length < MIN_LENGTH;
  const confirmDisabled = tooShort || pending;

  async function handleConfirm() {
    if (confirmDisabled) return;
    setPending(true);
    setSubmitError(null);
    try {
      await onConfirm(trimmed);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Rejection failed.");
      setPending(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      {description && <p className="text-sm text-text-mute">{description}</p>}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text" htmlFor="reject-reason-input">
          Reason <span className="text-bad-ink">*</span>
        </label>
        <textarea
          id="reject-reason-input"
          ref={textareaRef}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setSubmitError(null);
          }}
          maxLength={MAX_LENGTH}
          rows={3}
          placeholder={placeholder}
          className="bg-bg-sunken border border-line rounded-[6px] px-3 py-2 text-text placeholder:text-text-faint text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <div className="flex justify-between items-start gap-2">
          {tooShort && reason.length > 0 ? (
            <p className="text-bad-ink text-xs">{INLINE_ERROR}</p>
          ) : (
            <span />
          )}
          <span className="text-text-faint text-xs ml-auto">
            {reason.length}/{MAX_LENGTH}
          </span>
        </div>
        {submitError && <p className="text-bad-ink text-xs">{submitError}</p>}
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={onClose}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          size="sm"
          type="button"
          onClick={() => void handleConfirm()}
          disabled={confirmDisabled}
        >
          {pending ? "Rejecting…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
