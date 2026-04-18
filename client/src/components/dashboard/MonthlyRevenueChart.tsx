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
import type { MonthlyRevenueBucket } from "@/types/dashboard";
import { formatGBP } from "@/services/format/currency";

interface Props {
  data: MonthlyRevenueBucket[];
  error?: string;
}

function CustomTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-md border border-base-border bg-base-surface-raised px-3 py-2 text-xs shadow-lg"
      role="tooltip"
    >
      <p className="mb-1 font-medium text-base-text">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-1.5 text-base-text-muted">
          <span
            className="inline-block h-2 w-2 rounded-full flex-shrink-0 bg-[var(--dot)]"
            // eslint-disable-next-line no-restricted-syntax -- recharts provides color at runtime; bridged via CSS var
            style={{ ["--dot" as string]: entry.color } as CSSProperties}
          />
          {entry.name}: {formatGBP(Number(entry.value ?? 0))}
        </p>
      ))}
    </div>
  );
}

function revenueSummary(data: MonthlyRevenueBucket[]): string {
  if (data.length === 0) return "";
  let peak = data[0];
  for (const d of data) {
    const total = Number(d.rolling) + Number(d.one_off) + Number(d.contract);
    const peakTotal = Number(peak.rolling) + Number(peak.one_off) + Number(peak.contract);
    if (total > peakTotal) peak = d;
  }
  const peakTotal = Number(peak.rolling) + Number(peak.one_off) + Number(peak.contract);
  return `Revenue peaked in ${peak.month} at ${formatGBP(peakTotal)}`;
}

export function MonthlyRevenueChart({ data, error }: Props) {
  const chartData = data.map((d) => ({
    month: d.month,
    Rolling: Number(d.rolling),
    "One-off": Number(d.one_off),
    Contract: Number(d.contract),
  }));

  const summary = revenueSummary(data);

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
          <p className="text-xs text-base-text-muted" aria-hidden="true">
            {summary}
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColor("--color-base-border")} />
              <XAxis
                dataKey="month"
                tick={{ fill: chartColor("--color-base-text-subtle"), fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: chartColor("--color-base-text-subtle"), fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `£${v}`}
              />
              <Tooltip content={CustomTooltip} />
              <Legend
                wrapperStyle={{ fontSize: 10, color: chartColor("--color-base-text-muted") }}
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
