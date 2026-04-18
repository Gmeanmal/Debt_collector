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

interface Props {
  simulation: DebtSimulationOut;
  principal: string;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center bg-base-surface-raised border border-base-border rounded-md px-4 py-2">
      <span className="text-xs text-base-text-muted">{label}</span>
      <span className="text-sm font-semibold text-base-text">{value}</span>
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

  return (
    <div className="flex flex-col gap-4">
      {simulation.severe_warning && (
        <div
          role="status"
          className="flex items-center gap-2 bg-debt-muted border border-debt-ring rounded-full px-4 py-2"
        >
          <span className="w-2 h-2 rounded-full bg-status-danger shrink-0" />
          <span className="text-sm text-status-danger font-semibold">
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

      <div className="bg-base-surface border border-base-border rounded-lg p-4">
        <p className="text-xs text-base-text-muted mb-3">
          Balance projection (min payment, no penalties)
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-border)" />
            <XAxis
              dataKey="period"
              tick={{ fill: "var(--color-base-text-muted)", fontSize: 11 }}
              label={{ value: "Period", position: "insideBottomRight", offset: -4, fontSize: 11 }}
            />
            <YAxis
              tick={{ fill: "var(--color-base-text-muted)", fontSize: 11 }}
              tickFormatter={fmtGbp}
              width={80}
            />
            <Tooltip
              formatter={(value) => [fmtGbp(Number(value)), "Balance"]}
              labelFormatter={(label) => `Period ${label}`}
              contentStyle={{
                background: "var(--color-base-surface-raised)",
                border: "1px solid var(--color-base-border)",
                borderRadius: "6px",
                color: "var(--color-base-text)",
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="var(--color-pink-primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "var(--color-pink-primary)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
