import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { TooltipContentProps } from "recharts";
import { ChartPanel, ChartError } from "@/components/dashboard/ChartPanel";
import { chartColor } from "@/services/dashboard/chartColors";
import type { DashboardSummary } from "@/types/dashboard";

interface Props {
  summary: Pick<DashboardSummary, "subs_active" | "subs_paused">;
  error?: string;
}

function CustomTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  return (
    <div
      className="rounded-md border border-base-border bg-base-surface-raised px-3 py-2 text-xs shadow-lg"
      role="tooltip"
    >
      <p className="font-medium text-base-text">
        {entry?.name}: {String(entry?.value)}
      </p>
    </div>
  );
}

export function SubsPausedDonut({ summary, error }: Props) {
  const active = summary.subs_active ?? 0;
  const paused = summary.subs_paused ?? 0;
  const total = active + paused;

  const slices = [
    { name: "Active", value: active, color: chartColor("--color-status-success") },
    { name: "Paused", value: paused, color: chartColor("--color-base-text-subtle") },
  ];

  return (
    <ChartPanel
      title="Active vs paused"
      description="Current sub status distribution"
      ariaLabel="Subs active versus paused donut chart"
    >
      {error ? (
        <ChartError message={error} />
      ) : total === 0 ? (
        <p className="text-xs text-base-text-muted">No subs yet.</p>
      ) : (
        <>
          <p className="sr-only">
            {active} active sub{active !== 1 ? "s" : ""}, {paused} paused.
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                aria-label="Active and paused sub counts"
              >
                {slices.map((slice) => (
                  <Cell key={slice.name} fill={slice.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={CustomTooltip} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-5">
            <span className="flex items-center gap-1.5 text-xs text-base-text-muted">
              <span className="inline-block h-2 w-2 rounded-full bg-status-success flex-shrink-0" />
              Active&nbsp;&middot;&nbsp;{active}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-base-text-muted">
              <span className="inline-block h-2 w-2 rounded-full bg-base-text-subtle flex-shrink-0" />
              Paused&nbsp;&middot;&nbsp;{paused}
            </span>
          </div>
        </>
      )}
    </ChartPanel>
  );
}
