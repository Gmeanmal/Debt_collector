import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/dashboard/StatCard";
import { LatePaymentList } from "@/components/dashboard/LatePaymentList";
import { getGoddessDashboardApi } from "@/services/dashboards/dashboardsApi";

export function DashboardRoute() {
  const {
    data: dash,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["goddessDashboard"],
    queryFn: getGoddessDashboardApi,
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-base-text-muted text-sm">Loading dashboard…</p>
      </div>
    );
  }

  if (isError || !dash) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-status-danger text-sm">Failed to load dashboard.</p>
      </div>
    );
  }

  const late = dash.late_payments ?? [];
  const everythingZero =
    dash.subs_total === 0 &&
    dash.rolling_count === 0 &&
    dash.contracts_active === 0 &&
    dash.pending_validations === 0 &&
    dash.pending_contracts === 0 &&
    Number(dash.total_drained) === 0 &&
    late.length === 0;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Dashboard
          </h1>
          <p className="text-sm text-base-text-muted mt-1">Overview of your subs and tributes.</p>
        </div>

        {everythingZero ? (
          <div className="bg-base-surface border border-base-border rounded-lg p-8 text-center">
            <p className="text-base-text-muted text-sm">
              Nothing to report yet. Invite a sub to get started.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard
                label="Subs"
                value={dash.subs_total}
                sublabel={`${dash.subs_active} active · ${dash.subs_blacklisted} blacklisted`}
              />
              <StatCard label="Rolling" value={dash.rolling_count} sublabel="Not paused" />
              <StatCard
                label="Active contracts"
                value={dash.contracts_active}
                sublabel="In repayment"
              />
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
        )}
      </div>
    </div>
  );
}
