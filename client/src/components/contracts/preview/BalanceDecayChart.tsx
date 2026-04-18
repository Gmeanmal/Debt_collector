import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { CSSProperties } from "react";
import type { TooltipContentProps } from "recharts";
import { ChartPanel } from "@/components/dashboard/ChartPanel";
import { chartColor } from "@/services/dashboard/chartColors";
import type { DebtSimulationPeriod } from "@/services/debtContracts/debtContractsApi";
import { formatGBP } from "@/services/format/currency";

interface Props {
  periods: DebtSimulationPeriod[];
}

function fmtGbp(value: number): string {
  return formatGBP(value);
}

function toChartData(periods: DebtSimulationPeriod[]) {
  return periods.map((p) => ({
    period: p.period,
    balance: Math.max(0, parseFloat(p.balance_end)),
  }));
}

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const dotColor = String(payload[0]?.color ?? "");
  return (
    <div
      className="rounded-md border border-base-border bg-base-surface-raised px-3 py-2 text-xs shadow-lg"
      role="tooltip"
    >
      <p className="mb-1 font-medium text-base-text">Period {label}</p>
      <p className="flex items-center gap-1.5 text-base-text-muted">
        <span
          className="inline-block h-2 w-2 rounded-full flex-shrink-0 bg-[var(--dot)]"
          // eslint-disable-next-line no-restricted-syntax -- recharts provides color at runtime; bridged via CSS var
          style={{ ["--dot" as string]: dotColor } as CSSProperties}
        />
        Balance: {fmtGbp(Number(payload[0]?.value ?? 0))}
      </p>
    </div>
  );
}

export function BalanceDecayChart({ periods }: Props) {
  const chartData = toChartData(periods);
  const peakBalance = Math.max(...chartData.map((d) => d.balance));

  return (
    <ChartPanel
      title="Balance decay"
      description="Outstanding balance over the repayment schedule"
      ariaLabel="Balance decay line chart across schedule periods"
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColor("--color-base-border")} />
          <XAxis
            dataKey="period"
            tick={{ fill: chartColor("--color-base-text-subtle"), fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            label={{
              value: "Period",
              position: "insideBottomRight",
              offset: -4,
              fontSize: 11,
              fill: chartColor("--color-base-text-subtle"),
            }}
          />
          <YAxis
            tick={{ fill: chartColor("--color-base-text-subtle"), fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `£${v}`}
            domain={[0, peakBalance * 1.05]}
            width={80}
          />
          <Tooltip content={ChartTooltip} />
          <Line
            type="monotone"
            dataKey="balance"
            stroke={chartColor("--color-pink-primary")}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: chartColor("--color-pink-primary") }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}
