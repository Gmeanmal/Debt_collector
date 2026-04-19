import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/eyebrow";

interface Props {
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  trend?: ReactNode;
  accent?: "default" | "danger" | "success" | "warning";
}

const ACCENT_VALUE: Record<NonNullable<Props["accent"]>, string> = {
  default: "text-text",
  danger: "text-bad-ink",
  success: "text-ok-ink",
  warning: "text-warn-ink",
};

export function StatCard({ label, value, sublabel, trend, accent = "default" }: Props) {
  return (
    <div className="bg-bg-elev border border-line rounded-[10px] p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <Eyebrow>{label}</Eyebrow>
        {trend && <span className="text-xs text-text-mute">{trend}</span>}
      </div>
      <span
        className={cn(
          "font-display italic font-medium text-[30px] tracking-[-0.02em] leading-none truncate tabular-nums",
          ACCENT_VALUE[accent],
        )}
        role="status"
      >
        {value}
      </span>
      {sublabel && <span className="text-[11px] text-text-mute">{sublabel}</span>}
    </div>
  );
}
