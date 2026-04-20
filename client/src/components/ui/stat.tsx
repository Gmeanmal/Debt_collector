import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./eyebrow";

type StatTone = "default" | "accent" | "ok" | "warn" | "bad";
type StatSize = "md" | "lg";

interface StatProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: StatTone;
  size?: StatSize;
  className?: string;
}

const toneClass: Record<StatTone, string> = {
  default: "text-text",
  accent: "text-accent-deep",
  ok: "text-ok-ink",
  warn: "text-warn-ink",
  bad: "text-bad-ink",
};

const sizeClass: Record<StatSize, string> = {
  md: "text-[30px]",
  lg: "text-[40px]",
};

export function Stat({ label, value, sub, tone = "default", size = "md", className }: StatProps) {
  return (
    <div className={cn("bg-bg-elev border border-line rounded-[10px] p-4", className)}>
      <div className="mb-3">
        <Eyebrow>{label}</Eyebrow>
      </div>
      <div
        className={cn(
          "font-display italic font-medium leading-none tracking-[-0.02em]",
          sizeClass[size],
          toneClass[tone],
        )}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-text-mute mt-2">{sub}</div>}
    </div>
  );
}
