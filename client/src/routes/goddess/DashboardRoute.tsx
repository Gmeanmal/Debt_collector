import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { DashboardSummaryGrid } from "@/components/dashboard/DashboardSummaryGrid";
import { LatePaymentList } from "@/components/dashboard/LatePaymentList";
import { MonthlyRevenueChart } from "@/components/dashboard/MonthlyRevenueChart";
import { MethodBreakdownChart } from "@/components/dashboard/MethodBreakdownChart";
import { SubsByStatusChart } from "@/components/dashboard/SubsByStatusChart";
import { TopSubsLeaderboard } from "@/components/dashboard/TopSubsLeaderboard";
import { LateRateSparkline } from "@/components/dashboard/LateRateSparkline";
import { ContractStateProgress } from "@/components/dashboard/ContractStateProgress";
import { ChartSkeleton } from "@/components/dashboard/ChartPanel";
import { DateRangeSelector } from "@/components/goddess/DateRangeSelector";
import { SubsPausedDonut } from "@/components/goddess/SubsPausedDonut";
import { MonthlyDeltaTile } from "@/components/goddess/MonthlyDeltaTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { listGoddessSubsApi } from "@/services/payments/paymentsApi";
import { useGoddessDashboard } from "@/hooks/dashboard/useGoddessDashboard";
import { useGoddessDashboardCharts } from "@/hooks/dashboard/useGoddessDashboardCharts";
import { useGoddessDashboardSummary } from "@/hooks/dashboard/useGoddessDashboardSummary";
import { useDashboardDateRange } from "@/hooks/useDashboardDateRange";
import { queryKeys } from "@/lib/queryKeys";
import type { GoddessDashboardOut } from "@/services/dashboards/dashboardsApi";
import type { DashboardSummary } from "@/types/dashboard";
import type { UseDashboardDateRangeResult } from "@/hooks/useDashboardDateRange";

export function DashboardRoute() {
  const {
    data: dash,
    isLoading: dashLoading,
    isError: dashError,
    error: dashErr,
  } = useGoddessDashboard();

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    error: summaryErr,
  } = useGoddessDashboardSummary();

  const isLoading = dashLoading || summaryLoading;

  return (
    <div className="px-4 py-10 sm:px-8 md:py-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-pink-primary/80">
              The ledger
            </p>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl italic leading-none text-base-text">
              Tonight's reckoning.
            </h1>
            <p className="mt-3 text-sm text-base-text-muted max-w-md">
              Tributes, debts, and disobedience — at a glance.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/goddess/invite">
                New invitation
                <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/goddess/payments/record">
                Record payment
                <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </header>

        <Separator />

        {isLoading && <ListSkeleton rows={2} />}

        {dashError && (
          <ErrorState
            title="Failed to load dashboard"
            message={dashErr?.message ?? "Try refreshing the page."}
          />
        )}

        {!dashError && summaryError && (
          <ErrorState
            title="Failed to load dashboard summary"
            message={summaryErr?.message ?? "Try refreshing the page."}
          />
        )}

        {!isLoading && !dashError && !summaryError && dash && summary && (
          <DashboardContent dash={dash} summary={summary} />
        )}
      </div>
    </div>
  );
}

interface ContentProps {
  dash: GoddessDashboardOut;
  summary: DashboardSummary;
}

function DashboardContent({ dash, summary }: ContentProps) {
  const { data: subs = [] } = useQuery({
    queryKey: queryKeys.goddess.subs(),
    queryFn: listGoddessSubsApi,
    staleTime: 60_000,
  });

  const dateRangeState = useDashboardDateRange();

  const rawLate = dash.late_payments ?? [];
  const late = rawLate.map((item) => {
    const sub = subs.find((s) => s.id === item.sub_id);
    return sub ? { ...item, sub_username: sub.username } : item;
  });

  const everythingZero =
    summary.subs_active === 0 &&
    dash.rolling_count === 0 &&
    summary.contracts_active === 0 &&
    summary.validations_pending === 0 &&
    dash.pending_contracts === 0 &&
    Number(dash.total_drained) === 0 &&
    late.length === 0;

  if (everythingZero) {
    return (
      <EmptyState
        title="Nothing to report yet"
        message="Invite a sub to get started — stats will appear here once they join and start paying tributes."
      />
    );
  }

  return (
    <>
      <DashboardSummaryGrid summary={summary} />

      <ChartGrid summary={summary} dateRangeState={dateRangeState} />

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl italic text-base-text">Late tonight</h2>
            <p className="mt-1 text-sm text-base-text-muted">
              Names overdue. Click to address them personally.
            </p>
          </div>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-base-text-subtle">
            {late.length} {late.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        <LatePaymentList items={late} />
      </section>
    </>
  );
}

interface ChartGridProps {
  summary: DashboardSummary;
  dateRangeState: UseDashboardDateRangeResult;
}

function ChartGrid({ summary, dateRangeState }: ChartGridProps) {
  const { data, isLoading, isError, error } = useGoddessDashboardCharts();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <ChartSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const errMsg = isError
    ? ((error as Error | undefined)?.message ?? "Failed to load charts")
    : undefined;

  const monthly = data?.monthly_revenue ?? [];
  const methods = data?.method_breakdown ?? [];
  const byStatus = data?.subs_by_status ?? [];
  const topSubs = data?.top_subs ?? [];
  const dailyLate = data?.daily_late_counts ?? [];
  const contractStates = data?.contract_states ?? { active: 0, completed: 0, breached: 0 };

  return (
    <div className="flex flex-col gap-4">
      <DateRangeSelector {...dateRangeState} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MonthlyRevenueChart data={monthly} error={errMsg} dateRange={dateRangeState.range} />
        <MethodBreakdownChart data={methods} error={errMsg} />
        <SubsByStatusChart data={byStatus} error={errMsg} />
        <TopSubsLeaderboard data={topSubs} error={errMsg} />
        <LateRateSparkline data={dailyLate} error={errMsg} dateRange={dateRangeState.range} />
        <ContractStateProgress data={contractStates} error={errMsg} />
        <SubsPausedDonut summary={summary} error={errMsg} />
        <MonthlyDeltaTile data={monthly} error={errMsg} />
      </div>
    </div>
  );
}
