import { useId, useRef, useState, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface PreviewVariant {
  kind: "preview";
  previewContent: ReactNode;
}

interface TypedConfirmVariant {
  kind: "typedConfirm";
  expectedString: string;
  confirmPrompt?: string;
}

interface SimpleVariant {
  kind: "simple";
}

type ModalVariant = PreviewVariant | TypedConfirmVariant | SimpleVariant;

interface BaseProps {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  isLoading?: boolean;
  isDestructive?: boolean;
  error?: string | null;
}

export type ConfirmActionModalProps = BaseProps & ModalVariant;

export function ConfirmActionModal(props: ConfirmActionModalProps) {
  const {
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    onConfirm,
    onClose,
    isLoading = false,
    isDestructive = false,
    error,
  } = props;

  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocused = useRef<HTMLElement | null>(null);
  const inputId = useId();
  const [typedValue, setTypedValue] = useState("");

  const isTypedConfirm = props.kind === "typedConfirm";
  const expectedString = props.kind === "typedConfirm" ? props.expectedString : "";
  const confirmPrompt =
    props.kind === "typedConfirm"
      ? (props.confirmPrompt ?? `Type "${props.expectedString}" to confirm`)
      : "";

  const confirmDisabled = isLoading || (isTypedConfirm && typedValue !== expectedString);

  useEffect(() => {
    prevFocused.current = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    if (node) {
      const focusables = node.querySelectorAll<HTMLElement>(FOCUSABLE);
      const first = focusables[0];
      if (first) first.focus();
      else node.focus();
    }
    return () => {
      prevFocused.current?.focus();
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const node = dialogRef.current;
      if (!node) return;
      const focusables = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("disabled"),
      );
      if (focusables.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-400/55 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${inputId}-title`}
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-bg-elev border border-line rounded-[10px] w-full max-w-md p-6 shadow-md flex flex-col gap-4 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2
            id={`${inputId}-title`}
            className={cn(
              "font-serif italic text-[20px]",
              isDestructive ? "text-bad-ink" : "text-text",
            )}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-text-faint hover:text-text focus-visible:ring-2 focus-visible:ring-accent rounded"
          >
            ✕
          </button>
        </div>

        {/* Description */}
        {description && <div className="text-sm text-text-mute">{description}</div>}

        {/* Preview block */}
        {props.kind === "preview" && (
          <div className="bg-bg-sunken border border-line rounded-[6px] p-4">
            {props.previewContent}
          </div>
        )}

        {/* Typed confirm input */}
        {isTypedConfirm && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-sm text-text">
              {confirmPrompt}
            </label>
            <input
              id={inputId}
              type="text"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              autoComplete="off"
              aria-label={confirmPrompt}
              className="bg-bg-sunken border border-line rounded-[6px] px-3 py-2 text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        )}

        {/* Error */}
        {error && <p className="text-xs text-bad-ink">{error}</p>}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? "danger" : "primary"}
            size="sm"
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            aria-label={confirmLabel}
          >
            {isLoading ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
