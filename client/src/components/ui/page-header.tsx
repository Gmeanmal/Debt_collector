import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./eyebrow";

interface PageHeaderProps {
  crumbs?: string[];
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  crumbs,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("pb-5 mb-5 border-b border-line", className)}>
      {crumbs && crumbs.length > 0 && (
        <div className="mb-2">
          <Eyebrow>{crumbs.join(" · ")}</Eyebrow>
        </div>
      )}
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display italic text-[24px] tracking-[-0.01em] text-text leading-[1.1]">
          {title}
        </h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {description && (
        <p className="text-sm text-text-mute mt-1 max-w-prose">{description}</p>
      )}
    </header>
  );
}
