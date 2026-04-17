import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/services/auth/useAuth";
import { useGoddessDashboardSummary } from "@/hooks/dashboard/useGoddessDashboardSummary";
import { useSubDashboardSummary } from "@/hooks/dashboard/useSubDashboardSummary";
import { DashboardSummaryGrid } from "@/components/dashboard/DashboardSummaryGrid";
import { SubSummaryGrid } from "@/components/dashboard/SubSummaryGrid";
import { ErrorState } from "@/components/ui/ErrorState";

interface ActionCard {
  to: string;
  title: string;
  description: string;
}

const GODDESS_ACTIONS: ActionCard[] = [
  {
    to: "/goddess/dashboard",
    title: "Dashboard",
    description: "Overview of subs, rolling, contracts, and late payments.",
  },
  {
    to: "/goddess/invitations",
    title: "Invitations",
    description: "View all invitations you have issued and their status.",
  },
  {
    to: "/goddess/invite",
    title: "Invite a new sub",
    description: "Generate a one-time link with an entry tribute amount.",
  },
  {
    to: "/goddess/validations",
    title: "Pending validations",
    description: "Review payment declarations waiting for your approval.",
  },
  {
    to: "/goddess/payments/record",
    title: "Record a payment",
    description: "Log a tribute you have already received from a sub.",
  },
  {
    to: "/goddess/payment-methods",
    title: "Payment methods",
    description: "Manage the payment channels subs can use to pay you.",
  },
  {
    to: "/goddess/debts",
    title: "Debt contracts",
    description: "View and manage all debt contracts across your subs.",
  },
  {
    to: "/goddess/blacklist",
    title: "Blacklist",
    description: "Review breached subs and process reinstatements.",
  },
  {
    to: "/goddess/profile-change-requests",
    title: "Profile change requests",
    description: "Review and act on sub profile change requests.",
  },
];

const ADMIN_ACTIONS: ActionCard[] = [
  {
    to: "/admin/cron",
    title: "Run cron",
    description: "Manually trigger the daily cron job.",
  },
];

interface ActionGridProps {
  actions: ActionCard[];
  alertRoutes?: Set<string>;
}

function ActionGrid({ actions, alertRoutes }: ActionGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {actions.map((a) => {
        const hasAlert = alertRoutes?.has(a.to) ?? false;
        return (
          <Link
            key={a.to}
            to={a.to}
            className={cn(
              "bg-base-surface rounded-lg p-5 hover:border-pink-primary transition-colors flex flex-col gap-2 border",
              hasAlert ? "border-pink-primary" : "border-base-border",
            )}
          >
            <h3 className="text-base-text font-semibold">{a.title}</h3>
            <p className="text-base-text-muted text-sm">{a.description}</p>
          </Link>
        );
      })}
    </div>
  );
}

function SubHome({ displayName }: { displayName: string }) {
  const { data: summary, isLoading, isError, error } = useSubDashboardSummary();

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl text-pink-primary">{`Welcome, ${displayName}`}</h2>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg bg-base-surface border border-base-border p-4 h-20 animate-pulse"
            />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <ErrorState
          title="Failed to load dashboard summary"
          message={error?.message ?? "Try refreshing the page."}
        />
      )}

      {!isLoading && !isError && summary && <SubSummaryGrid summary={summary} />}
    </div>
  );
}

function GoddessHome({ displayName }: { displayName: string }) {
  const { data: summary, isLoading, isError, error } = useGoddessDashboardSummary();

  const alertRoutes = new Set<string>();
  if (summary && summary.profile_change_requests_count > 0) {
    alertRoutes.add("/goddess/profile-change-requests");
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl text-pink-primary">{`Welcome, ${displayName}`}</h2>
        <p className="text-base-text-muted text-sm mt-1">
          Manage your subs, invitations and tributes from here.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg bg-base-surface border border-base-border p-4 h-20 animate-pulse"
            />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <ErrorState
          title="Failed to load dashboard summary"
          message={error?.message ?? "Try refreshing the page."}
        />
      )}

      {!isLoading && !isError && summary && <DashboardSummaryGrid summary={summary} />}

      <ActionGrid actions={GODDESS_ACTIONS} alertRoutes={alertRoutes} />
    </div>
  );
}

export function HomeRoute() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === "goddess") {
    return <GoddessHome displayName={user.display_name} />;
  }

  if (user.role === "sub") {
    return <SubHome displayName={user.display_name} />;
  }

  if (user.role === "admin") {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8 flex flex-col gap-6">
        <div>
          <h2 className="font-display text-2xl text-pink-primary">{`Welcome, ${user.display_name}`}</h2>
          <p className="text-base-text-muted text-sm mt-1">Operational controls.</p>
        </div>
        <ActionGrid actions={ADMIN_ACTIONS} />
      </div>
    );
  }

  return null;
}
