import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  ariaLabel: string;
}

export function ChartPanel({ title, description, children, className, ariaLabel }: Props) {
  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        "rounded-lg bg-base-surface border border-base-border p-5 flex flex-col gap-3",
        className,
      )}
    >
      <div>
        <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-base-text-subtle">
          {title}
        </h3>
        {description && <p className="mt-0.5 text-xs text-base-text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-base-surface border border-base-border p-5 flex flex-col gap-3",
        className,
      )}
    >
      <div className="h-3 w-1/3 rounded bg-base-surface-raised animate-pulse" />
      <div className="h-40 rounded bg-base-surface-raised animate-pulse" />
    </div>
  );
}

export function ChartError({ message }: { message: string }) {
  return (
    <p className="text-sm text-status-danger" role="alert">
      {message}
    </p>
  );
}
