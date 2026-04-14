import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  trend?: ReactNode;
  accent?: "default" | "danger" | "success" | "warning";
}

const ACCENT_VALUE: Record<NonNullable<Props["accent"]>, string> = {
  default: "text-base-text",
  danger: "text-status-danger",
  success: "text-status-success",
  warning: "text-status-warning",
};

const ACCENT_GLOW: Record<NonNullable<Props["accent"]>, string> = {
  default: "before:bg-pink-primary/20",
  danger: "before:bg-status-danger/30",
  success: "before:bg-status-success/30",
  warning: "before:bg-status-warning/30",
};

export function StatCard({ label, value, sublabel, trend, accent = "default" }: Props) {
  return (
    <div
      className={cn(
        "luxe-surface relative isolate overflow-hidden rounded-lg p-5 flex flex-col gap-2 min-w-0 transition-all duration-300",
        "before:absolute before:inset-x-0 before:-top-px before:h-px",
        "after:absolute after:inset-0 after:bg-[radial-gradient(ellipse_at_top,rgba(255,79,163,0.08),transparent_60%)] after:opacity-0 after:transition-opacity after:duration-300",
        "hover:after:opacity-100",
        ACCENT_GLOW[accent],
      )}
    >
      <div className="relative z-10 flex items-start justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-base-text-subtle">
          {label}
        </span>
        {trend && <span className="text-xs">{trend}</span>}
      </div>
      <span
        className={cn(
          "relative z-10 font-display text-4xl tracking-tight truncate leading-none",
          ACCENT_VALUE[accent],
        )}
        role="status"
      >
        {value}
      </span>
      {sublabel && <span className="relative z-10 text-xs text-base-text-muted">{sublabel}</span>}
    </div>
  );
}
