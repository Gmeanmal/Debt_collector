import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./eyebrow";

interface SectionTitleProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  actions,
  className,
}: SectionTitleProps) {
  return (
    <div className={cn("flex items-end gap-5 mb-5", className)}>
      <div className="flex-1 min-w-0">
        {eyebrow && (
          <div className="mb-2">
            <Eyebrow tone="accent">{eyebrow}</Eyebrow>
          </div>
        )}
        <h2 className="font-display italic text-[28px] tracking-[-0.02em] text-text leading-[1.05]">
          {title}
        </h2>
        {description && <p className="text-sm text-text-mute mt-1 max-w-prose">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
