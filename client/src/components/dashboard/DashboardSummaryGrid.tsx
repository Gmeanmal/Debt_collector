import { Stat } from "@/components/ui/stat";
import { hoursToFreshnessLabel } from "@/services/dashboards/freshness";
import type { DashboardSummary } from "@/types/dashboard";

interface Props {
  summary: DashboardSummary;
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
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <Stat
        label="Subs (active)"
        value={summary.subs_active}
        sub={summary.subs_paused > 0 ? `+ ${summary.subs_paused} paused` : undefined}
      />
      <Stat
        label="Contracts (active)"
        value={summary.contracts_active}
        sub={summary.contracts_closed > 0 ? `+ ${summary.contracts_closed} closed` : undefined}
      />
      <Stat
        label="Invitations"
        value={summary.invitations_active}
        sub={
          summary.invitations_consumed > 0 ? `${summary.invitations_consumed} consumed` : undefined
        }
      />
      <Stat
        label="Pending validations"
        value={summary.validations_pending}
        sub={freshness}
        tone={summary.validations_pending > 0 ? "warn" : "default"}
      />
      <Stat
        label="Late (rolling)"
        value={summary.late_rolling_count}
        tone={summary.late_rolling_count > 0 ? "warn" : "default"}
      />
      <Stat
        label="Late (contracts)"
        value={summary.late_contract_count}
        tone={summary.late_contract_count > 0 ? "warn" : "default"}
      />
      <Stat
        label="Photo queue"
        value={summary.photo_queue_count}
        tone={summary.photo_queue_count > 0 ? "warn" : "default"}
      />
      <Stat
        label="Profile change requests"
        value={summary.profile_change_requests_count}
        tone={summary.profile_change_requests_count > 0 ? "accent" : "default"}
      />
    </div>
  );
}
