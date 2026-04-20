/* eslint-disable no-restricted-syntax -- legend dot backgroundColor is resolved from a CSS var at runtime */
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { TooltipContentProps } from "recharts";
import { chartColor, CHART_COLORS } from "@/services/dashboard/chartColors";
import { ChartPanel, ChartError } from "@/components/dashboard/ChartPanel";
import { Money } from "@/components/ui/money";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { MethodBreakdownItem } from "@/types/dashboard";
import { formatGBP } from "@/services/format/currency";

interface Props {
  data: MethodBreakdownItem[];
  error?: string;
}

const PALETTE_VARS = [
  CHART_COLORS.rolling,
  CHART_COLORS.contract,
  CHART_COLORS.oneOff,
  CHART_COLORS.active,
  CHART_COLORS.completed,
  CHART_COLORS.breached,
  CHART_COLORS.late,
  CHART_COLORS.muted,
];

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
      className="bg-bg-elev border border-line rounded-[6px] px-3 py-2 text-[12px] text-text"
      role="tooltip"
    >
      <Eyebrow>{entry.name}</Eyebrow>
      <p className="mt-1 text-text-mute">
        {formatGBP(Number(entry.value ?? 0))}
        {pct}
      </p>
    </div>
  );
}

function renderLegend(items: MethodBreakdownItem[], total: number) {
  return (
    <ul className="mt-2 flex flex-col" aria-label="Method breakdown legend">
      {items.map((item, i) => {
        const pct = total > 0 ? ((Number(item.total) / total) * 100).toFixed(1) : "0.0";
        const colorVar = PALETTE_VARS[i % PALETTE_VARS.length];
        return (
          <li
            key={item.method_type}
            className="flex items-center gap-2 text-xs border-b border-line last:border-b-0 py-2"
          >
            <span
              className="inline-block h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: chartColor(colorVar) }}
              aria-hidden="true"
            />
            <span className="text-text-mute capitalize">{item.method_type.replace("_", " ")}</span>
            <span className="ml-auto">
              <Money value={Number(item.total)} />
            </span>
            <span className="font-mono text-[11px] text-text-faint w-12 text-right">{pct}%</span>
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
        <p className="text-xs text-text-mute">No validated payments yet.</p>
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
