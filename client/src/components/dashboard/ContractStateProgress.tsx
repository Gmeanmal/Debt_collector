/* eslint-disable no-restricted-syntax -- progress bar width is a runtime value that cannot be expressed as a Tailwind class */
import { ChartPanel, ChartError } from "@/components/dashboard/ChartPanel";
import { cn } from "@/lib/utils";
import type { ContractStateCount } from "@/types/dashboard";

interface Props {
  data: ContractStateCount;
  error?: string;
}

interface BarRowProps {
  label: string;
  count: number;
  total: number;
  barClass: string;
  textClass: string;
}

function BarRow({ label, count, total, barClass, textClass }: BarRowProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className={cn("font-medium", textClass)}>{label}</span>
        <span className="tabular-nums text-text-mute">
          {count} <span className="text-text-faint">({pct}%)</span>
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-bg-sunken"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${count} contracts (${pct}%)`}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", barClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ContractStateProgress({ data, error }: Props) {
  const total = data.active + data.completed + data.breached;

  return (
    <ChartPanel
      title="Contract state"
      description="Active · Completed · Breached"
      ariaLabel="Contract state progress bars"
    >
      {error ? (
        <ChartError message={error} />
      ) : total === 0 ? (
        <p className="text-xs text-text-mute">No contracts yet.</p>
      ) : (
        <div className="flex flex-col gap-4 pt-1">
          <BarRow
            label="Active"
            count={data.active}
            total={total}
            barClass="bg-ok-ink"
            textClass="text-ok-ink"
          />
          <BarRow
            label="Completed"
            count={data.completed}
            total={total}
            barClass="bg-text-mute"
            textClass="text-text-mute"
          />
          <BarRow
            label="Breached"
            count={data.breached}
            total={total}
            barClass="bg-bad-ink"
            textClass="text-bad-ink"
          />
        </div>
      )}
    </ChartPanel>
  );
}
