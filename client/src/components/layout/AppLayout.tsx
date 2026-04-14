import { useEffect, useRef, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/services/auth/useAuth";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useTheme, type ThemePref } from "@/hooks/useTheme";

interface AppLayoutProps {
  children: ReactNode;
}

interface NavItem {
  to: string;
  label: string;
}

const GODDESS_NAV: NavItem[] = [
  { to: "/", label: "Dashboard" },
  { to: "/goddess/invitations", label: "Invitations" },
  { to: "/goddess/invite", label: "New invite" },
  { to: "/goddess/validations", label: "Pending validations" },
  { to: "/goddess/payments/record", label: "Record payment" },
  { to: "/goddess/payment-methods", label: "Payment methods" },
];

const SUB_NAV: NavItem[] = [
  { to: "/", label: "Dashboard" },
  { to: "/sub/payments", label: "My payments" },
  { to: "/sub/payments/new", label: "Declare a payment" },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/", label: "Dashboard" },
  { to: "/admin", label: "Console" },
  { to: "/admin/cron", label: "Cron" },
];

function isThemePref(value: string | null | undefined): value is ThemePref {
  return value === "system" || value === "dark" || value === "light";
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const { setPrefLocal } = useTheme();
  const hydratedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      hydratedForUserRef.current = null;
      return;
    }
    if (hydratedForUserRef.current === user.id) return;
    hydratedForUserRef.current = user.id;
    if (isThemePref(user.theme_preference)) {
      setPrefLocal(user.theme_preference);
    }
  }, [user, setPrefLocal]);

  const nav = (() => {
    if (user?.role === "goddess") return GODDESS_NAV;
    if (user?.role === "sub") return SUB_NAV;
    if (user?.role === "admin") return ADMIN_NAV;
    return [];
  })();

  return (
    <div className="min-h-screen bg-base-bg flex flex-col">
      <header className="bg-base-surface border-b border-base-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
          <h1 className="font-display text-xl font-bold text-pink-primary tracking-wider">
            Debt Collector
          </h1>
          <nav className="flex-1 flex flex-wrap gap-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-pink-primary text-white"
                      : "text-base-text-muted hover:bg-base-surface-raised hover:text-base-text"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <ThemeToggle />
            <NotificationBell enabled={user != null} />
            {user && (
              <span className="text-base-text-muted">
                <span className="text-pink-primary font-semibold">{user.display_name}</span>
                <span className="text-base-text-subtle"> · {user.role}</span>
              </span>
            )}
            <button
              onClick={logout}
              className="text-base-text-muted hover:text-pink-primary transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
