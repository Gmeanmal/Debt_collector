import type { WeeklyPaymentBucket } from "@/services/goddess/weeklyApi";
import { formatLondon } from "@/services/format/datetime";
import { formatGBP } from "@/services/format/currency";

const WEEK_PART_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  month: "short",
});

interface WeekRowButtonProps {
  bucket: WeeklyPaymentBucket;
  max: number;
  onOpen: (weekStart: string) => void;
}

function formatWeekLabel(weekStart: string, weekEnd: string): string {
  const startStr = WEEK_PART_FMT.format(new Date(weekStart));
  const endStr = formatLondon(weekEnd, "date");
  return `${startStr} – ${endStr}`;
}

function formatMondayLabel(weekStart: string): string {
  return formatLondon(weekStart, "date");
}

function setBarPct(node: HTMLElement | null, pct: number) {
  node?.style.setProperty("--bar-pct", `${pct}%`);
}

export function WeekRowButton({ bucket, max, onOpen }: WeekRowButtonProps) {
  const amount = Number(bucket.total);
  const pct = max > 0 ? (amount / max) * 100 : 0;
  const label = formatWeekLabel(bucket.week_start, bucket.week_end);
  const mondayLabel = formatMondayLabel(bucket.week_start);

  return (
    <button
      type="button"
      onClick={() => onOpen(bucket.week_start)}
      aria-label={`Show payments for week of ${mondayLabel}`}
      className="flex flex-col gap-1 w-full text-left rounded-md px-1 py-1 hover:bg-base-surface-raised/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary transition-colors"
    >
      <div className="flex items-center justify-between text-xs text-base-text-muted">
        <span>{label}</span>
        <span>
          {bucket.count} {bucket.count === 1 ? "payment" : "payments"} ·{" "}
          <span className="text-base-text font-medium">{formatGBP(amount)}</span>
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-base-surface-raised overflow-hidden">
        <div
          ref={(node) => setBarPct(node, pct)}
          className="h-full rounded-full bg-pink-primary transition-all duration-300 w-[var(--bar-pct)]"
          role="presentation"
        />
      </div>
    </button>
  );
}
