import {
  BarChart,
  Bar,
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
import type { SubStatusCount } from "@/types/dashboard";

interface Props {
  data: SubStatusCount[];
  error?: string;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  blacklisted: "Blacklisted",
  pending_entry_tribute: "Pending",
  deleted: "Deleted",
};

function statusLabel(s: string): string {
  return STATUS_LABELS[s] ?? s;
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
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export function SubsByStatusChart({ data, error }: Props) {
  const chartData = data.map((d) => ({
    status: statusLabel(d.status),
    Rolling: d.rolling_count,
    Contract: d.contract_count,
  }));

  return (
    <ChartPanel
      title="Subs by status"
      description="Rolling and contract split per status"
      ariaLabel="Subs by status stacked bar chart"
    >
      {error ? (
        <ChartError message={error} />
      ) : data.length === 0 ? (
        <p className="text-xs text-base-text-muted">No subs yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColor("--color-base-border")} />
            <XAxis
              dataKey="status"
              tick={{ fill: chartColor("--color-base-text-subtle"), fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: chartColor("--color-base-text-subtle"), fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={CustomTooltip} />
            <Legend wrapperStyle={{ fontSize: 10, color: chartColor("--color-base-text-muted") }} />
            <Bar
              dataKey="Rolling"
              stackId="a"
              fill={chartColor(CHART_COLORS.rolling)}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="Contract"
              stackId="a"
              fill={chartColor(CHART_COLORS.contract)}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartPanel>
  );
}
