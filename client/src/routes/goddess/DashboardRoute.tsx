import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { LatePaymentList } from "@/components/dashboard/LatePaymentList";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getGoddessDashboardApi } from "@/services/dashboards/dashboardsApi";
import { queryKeys } from "@/lib/queryKeys";

export function DashboardRoute() {
  const {
    data: dash,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.goddess.dashboard(),
    queryFn: getGoddessDashboardApi,
  });

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

        {isError && (
          <ErrorState
            title="Failed to load dashboard"
            message={(error as Error | undefined)?.message ?? "Try refreshing the page."}
          />
        )}

        {!isLoading && !isError && dash && <DashboardContent dash={dash} />}
      </div>
    </div>
  );
}

interface ContentProps {
  dash: NonNullable<Awaited<ReturnType<typeof getGoddessDashboardApi>>>;
}

function DashboardContent({ dash }: ContentProps) {
  const late = dash.late_payments ?? [];
  const everythingZero =
    dash.subs_total === 0 &&
    dash.rolling_count === 0 &&
    dash.contracts_active === 0 &&
    dash.pending_validations === 0 &&
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Subs"
          value={dash.subs_total}
          sublabel={`${dash.subs_active} active · ${dash.subs_blacklisted} blacklisted`}
        />
        <StatCard label="Rolling" value={dash.rolling_count} sublabel="Active tributes" />
        <StatCard label="Contracts" value={dash.contracts_active} sublabel="In repayment" />
        <StatCard
          label="To validate"
          value={dash.pending_validations}
          accent={dash.pending_validations > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Pending"
          value={dash.pending_contracts}
          accent={dash.pending_contracts > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Total drained"
          value={`£${Number(dash.total_drained).toFixed(2)}`}
          accent="success"
        />
      </div>

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
