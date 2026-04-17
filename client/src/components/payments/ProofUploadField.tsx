import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

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
      // Reset the native input so the same bad file can be re-picked after fixing.
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

  const helperId = "proof-helper";
  const errorId = "proof-error";
  const describedBy = [helperId, error ? errorId : ""].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="proof" className="text-sm font-semibold text-base-text">
        Payment proof <span className="text-status-danger font-normal">*</span>
      </label>
      <p id={helperId} className="text-xs text-base-text-subtle">
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
        className={cn(
          "block w-full text-sm text-base-text",
          "file:mr-3 file:rounded-md file:border-0 file:bg-pink-primary file:px-3 file:py-2",
          "file:text-sm file:font-semibold file:text-pink-foreground",
          "file:hover:bg-pink-primary-hover file:cursor-pointer",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary rounded-md",
          file ? "sr-only" : "",
        )}
      />

      {file && previewUrl && (
        <div className="flex items-start gap-3">
          <img
            src={previewUrl}
            alt="Payment proof preview"
            className="h-24 w-24 rounded-md border border-base-border object-cover"
          />
          <div className="flex flex-col gap-2 min-w-0">
            <p className="text-xs text-base-text-muted truncate" title={file.name}>
              {file.name}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleReplace}
                disabled={disabled}
                className="px-3 py-1 text-xs border border-base-border rounded-md text-base-text hover:bg-base-surface-raised focus-visible:ring-2 focus-visible:ring-pink-primary disabled:opacity-50"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                className="px-3 py-1 text-xs border border-base-border rounded-md text-base-text-muted hover:text-status-danger focus-visible:ring-2 focus-visible:ring-pink-primary disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p id={errorId} className="text-xs text-status-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
