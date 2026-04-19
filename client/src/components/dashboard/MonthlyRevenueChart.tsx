import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import type { CSSProperties } from "react";
import { chartColor, CHART_COLORS } from "@/services/dashboard/chartColors";
import { ChartPanel, ChartError } from "@/components/dashboard/ChartPanel";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { MonthlyRevenueBucket } from "@/types/dashboard";
import { formatGBP } from "@/services/format/currency";
import { bucketTotalGBP } from "@/services/dashboards/subDashboardFormat";
import type { DateRange } from "@/hooks/useDashboardDateRange";

interface Props {
  data: MonthlyRevenueBucket[];
  error?: string;
  dateRange?: DateRange;
}

function filterByRange(data: MonthlyRevenueBucket[], range: DateRange): MonthlyRevenueBucket[] {
  const fromMonth = range.from.slice(0, 7);
  const toMonth = range.to.slice(0, 7);
  return data.filter((b) => b.month >= fromMonth && b.month <= toMonth);
}

function CustomTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="bg-bg-elev border border-line rounded-[6px] px-3 py-2 text-[12px] text-text"
      role="tooltip"
    >
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-1 flex flex-col gap-0.5">
        {payload.map((entry) => (
          <p key={entry.name} className="flex items-center gap-1.5 text-text-mute">
            <span
              className="inline-block h-2 w-2 rounded-full flex-shrink-0 bg-[var(--dot)]"
              // eslint-disable-next-line no-restricted-syntax -- recharts provides color at runtime; bridged via CSS var
              style={{ ["--dot" as string]: entry.color } as CSSProperties}
            />
            {entry.name}: {formatGBP(Number(entry.value ?? 0))}
          </p>
        ))}
      </div>
    </div>
  );
}

function revenueSummary(data: MonthlyRevenueBucket[]): string {
  if (data.length === 0) return "";
  let peak = data[0];
  for (const d of data) {
    if (Number(bucketTotalGBP(d)) > Number(bucketTotalGBP(peak))) peak = d;
  }
  return `Revenue peaked in ${peak.month} at ${formatGBP(Number(bucketTotalGBP(peak)))}`;
}

export function MonthlyRevenueChart({ data, error, dateRange }: Props) {
  const filtered = dateRange ? filterByRange(data, dateRange) : data;

  const chartData = filtered.map((d) => ({
    month: d.month,
    Rolling: Number(d.rolling),
    "One-off": Number(d.one_off),
    Contract: Number(d.contract),
  }));

  const summary = revenueSummary(filtered);

  return (
    <ChartPanel
      title="Monthly revenue"
      description="Last 12 months · Rolling, one-off, and contract payments"
      ariaLabel="Monthly revenue line chart"
    >
      {error ? (
        <ChartError message={error} />
      ) : (
        <>
          {summary && <p className="sr-only">{summary}</p>}
          <p className="text-xs text-text-mute" aria-hidden="true">
            {summary}
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColor("--color-line")} />
              <XAxis
                dataKey="month"
                tick={{ fill: chartColor("--color-text-faint"), fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: chartColor("--color-text-faint"), fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `£${v}`}
              />
              <Tooltip content={CustomTooltip} />
              <Legend
                wrapperStyle={{ fontSize: 10, color: chartColor("--color-text-mute") }}
              />
              <Line
                type="monotone"
                dataKey="Rolling"
                stroke={chartColor(CHART_COLORS.rolling)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="One-off"
                stroke={chartColor(CHART_COLORS.oneOff)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="Contract"
                stroke={chartColor(CHART_COLORS.contract)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </ChartPanel>
  );
}
