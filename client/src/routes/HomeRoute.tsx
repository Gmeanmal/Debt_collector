import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/services/auth/useAuth";
import { listGoddessSubsApi } from "@/services/payments/paymentsApi";

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
];

const SUB_ACTIONS: ActionCard[] = [
  {
    to: "/sub/dashboard",
    title: "Dashboard",
    description: "See amount due, active contracts, and recent activity.",
  },
  {
    to: "/sub/payments",
    title: "My payments",
    description: "See the history of payments you have declared.",
  },
  {
    to: "/sub/payments/new",
    title: "Declare a payment",
    description: "Submit a new tribute for your Goddess to validate.",
  },
  {
    to: "/sub/debts",
    title: "Your contracts",
    description: "View all debt contracts you are party to.",
  },
  {
    to: "/sub/debts/new",
    title: "Propose a contract",
    description: "Submit proposed debt contract terms for your Goddess to review.",
  },
  {
    to: "/sub/adjustments",
    title: "Pending approvals",
    description: "Accept or refuse mid-contract adjustments from your Goddess.",
  },
];

const ADMIN_ACTIONS: ActionCard[] = [
  {
    to: "/admin/cron",
    title: "Run cron",
    description: "Manually trigger the daily cron job.",
  },
];

function NewContractNavCard() {
  const navigate = useNavigate();
  const [subId, setSubId] = useState("");
  const { data: subs = [] } = useQuery({
    queryKey: ["goddessSubs"],
    queryFn: listGoddessSubsApi,
  });

  return (
    <div className="bg-base-surface border border-base-border rounded-lg p-5 flex flex-col gap-3">
      <h3 className="text-base-text font-semibold">New contract</h3>
      <p className="text-base-text-muted text-sm">Propose a debt contract for a specific sub.</p>
      <div className="flex gap-2 flex-wrap items-center">
        <select
          value={subId}
          onChange={(e) => setSubId(e.target.value)}
          aria-label="Select sub for new contract"
          className="bg-base-surface-raised border border-base-border rounded-md px-3 py-1.5 text-base-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary flex-1 min-w-0"
        >
          <option value="">Select a sub</option>
          {subs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.display_name} ({s.username})
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!subId}
          onClick={() => navigate(`/goddess/subs/${subId}/debts/new`)}
          className="px-3 py-1.5 text-sm bg-pink-primary text-pink-foreground font-semibold rounded-md hover:bg-pink-primary-hover transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-pink-primary shrink-0"
        >
          Go
        </button>
      </div>
    </div>
  );
}

function RollingNavCard() {
  const navigate = useNavigate();
  const [subId, setSubId] = useState("");
  const { data: subs = [] } = useQuery({
    queryKey: ["goddessSubs"],
    queryFn: listGoddessSubsApi,
  });

  return (
    <div className="bg-base-surface border border-base-border rounded-lg p-5 flex flex-col gap-3">
      <h3 className="text-base-text font-semibold">Manage rolling</h3>
      <p className="text-base-text-muted text-sm">
        Configure a sub's weekly rolling tribute schedule.
      </p>
      <div className="flex gap-2 flex-wrap items-center">
        <select
          value={subId}
          onChange={(e) => setSubId(e.target.value)}
          aria-label="Select sub for rolling editor"
          className="bg-base-surface-raised border border-base-border rounded-md px-3 py-1.5 text-base-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary flex-1 min-w-0"
        >
          <option value="">Select a sub</option>
          {subs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.display_name} ({s.username})
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!subId}
          onClick={() => navigate(`/goddess/subs/${subId}/rolling`)}
          className="px-3 py-1.5 text-sm bg-pink-primary text-pink-foreground font-semibold rounded-md hover:bg-pink-primary-hover transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-pink-primary shrink-0"
        >
          Go
        </button>
      </div>
    </div>
  );
}

function BreachSubNavCard() {
  const navigate = useNavigate();
  const [subId, setSubId] = useState("");
  const { data: subs = [] } = useQuery({
    queryKey: ["goddessSubs"],
    queryFn: listGoddessSubsApi,
  });

  return (
    <div className="bg-base-surface border border-base-border rounded-lg p-5 flex flex-col gap-3">
      <h3 className="text-base-text font-semibold">Breach a sub</h3>
      <p className="text-base-text-muted text-sm">
        Mark a sub as breached and move them to the blacklist.
      </p>
      <div className="flex gap-2 flex-wrap items-center">
        <select
          value={subId}
          onChange={(e) => setSubId(e.target.value)}
          aria-label="Select sub to breach"
          className="bg-base-surface-raised border border-base-border rounded-md px-3 py-1.5 text-base-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-debt-primary flex-1 min-w-0"
        >
          <option value="">Select a sub</option>
          {subs
            .filter((s) => s.status === "active")
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.display_name} ({s.username})
              </option>
            ))}
        </select>
        <button
          type="button"
          disabled={!subId}
          onClick={() => navigate(`/goddess/subs/${subId}/breach`)}
          className="px-3 py-1.5 text-sm bg-debt-primary text-pink-foreground font-semibold rounded-md hover:bg-debt-primary-hover transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-debt-primary shrink-0"
        >
          Go
        </button>
      </div>
    </div>
  );
}

function ActionGrid({ actions }: { actions: ActionCard[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {actions.map((a) => (
        <Link
          key={a.to}
          to={a.to}
          className="bg-base-surface border border-base-border rounded-lg p-5 hover:border-pink-primary transition-colors flex flex-col gap-2"
        >
          <h3 className="text-base-text font-semibold">{a.title}</h3>
          <p className="text-base-text-muted text-sm">{a.description}</p>
        </Link>
      ))}
    </div>
  );
}

export function HomeRoute() {
  const { user } = useAuth();
  if (!user) return null;

  const greeting = `Welcome, ${user.display_name}`;

  if (user.role === "goddess") {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8 flex flex-col gap-6">
        <div>
          <h2 className="font-display text-2xl text-pink-primary">{greeting}</h2>
          <p className="text-base-text-muted text-sm mt-1">
            Manage your subs, invitations and tributes from here.
          </p>
        </div>
        <ActionGrid actions={GODDESS_ACTIONS} />
        <RollingNavCard />
        <NewContractNavCard />
        <BreachSubNavCard />
      </div>
    );
  }

  if (user.role === "sub") {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8 flex flex-col gap-6">
        <div>
          <h2 className="font-display text-2xl text-pink-primary">{greeting}</h2>
          <p className="text-base-text-muted text-sm mt-1">
            Declare new tributes and review your payment history.
          </p>
        </div>
        <ActionGrid actions={SUB_ACTIONS} />
      </div>
    );
  }

  if (user.role === "admin") {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8 flex flex-col gap-6">
        <div>
          <h2 className="font-display text-2xl text-pink-primary">{greeting}</h2>
          <p className="text-base-text-muted text-sm mt-1">Operational controls.</p>
        </div>
        <ActionGrid actions={ADMIN_ACTIONS} />
      </div>
    );
  }

  return null;
}
