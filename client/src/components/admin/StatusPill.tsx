const STATUS_STYLES: Record<string, string> = {
  active: "bg-status-success/15 text-status-success",
  pending_entry_tribute: "bg-status-warning/15 text-status-warning",
  pending_validation: "bg-status-info/15 text-status-info",
  blacklisted: "bg-status-danger/15 text-status-danger",
  deleted: "bg-base-surface-raised text-base-text-subtle",
};

const FALLBACK = "bg-base-surface-raised text-base-text-muted";

interface Props {
  value: unknown;
}

export function StatusPill({ value }: Props) {
  const str = value == null ? "" : String(value);
  const cls = STATUS_STYLES[str] ?? FALLBACK;
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${cls}`}
    >
      {str || "—"}
    </span>
  );
}

