import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const PROOF_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const PROOF_MAX_BYTES = 5 * 1024 * 1024;

const ACCEPT_ATTR = PROOF_ALLOWED_MIME.join(",");

interface ProofUploadFieldProps {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

function isAllowedMime(mime: string): boolean {
  return (PROOF_ALLOWED_MIME as readonly string[]).includes(mime);
}

function validateFile(file: File): string | null {
  if (!isAllowedMime(file.type)) return "Only JPG / PNG / WEBP accepted, 5 MB max.";
  if (file.size > PROOF_MAX_BYTES) return "Only JPG / PNG / WEBP accepted, 5 MB max.";
  return null;
}

export function ProofUploadField({ file, onChange, disabled = false }: ProofUploadFieldProps) {
  const [error, setError] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    if (!picked) {
      onChange(null);
      setError("");
      return;
    }
    const err = validateFile(picked);
    if (err) {
      setError(err);
      onChange(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setError("");
    onChange(picked);
  }

  function handleRemove() {
    onChange(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleReplace() {
    inputRef.current?.click();
  }

  function handlePickClick() {
    inputRef.current?.click();
  }

  const helperId = "proof-helper";
  const errorId = "proof-error";
  const describedBy = [helperId, error ? errorId : ""].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="proof" className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint">
        Payment proof <span className="text-bad-ink normal-case">*</span>
      </label>
      <p id={helperId} className="text-xs text-text-faint">
        JPG, PNG or WEBP. 5 MB max. Screenshot of the transfer confirmation.
      </p>

      <input
        ref={inputRef}
        id="proof"
        name="proof"
        type="file"
        accept={ACCEPT_ATTR}
        onChange={handlePick}
        disabled={disabled}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? true : undefined}
        className="sr-only"
      />

      {!file && (
        <button
          type="button"
          onClick={handlePickClick}
          disabled={disabled}
          aria-label="Choose a payment proof file"
          className={cn(
            "border border-dashed border-line rounded-[10px] bg-bg-sunken/40 p-6",
            "flex flex-col items-center justify-center gap-2 text-center transition-colors",
            "hover:bg-accent-trace/40 hover:border-accent",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
            "disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          <span className="font-display italic text-[18px] text-text">Drop a screenshot</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint">
            or click to choose
          </span>
        </button>
      )}

      {file && previewUrl && (
        <div className="flex items-start gap-3 p-3 bg-bg-elev border border-line rounded-[10px]">
          <img
            src={previewUrl}
            alt="Payment proof preview"
            className="h-24 w-24 rounded-[6px] border border-line object-cover bg-bg-sunken"
          />
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            <p className="text-xs text-text-mute truncate font-mono" title={file.name}>
              {file.name}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={handleReplace} disabled={disabled}>
                Replace
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={disabled}>
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p id={errorId} className="text-xs text-bad-ink" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
