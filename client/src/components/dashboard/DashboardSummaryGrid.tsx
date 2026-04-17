import { cn } from "@/lib/utils";
import { hoursToFreshnessLabel } from "@/services/dashboards/freshness";
import type { DashboardSummary } from "@/types/dashboard";

interface Props {
  summary: DashboardSummary;
}

interface TileProps {
  label: string;
  value: number;
  sublabel?: string;
  accent?: boolean;
  alertBorder?: boolean;
}

function SummaryTile({ label, value, sublabel, accent = false, alertBorder = false }: TileProps) {
  return (
    <div
      className={cn(
        "luxe-surface relative isolate overflow-hidden rounded-lg p-4 flex flex-col gap-1 min-w-0 border transition-colors",
        alertBorder ? "border-pink-primary" : "border-base-border",
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-base-text-subtle">
        {label}
      </span>
      <span
        className={cn(
          "font-display text-3xl tracking-tight leading-none tabular-nums",
          accent ? "text-status-warning" : "text-base-text",
        )}
        role="status"
      >
        {value}
      </span>
      {sublabel && (
        <span className="text-xs text-base-text-muted">{sublabel}</span>
      )}
    </div>
  );
}

export function DashboardSummaryGrid({ summary }: Props) {
  let freshness: string | undefined;
  if (summary.validations_pending > 0) {
    freshness =
      summary.validations_oldest_age_h === 0
        ? "oldest < 1 h"
        : hoursToFreshnessLabel(summary.validations_oldest_age_h);
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <SummaryTile
        label="Subs (active)"
        value={summary.subs_active}
        sublabel={summary.subs_paused > 0 ? `+ ${summary.subs_paused} paused` : undefined}
      />
      <SummaryTile
        label="Contracts (active)"
        value={summary.contracts_active}
        sublabel={summary.contracts_closed > 0 ? `+ ${summary.contracts_closed} closed` : undefined}
      />
      <SummaryTile
        label="Invitations"
        value={summary.invitations_active}
        sublabel={
          summary.invitations_consumed > 0
            ? `${summary.invitations_consumed} consumed`
            : undefined
        }
      />
      <SummaryTile
        label="Pending validations"
        value={summary.validations_pending}
        sublabel={freshness}
        accent={summary.validations_pending > 0}
      />
      <SummaryTile
        label="Late (rolling)"
        value={summary.late_rolling_count}
        accent={summary.late_rolling_count > 0}
      />
      <SummaryTile
        label="Late (contracts)"
        value={summary.late_contract_count}
        accent={summary.late_contract_count > 0}
      />
      <SummaryTile
        label="Photo queue"
        value={summary.photo_queue_count}
        accent={summary.photo_queue_count > 0}
      />
      <SummaryTile
        label="Profile change requests"
        value={summary.profile_change_requests_count}
        alertBorder={summary.profile_change_requests_count > 0}
      />
    </div>
  );
}
