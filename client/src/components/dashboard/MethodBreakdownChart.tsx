/* eslint-disable no-restricted-syntax -- legend dot backgroundColor is resolved from a CSS var at runtime */
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { TooltipContentProps } from "recharts";
import { chartColor } from "@/services/dashboard/chartColors";
import { ChartPanel, ChartError } from "@/components/dashboard/ChartPanel";
import type { MethodBreakdownItem } from "@/types/dashboard";

interface Props {
  data: MethodBreakdownItem[];
  error?: string;
}

const PALETTE_VARS = [
  "--color-pink-primary",
  "--color-violet-primary",
  "--color-gold-accent",
  "--color-status-info",
  "--color-status-success",
  "--color-debt-primary",
  "--color-base-text-subtle",
  "--color-pink-primary-hover",
];

function formatGbp(value: number): string {
  return `£${value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function CustomTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  if (!entry) return null;
  const pct =
    typeof entry.payload?.percent === "number"
      ? ` (${(entry.payload.percent * 100).toFixed(1)}%)`
      : "";
  return (
    <div
      className="rounded-md border border-base-border bg-base-surface-raised px-3 py-2 text-xs shadow-lg"
      role="tooltip"
    >
      <p className="font-medium text-base-text">{entry.name}</p>
      <p className="text-base-text-muted">
        {formatGbp(Number(entry.value ?? 0))}
        {pct}
      </p>
    </div>
  );
}

function renderLegend(items: MethodBreakdownItem[], total: number) {
  return (
    <ul className="mt-2 flex flex-col gap-1" aria-label="Method breakdown legend">
      {items.map((item, i) => {
        const pct = total > 0 ? ((Number(item.total) / total) * 100).toFixed(1) : "0.0";
        const colorVar = PALETTE_VARS[i % PALETTE_VARS.length];
        return (
          <li key={item.method_type} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: chartColor(colorVar) }}
              aria-hidden="true"
            />
            <span className="text-base-text-muted capitalize">
              {item.method_type.replace("_", " ")}
            </span>
            <span className="ml-auto font-medium text-base-text">
              {formatGbp(Number(item.total))}
            </span>
            <span className="text-base-text-subtle w-12 text-right">{pct}%</span>
          </li>
        );
      })}
    </ul>
  );
}

export function MethodBreakdownChart({ data, error }: Props) {
  const total = data.reduce((sum, d) => sum + Number(d.total), 0);

  const pieData = data.map((d) => ({
    name: d.method_type.replace("_", " "),
    value: Number(d.total),
    percent: total > 0 ? Number(d.total) / total : 0,
  }));

  return (
    <ChartPanel
      title="Payment method breakdown"
      description="Validated volume by method (all time)"
      ariaLabel="Payment method donut chart"
    >
      {error ? (
        <ChartError message={error} />
      ) : data.length === 0 ? (
        <p className="text-xs text-base-text-muted">No validated payments yet.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                dataKey="value"
                aria-label="Donut chart showing payment method breakdown"
              >
                {pieData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={chartColor(PALETTE_VARS[index % PALETTE_VARS.length])}
                  />
                ))}
              </Pie>
              <Tooltip content={CustomTooltip} />
            </PieChart>
          </ResponsiveContainer>
          {renderLegend(data, total)}
        </>
      )}
    </ChartPanel>
  );
}
