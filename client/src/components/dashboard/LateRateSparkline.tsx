import { LineChart, Line, Tooltip, ResponsiveContainer } from "recharts";
import type { TooltipContentProps } from "recharts";
import { chartColor, CHART_COLORS } from "@/services/dashboard/chartColors";
import { ChartPanel, ChartError } from "@/components/dashboard/ChartPanel";
import type { DailyLateCount } from "@/types/dashboard";
import type { DateRange } from "@/hooks/useDashboardDateRange";

interface Props {
  data: DailyLateCount[];
  error?: string;
  dateRange?: DateRange;
}

function filterByRange(data: DailyLateCount[], range: DateRange): DailyLateCount[] {
  return data.filter((d) => d.date >= range.from && d.date <= range.to);
}

function CustomTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value ?? 0;
  return (
    <div
      className="rounded-md border border-base-border bg-base-surface-raised px-3 py-2 text-xs shadow-lg"
      role="tooltip"
    >
      <p className="text-base-text-muted">{label}</p>
      <p className="font-medium text-status-danger">
        {value} {value === 1 ? "sub late" : "subs late"}
      </p>
    </div>
  );
}

export function LateRateSparkline({ data, error, dateRange }: Props) {
  const filtered = dateRange ? filterByRange(data, dateRange) : data;
  const total = filtered.reduce((sum, d) => sum + d.count, 0);

  const chartData = filtered.map((d) => ({
    date: d.date.slice(5),
    count: d.count,
  }));

  return (
    <ChartPanel
      title={`30-day late rate · ${total} total`}
      description="Subs late per day (rolling tribute)"
      ariaLabel="30-day late rate sparkline"
    >
      {error ? (
        <ChartError message={error} />
      ) : (
        <>
          <p className="sr-only">
            {total === 0
              ? "No late payments in the last 30 days."
              : `${total} late sub-days recorded in the last 30 days.`}
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -32 }}>
              <Tooltip content={CustomTooltip} />
              <Line
                type="monotone"
                dataKey="count"
                stroke={chartColor(CHART_COLORS.late)}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: chartColor(CHART_COLORS.late) }}
                aria-label="Late count per day"
              />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </ChartPanel>
  );
}
