import { useEffect, useRef, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "@/services/auth/useAuth";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useTheme, type ThemePref } from "@/hooks/useTheme";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

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
  { to: "/goddess/validations", label: "Validations" },
  { to: "/goddess/payments/record", label: "Record" },
  { to: "/goddess/payment-methods", label: "Methods" },
];

const SUB_NAV: NavItem[] = [
  { to: "/", label: "Dashboard" },
  { to: "/sub/payments", label: "My payments" },
  { to: "/sub/payments/new", label: "Declare" },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/", label: "Dashboard" },
  { to: "/admin", label: "Console" },
  { to: "/admin/cron", label: "Cron" },
];

function isThemePref(value: string | null | undefined): value is ThemePref {
  return value === "system" || value === "dark" || value === "light";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
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
      <header className="sticky top-0 z-40 border-b border-base-border/60 bg-base-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-8 px-6 py-4">
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-full border border-pink-primary/40 bg-pink-primary/10 flex items-center justify-center transition-all duration-200 group-hover:bg-pink-primary/20">
              <span className="font-display text-base text-pink-primary">G</span>
            </div>
            <span className="font-display text-base tracking-[0.25em] text-base-text uppercase hidden sm:inline">
              Mean Mal
            </span>
          </NavLink>

          <nav className="flex-1 hidden md:flex items-center gap-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "relative px-3 py-2 text-sm font-medium tracking-wide transition-colors",
                    isActive ? "text-pink-primary" : "text-base-text-muted hover:text-base-text",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-px bg-pink-primary" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell enabled={user != null} />
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full p-0.5 transition-all duration-200 hover:bg-base-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-ring"
                    aria-label="Account menu"
                  >
                    <Avatar>
                      <AvatarFallback>{initials(user.display_name)}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[14rem]">
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-0.5 normal-case tracking-normal">
                      <span className="font-display text-base text-base-text">
                        {user.display_name}
                      </span>
                      <span className="text-xs text-base-text-subtle">{user.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void logout()}>
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <nav className="md:hidden border-t border-base-border/40 px-4 py-2 flex items-center gap-1 overflow-x-auto">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "px-3 py-1.5 text-xs font-medium uppercase tracking-wider whitespace-nowrap rounded-full transition-colors",
                  isActive
                    ? "bg-pink-primary text-pink-foreground"
                    : "text-base-text-muted hover:text-base-text",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1">{children}</main>
      <Toaster />
    </div>
  );
}
