import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/dashboard/StatCard";
import { ContractStatusChip } from "@/components/contracts/ContractStatusChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { PaymentChart } from "@/components/sub/PaymentChart";
import { PlanningCalendar } from "@/components/sub/PlanningCalendar";
import { AftercarePanel } from "@/components/aftercare/AftercarePanel";
import {
  getSubDashboardApi,
  getSubPlanningApi,
  type ActiveContractSummary,
} from "@/services/dashboards/dashboardsApi";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/services/auth/useAuth";
import { useAftercareActive } from "@/hooks/useAftercareActive";
import { formatLondon } from "@/services/format/datetime";
import { formatGBP } from "@/services/format/currency";

function formatDate(dt: string) {
  return formatLondon(dt, "datetime");
}

const PROGRESS_WIDTH_CLASS: Record<number, string> = {
  0: "w-0",
  5: "w-[5%]",
  10: "w-[10%]",
  15: "w-[15%]",
  20: "w-[20%]",
  25: "w-[25%]",
  30: "w-[30%]",
  35: "w-[35%]",
  40: "w-[40%]",
  45: "w-[45%]",
  50: "w-[50%]",
  55: "w-[55%]",
  60: "w-[60%]",
  65: "w-[65%]",
  70: "w-[70%]",
  75: "w-[75%]",
  80: "w-[80%]",
  85: "w-[85%]",
  90: "w-[90%]",
  95: "w-[95%]",
  100: "w-full",
};

function progressWidthClass(percent: number): string {
  const rounded = Math.round(Math.max(0, Math.min(100, percent)) / 5) * 5;
  return PROGRESS_WIDTH_CLASS[rounded] ?? "w-0";
}

interface ContractCardProps {
  contract: ActiveContractSummary;
}

function ContractCard({ contract }: ContractCardProps) {
  const progressPercent = Math.max(0, Math.min(100, Number(contract.progress_percent)));
  return (
    <Link
      to={`/debts/${contract.id}`}
      className="bg-base-surface border border-base-border rounded-lg p-4 flex flex-col gap-3 hover:border-pink-primary transition-colors focus-visible:ring-2 focus-visible:ring-pink-primary"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-semibold text-base-text text-sm">
          Principal {formatGBP(contract.principal)}
        </span>
        <ContractStatusChip status={contract.status} />
      </div>
      <div className="flex items-center justify-between text-xs text-base-text-muted">
        <span>Balance</span>
        <span className="text-base-text font-semibold">{formatGBP(contract.balance)}</span>
      </div>
      <div className="h-2 rounded-full bg-base-surface-raised overflow-hidden">
        <div className={`h-full bg-pink-primary ${progressWidthClass(progressPercent)}`} />
      </div>
      <div className="text-xs text-base-text-muted">{progressPercent.toFixed(1)}% paid down</div>
      {contract.next_period_due_at && (
        <div className="text-xs text-base-text-muted">
          Next due <span className="text-base-text">{formatDate(contract.next_period_due_at)}</span>
        </div>
      )}
    </Link>
  );
}

export function SubDashboardRoute() {
  const { user } = useAuth();
  const subId = user?.id ?? "";
  const aftercareActive = useAftercareActive(subId || undefined);

  const {
    data: dash,
    isLoading: dashLoading,
    isError: dashError,
    error: dashErr,
  } = useQuery({
    queryKey: queryKeys.sub.dashboard(),
    queryFn: getSubDashboardApi,
  });

  const { data: planning, isLoading: planningLoading } = useQuery({
    queryKey: queryKeys.sub.planning(),
    queryFn: getSubPlanningApi,
  });

  if (dashLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <ListSkeleton rows={2} />
        </div>
      </div>
    );
  }

  if (dashError || !dash) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <ErrorState
            title="Failed to load dashboard"
            message={(dashErr as Error | undefined)?.message ?? "Try refreshing the page."}
          />
        </div>
      </div>
    );
  }

  const contracts = dash.active_contracts ?? [];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {aftercareActive && subId && <AftercarePanel subId={subId} />}

        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Dashboard
          </h1>
          <p className="text-sm text-base-text-muted mt-1">
            Your current obligations and recent activity.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Due this week"
            value={formatGBP(dash.amount_due_this_week)}
            accent={dash.is_late ? "danger" : "default"}
            trend={
              dash.is_late ? (
                <span className="text-status-danger font-semibold uppercase">Late</span>
              ) : null
            }
          />
          <StatCard
            label="All-time sent"
            value={formatGBP(planning?.total_paid_all_time ?? dash.total_sent)}
            accent="success"
          />
          {planning && (
            <>
              <StatCard
                label="This month"
                value={formatGBP(planning.total_paid_this_month)}
              />
              <StatCard
                label="Rolling remaining"
                value={formatGBP(planning.rolling_remaining_this_month)}
                accent={Number(planning.rolling_remaining_this_month) > 0 ? "danger" : "default"}
              />
            </>
          )}
        </div>

        {planningLoading && (
          <div className="bg-base-surface border border-base-border rounded-lg p-6">
            <ListSkeleton rows={2} />
          </div>
        )}

        {planning && (
          <>
            <PaymentChart history={planning.weekly_history ?? []} />
            <PlanningCalendar upcoming={planning.upcoming ?? []} />
          </>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-pink-primary">Active contracts</h2>
          {contracts.length === 0 ? (
            <EmptyState
              title="No active contracts"
              message="When your Goddess signs a contract with you, it will appear here."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {contracts.map((c) => (
                <ContractCard key={c.id} contract={c} />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-pink-primary">Recent payments</h2>
          {(dash.recent_payments ?? []).length === 0 ? (
            <EmptyState
              title="No payments yet"
              message="Declare your first tribute and it will show up here once submitted."
            />
          ) : (
            <RecentPaymentsTable payments={dash.recent_payments ?? []} />
          )}
        </section>
      </div>
    </div>
  );
}

const PAYMENT_STATUS_CLASSES: Record<string, string> = {
  pending: "bg-status-warning/20 text-status-warning",
  validated: "bg-status-success/20 text-status-success",
  rejected: "bg-debt-muted text-status-danger",
  cancelled: "bg-base-surface-raised text-base-text-muted",
};

interface RecentPaymentsTableProps {
  payments: NonNullable<
    ReturnType<typeof getSubDashboardApi> extends Promise<infer T> ? T : never
  >["recent_payments"];
}

function RecentPaymentsTable({ payments }: RecentPaymentsTableProps) {
  return (
    <div className="bg-base-surface border border-base-border rounded-lg p-3 overflow-x-auto">
      <table className="w-full min-w-[400px] text-left">
        <thead>
          <tr>
            {["Amount", "Category", "Status", "Declared"].map((h) => (
              <th
                key={h}
                className="pb-2 pr-3 text-xs text-base-text-muted uppercase tracking-wide font-semibold"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(payments ?? []).map((p) => (
            <tr key={p.id} className="border-t border-base-border">
              <td
                className="py-2 pr-3 text-base-text text-sm font-semibold whitespace-nowrap"
                role="status"
              >
                {formatGBP(p.amount)}
              </td>
              <td className="py-2 pr-3 text-xs text-base-text-muted capitalize whitespace-nowrap">
                {p.category.replace(/_/g, " ")}
              </td>
              <td className="py-2 pr-3 whitespace-nowrap">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${PAYMENT_STATUS_CLASSES[p.status] ?? ""}`}
                >
                  {p.status}
                </span>
              </td>
              <td className="py-2 text-xs text-base-text-muted whitespace-nowrap">
                {formatDate(p.declared_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
