import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  trend?: ReactNode;
  accent?: "default" | "danger" | "success" | "warning";
}

const ACCENT_CLASSES: Record<NonNullable<Props["accent"]>, string> = {
  default: "text-base-text",
  danger: "text-status-danger",
  success: "text-status-success",
  warning: "text-status-warning",
};

export function StatCard({ label, value, sublabel, trend, accent = "default" }: Props) {
  return (
    <div className="bg-base-surface border border-base-border rounded-lg p-4 flex flex-col gap-1 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-base-text-muted uppercase tracking-wide font-semibold">
          {label}
        </span>
        {trend && <span className="text-xs">{trend}</span>}
      </div>
      <span
        className={`text-2xl font-bold font-display tracking-tight truncate ${ACCENT_CLASSES[accent]}`}
        role="status"
      >
        {value}
      </span>
      {sublabel && <span className="text-xs text-base-text-muted">{sublabel}</span>}
    </div>
  );
}
