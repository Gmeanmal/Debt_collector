import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DebtSimulationOut } from "@/services/debtContracts/debtContractsApi";
import { formatGBP } from "@/services/format/currency";
import { chartColor, CHART_COLORS } from "@/services/dashboard/chartColors";

interface Props {
  simulation: DebtSimulationOut;
  principal: string;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center bg-bg-sunken border border-line rounded-md px-4 py-2">
      <span className="text-xs text-text-mute">{label}</span>
      <span className="text-sm font-semibold text-text">{value}</span>
    </div>
  );
}

function toChartData(simulation: DebtSimulationOut) {
  return simulation.periods.map((p) => ({
    period: p.period,
    balance: parseFloat(p.balance_end),
  }));
}

function fmtPct(fraction: string): string {
  const n = parseFloat(fraction);
  if (isNaN(n)) return "—";
  return `${(n * 100).toFixed(4).replace(/\.?0+$/, "")}%`;
}

function fmtGbp(value: number): string {
  return formatGBP(value);
}

export function SimulationChart({ simulation, principal }: Props) {
  const chartData = toChartData(simulation);
  const totalPayments = simulation.periods.reduce((s, p) => s + parseFloat(p.payment), 0);
  const totalInterest = Math.max(0, totalPayments - parseFloat(principal));
  const lineColor = chartColor(CHART_COLORS.rolling);

  return (
    <div className="flex flex-col gap-4">
      {simulation.severe_warning && (
        <div
          role="status"
          className="flex items-center gap-2 bg-bad-bg border border-line rounded-full px-4 py-2"
        >
          <span className="w-2 h-2 rounded-full bg-bad-ink shrink-0" />
          <span className="text-sm text-bad-ink font-semibold">
            Warning: debt will grow faster than minimum payment can repay it.
          </span>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <StatPill label="Period rate" value={fmtPct(simulation.period_rate)} />
        <StatPill label="Monthly rate" value={fmtPct(simulation.monthly_rate)} />
        <StatPill label="Total interest" value={fmtGbp(totalInterest)} />
        <StatPill label="Total to pay" value={fmtGbp(totalPayments)} />
      </div>

      <div className="bg-bg-elev border border-line rounded-[10px] p-4">
        <p className="text-xs text-text-mute mb-3">
          Balance projection (min payment, no penalties)
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
            <XAxis
              dataKey="period"
              tick={{ fill: "var(--color-text-mute)", fontSize: 11 }}
              label={{ value: "Period", position: "insideBottomRight", offset: -4, fontSize: 11 }}
            />
            <YAxis
              tick={{ fill: "var(--color-text-mute)", fontSize: 11 }}
              tickFormatter={fmtGbp}
              width={80}
            />
            <Tooltip
              formatter={(value) => [fmtGbp(Number(value)), "Balance"]}
              labelFormatter={(label) => `Period ${label}`}
              contentStyle={{
                background: "var(--color-bg-elev)",
                border: "1px solid var(--color-line)",
                borderRadius: "6px",
                color: "var(--color-text)",
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: lineColor }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
