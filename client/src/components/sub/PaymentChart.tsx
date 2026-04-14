import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WeeklyPaymentTotal } from "@/services/dashboards/dashboardsApi";

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

function weekLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
  });
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
    <div className="bg-base-surface border border-base-border rounded px-3 py-2 text-xs shadow-lg">
      <p className="text-base-text-muted mb-1">w/c {label}</p>
      <p className="text-pink-primary font-semibold">{GBP.format(payload[0].value)}</p>
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

  const pinkVar = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-pink-primary")
    .trim();
  const borderVar = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-base-border")
    .trim();
  const mutedVar = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-base-text-muted")
    .trim();

  return (
    <div className="bg-base-surface border border-base-border rounded-lg p-4">
      <h3 className="text-sm font-semibold text-base-text-muted uppercase tracking-wide mb-4">
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
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,79,163,0.08)" }} />
          <Bar dataKey="total" fill={pinkVar} radius={[3, 3, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
