import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WeeklyPaymentTotal } from "@/services/dashboards/dashboardsApi";
import { formatGBP } from "@/services/format/currency";
import { chartColor, CHART_COLORS } from "@/services/dashboard/chartColors";

const WEEK_LABEL_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "2-digit",
  month: "short",
});

function weekLabel(isoDate: string): string {
  return WEEK_LABEL_FMT.format(new Date(isoDate));
}

interface TooltipPayload {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-elev border border-line rounded px-3 py-2 text-xs shadow-lg">
      <p className="text-text-mute mb-1">w/c {label}</p>
      <p className="text-accent font-semibold">{formatGBP(payload[0].value)}</p>
    </div>
  );
}

interface PaymentChartProps {
  history: WeeklyPaymentTotal[];
}

export function PaymentChart({ history }: PaymentChartProps) {
  const chartData = history.map((w) => ({
    week: weekLabel(w.week_start),
    total: Number(w.total),
  }));

  const accentVar = chartColor(CHART_COLORS.rolling);
  const borderVar = chartColor("--color-line");
  const mutedVar = chartColor("--color-text-mute");

  return (
    <div className="bg-bg-elev border border-line rounded-[10px] p-[18px]">
      <h3 className="text-sm font-semibold text-text-mute uppercase tracking-wide mb-4">
        Last 12 weeks — validated payments
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={borderVar} vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 10, fill: mutedVar }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: mutedVar }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `£${v}`}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: `${accentVar}14` }} />
          <Bar dataKey="total" fill={accentVar} radius={[3, 3, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
