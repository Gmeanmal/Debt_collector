import { cn } from "@/lib/utils";
import { ChartPanel, ChartError } from "@/components/dashboard/ChartPanel";
import { formatGBP } from "@/services/format/currency";
import { bucketTotalGBP } from "@/services/dashboards/subDashboardFormat";
import type { MonthlyRevenueBucket } from "@/types/dashboard";

interface Props {
  data: MonthlyRevenueBucket[];
  error?: string;
}

const MONTH_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
});

const MONTH_NAME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  month: "long",
});

function currentAndPrevMonths(): { current: string; prev: string } {
  const now = new Date();
  const current = MONTH_FMT.format(now);

  const d = new Date(now);
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  const prev = MONTH_FMT.format(d);

  return { current, prev };
}

function monthLabel(isoMonth: string): string {
  const [year, month] = isoMonth.split("-");
  if (!year || !month) return isoMonth;
  const d = new Date(Number(year), Number(month) - 1, 1);
  return MONTH_NAME_FMT.format(d);
}

export function MonthlyDeltaTile({ data, error }: Props) {
  const { current, prev } = currentAndPrevMonths();

  const currentBucket = data.find((b) => b.month === current);
  const prevBucket = data.find((b) => b.month === prev);

  const currentTotal = currentBucket ? bucketTotalGBP(currentBucket) : "0.00";
  const prevTotal = prevBucket ? bucketTotalGBP(prevBucket) : "0.00";

  const prevLabel = monthLabel(prev);

  let deltaText = "";
  let deltaClass = "text-base-text-muted";

  const currentNum = Number(currentTotal);
  const prevNum = Number(prevTotal);

  if (prevNum > 0) {
    const pct = Math.round(((currentNum - prevNum) / prevNum) * 100);
    const sign = pct >= 0 ? "+" : "";
    deltaText = `${sign}${pct}% vs ${prevLabel}`;
    if (pct > 0) deltaClass = "text-status-success";
    else if (pct < 0) deltaClass = "text-status-danger";
  } else if (currentNum > 0) {
    deltaText = `New revenue · ${prevLabel} had none`;
    deltaClass = "text-status-success";
  } else {
    deltaText = `No revenue yet this month`;
  }

  return (
    <ChartPanel
      title="This month collected"
      description="Total validated payments in the current calendar month (Europe/London)"
      ariaLabel="This month versus last month collected tile"
    >
      {error ? (
        <ChartError message={error} />
      ) : (
        <div className="flex flex-col gap-1 py-2">
          <p
            className="tabular-nums font-display text-3xl italic text-base-text"
            role="status"
            aria-label={`This month collected: ${formatGBP(currentNum)}`}
          >
            {formatGBP(currentNum)}
          </p>
          <p className={cn("text-xs font-medium", deltaClass)}>{deltaText}</p>
        </div>
      )}
    </ChartPanel>
  );
}
