import type { WeeklyPaymentBucket } from "@/services/goddess/weeklyApi";
import { Money } from "@/components/ui/money";
import { formatLondon } from "@/services/format/datetime";
import { cn } from "@/lib/utils";

interface WeekRowButtonProps {
  bucket: WeeklyPaymentBucket;
  active?: boolean;
  onOpen: (weekStart: string) => void;
}

function formatMondayLabel(weekStart: string): string {
  return formatLondon(weekStart, "date");
}

export function WeekRowButton({ bucket, active = false, onOpen }: WeekRowButtonProps) {
  const amount = Number(bucket.total);
  const mondayLabel = formatMondayLabel(bucket.week_start);
  const countLabel = `${bucket.count} ${bucket.count === 1 ? "payment" : "payments"}`;

  return (
    <button
      type="button"
      onClick={() => onOpen(bucket.week_start)}
      aria-label={`Show payments for week of ${mondayLabel}`}
      aria-current={active ? "true" : undefined}
      className={cn(
        "group w-full flex items-center justify-between gap-4 text-left",
        "bg-bg-elev border border-line rounded-[10px] px-4 py-3",
        "transition-colors duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        active
          ? "border-l-2 border-l-accent bg-accent-trace/40 text-accent-deep"
          : "hover:bg-bg-sunken/40",
      )}
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint">
          Week of
        </span>
        <span
          className={cn(
            "font-display italic text-[16px] tracking-[-0.01em] leading-none truncate",
            active ? "text-accent-deep" : "text-text",
          )}
        >
          {mondayLabel}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-mute">
          {countLabel}
        </span>
      </span>
      <Money value={amount} tone={active ? "accent" : "default"} />
    </button>
  );
}
