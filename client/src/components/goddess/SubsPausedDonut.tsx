import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { TooltipContentProps } from "recharts";
import { ChartPanel, ChartError } from "@/components/dashboard/ChartPanel";
import { chartColor, CHART_COLORS } from "@/services/dashboard/chartColors";
import { Eyebrow } from "@/components/ui/eyebrow";
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
      className="bg-bg-elev border border-line rounded-[6px] px-3 py-2 text-[12px] text-text"
      role="tooltip"
    >
      <Eyebrow>{entry?.name}</Eyebrow>
      <p className="mt-1 text-text-mute">{String(entry?.value)}</p>
    </div>
  );
}

export function SubsPausedDonut({ summary, error }: Props) {
  const active = summary.subs_active ?? 0;
  const paused = summary.subs_paused ?? 0;
  const total = active + paused;

  const slices = [
    { name: "Active", value: active, color: chartColor(CHART_COLORS.active) },
    { name: "Paused", value: paused, color: chartColor(CHART_COLORS.muted) },
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
        <p className="text-xs text-text-mute">No subs yet.</p>
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
            <span className="flex items-center gap-1.5 text-xs text-text-mute">
              <span className="inline-block h-2 w-2 rounded-full bg-ok-ink flex-shrink-0" />
              Active&nbsp;&middot;&nbsp;{active}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-text-mute">
              <span className="inline-block h-2 w-2 rounded-full bg-text-faint flex-shrink-0" />
              Paused&nbsp;&middot;&nbsp;{paused}
            </span>
          </div>
        </>
      )}
    </ChartPanel>
  );
}
