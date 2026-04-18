import type { RollingTributeOut } from "@/services/rolling/rollingApi";
import { formatLondon } from "@/services/format/datetime";
import { formatGBP } from "@/services/format/currency";

interface Props {
  tribute: RollingTributeOut;
}

export function RollingReadonlyPanel({ tribute }: Props) {
  const amountDue = formatGBP(tribute.amount_due);
  const isLate = tribute.days_late > 0;

  return (
    <div className="bg-base-surface-raised border border-base-border rounded-lg p-4 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-base-text-muted uppercase tracking-wide">
        Current cycle
      </h2>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <span className="text-base-text-muted">Next deadline</span>
        <span className="text-base-text font-medium">
          {formatLondon(tribute.current_cycle_deadline)}
        </span>

        <span className="text-base-text-muted">Amount due</span>
        <span
          className={`font-semibold ${isLate ? "text-status-danger" : "text-base-text"}`}
          role="status"
          aria-label="Amount due"
        >
          {amountDue}
        </span>

        <span className="text-base-text-muted">Days late</span>
        <span className={`font-medium ${isLate ? "text-status-danger" : "text-status-success"}`}>
          {isLate ? `${tribute.days_late} day${tribute.days_late !== 1 ? "s" : ""}` : "On time"}
        </span>

        <span className="text-base-text-muted">Last paid</span>
        <span className="text-base-text">
          {tribute.last_paid_at ? formatLondon(tribute.last_paid_at) : "Never"}
        </span>
      </div>

      {tribute.paused && (
        <p className="text-xs text-status-warning font-semibold">Cycle is paused.</p>
      )}
    </div>
  );
}
