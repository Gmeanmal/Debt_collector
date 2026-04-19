import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/eyebrow";

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
        "bg-bg-elev border border-line rounded-[10px] p-5 flex flex-col gap-3",
        className,
      )}
    >
      <div>
        <Eyebrow>{title}</Eyebrow>
        {description && (
          <p className="mt-1 text-[11px] text-text-mute">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-bg-elev border border-line rounded-[10px] p-5 flex flex-col gap-3",
        className,
      )}
    >
      <div className="h-3 w-1/3 rounded bg-bg-sunken animate-pulse" />
      <div className="h-40 rounded bg-bg-sunken animate-pulse" />
    </div>
  );
}

export function ChartError({ message }: { message: string }) {
  return (
    <p className="text-sm text-bad-ink" role="alert">
      {message}
    </p>
  );
}
