import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/dashboard/StatCard";
import { LatePaymentList } from "@/components/dashboard/LatePaymentList";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { getGoddessDashboardApi } from "@/services/dashboards/dashboardsApi";

export function DashboardRoute() {
  const {
    data: dash,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["goddessDashboard"],
    queryFn: getGoddessDashboardApi,
  });

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Dashboard
          </h1>
          <p className="text-sm text-base-text-muted mt-1">Overview of your subs and tributes.</p>
        </div>

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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Subs"
          value={dash.subs_total}
          sublabel={`${dash.subs_active} active · ${dash.subs_blacklisted} blacklisted`}
        />
        <StatCard label="Rolling" value={dash.rolling_count} sublabel="Not paused" />
        <StatCard label="Active contracts" value={dash.contracts_active} sublabel="In repayment" />
        <StatCard
          label="Pending validations"
          value={dash.pending_validations}
          accent={dash.pending_validations > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Pending contracts"
          value={dash.pending_contracts}
          accent={dash.pending_contracts > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Total drained"
          value={`£${Number(dash.total_drained).toFixed(2)}`}
          accent="success"
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-pink-primary">Late payments</h2>
        <LatePaymentList items={late} />
      </section>
    </>
  );
}
