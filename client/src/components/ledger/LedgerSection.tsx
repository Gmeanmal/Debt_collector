import type { ReactNode } from "react";
import { formatLondon } from "@/services/format/datetime";

interface Props {
  title: string;
  subtitle?: string;
  updatedAt?: string | null;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function LedgerSection({
  title,
  subtitle,
  updatedAt,
  defaultOpen = false,
  children,
}: Props) {
  return (
    <details
      open={defaultOpen}
      className="group bg-base-surface border border-base-border rounded-lg overflow-hidden"
    >
      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3 hover:bg-base-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary">
        <div className="flex flex-col min-w-0">
          <span className="font-display text-base text-pink-primary tracking-wide">{title}</span>
          <span className="text-xs text-base-text-muted uppercase tracking-wide">
            {subtitle ?? "Reported by your goddess"}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {updatedAt && (
            <span className="text-xs text-base-text-muted hidden sm:inline">
              Updated {formatLondon(updatedAt, "datetime")}
            </span>
          )}
          <span
            aria-hidden="true"
            className="text-base-text-muted transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </div>
      </summary>
      <div className="border-t border-base-border px-4 py-4">{children}</div>
    </details>
  );
}

interface LedgerEmptyProps {
  message?: string;
}

export function LedgerEmpty({ message = "Nothing recorded yet." }: LedgerEmptyProps) {
  return <p className="text-sm text-base-text-muted italic">{message}</p>;
}

interface LedgerLoadingProps {
  label?: string;
}

export function LedgerLoading({ label = "Loading…" }: LedgerLoadingProps) {
  return (
    <p className="text-sm text-base-text-muted" role="status" aria-live="polite">
      {label}
    </p>
  );
}

interface LedgerErrorProps {
  message?: string;
}

export function LedgerError({ message }: LedgerErrorProps) {
  return (
    <p className="text-sm text-status-danger">
      Failed to load: {message ?? "please try again later."}
    </p>
  );
}
