import { Link } from "react-router-dom";
import { useAuth } from "@/services/auth/useAuth";

interface ActionCard {
  to: string;
  title: string;
  description: string;
}

const GODDESS_ACTIONS: ActionCard[] = [
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
];

const SUB_ACTIONS: ActionCard[] = [
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
];

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

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl text-pink-primary">{greeting}</h2>
        <p className="text-base-text-muted text-sm mt-1">
          Admin console is not available yet — planned for a later phase.
        </p>
      </div>
    </div>
  );
}
