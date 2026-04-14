import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LogOut, Menu, User, X } from "lucide-react";
import { useAuth } from "@/services/auth/useAuth";
import { ImpersonationBanner } from "@/components/layout/ImpersonationBanner";
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
  { to: "/goddess/subs", label: "Subs" },
  { to: "/goddess/invitations", label: "Invitations" },
  { to: "/goddess/validations", label: "Validations" },
  { to: "/goddess/payments/record", label: "Record" },
  { to: "/goddess/payment-methods", label: "Methods" },
  { to: "/goddess/debts", label: "Contracts" },
  { to: "/goddess/weekly", label: "Weekly" },
  { to: "/goddess/late", label: "Late" },
];

const SUB_NAV: NavItem[] = [
  { to: "/", label: "Dashboard" },
  { to: "/sub/payments", label: "My payments" },
  { to: "/sub/payments/new", label: "Declare" },
  { to: "/sub/debts", label: "Contracts" },
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

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

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("overflow-hidden");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("overflow-hidden");
    };
  }, [mobileOpen]);

  const nav = (() => {
    if (user?.role === "goddess") return GODDESS_NAV;
    if (user?.role === "sub") return SUB_NAV;
    if (user?.role === "admin") return ADMIN_NAV;
    return [];
  })();

  return (
    <div className="min-h-screen bg-base-bg flex flex-col">
      <ImpersonationBanner />
      <header className="sticky top-0 z-40 border-b border-base-border/60 bg-base-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 sm:gap-8 px-3 sm:px-6 py-4">
          {nav.length > 0 && (
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden flex items-center justify-center h-9 w-9 rounded-md text-base-text-muted hover:text-base-text hover:bg-base-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-ring"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}

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

          <div className="flex flex-1 md:flex-none items-center justify-end gap-2 sm:gap-3">
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
                  <DropdownMenuItem asChild>
                    <NavLink to="/profile" className="flex items-center gap-2 w-full">
                      <User className="h-4 w-4" />
                      Profile
                    </NavLink>
                  </DropdownMenuItem>
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
      </header>

      {nav.length > 0 && (
        <div
          className={cn(
            "md:hidden fixed inset-0 z-50 transition-opacity duration-300",
            mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
          )}
          aria-hidden={!mobileOpen}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="absolute inset-0 bg-base-bg/70 backdrop-blur-md"
          />
          <nav
            id="mobile-nav"
            aria-label="Primary"
            className={cn(
              "absolute inset-y-0 left-0 w-[82%] max-w-sm bg-base-bg border-r border-base-border/60 shadow-2xl flex flex-col transition-transform duration-300 ease-out",
              mobileOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-border/40">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full border border-pink-primary/40 bg-pink-primary/10 flex items-center justify-center">
                  <span className="font-display text-base text-pink-primary">G</span>
                </div>
                <span className="font-display text-sm tracking-[0.25em] text-base-text uppercase">
                  Mean Mal
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="flex items-center justify-center h-9 w-9 rounded-md text-base-text-muted hover:text-base-text hover:bg-base-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-ring"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="px-5 pt-5 pb-2 text-[10px] font-medium uppercase tracking-[0.3em] text-pink-primary/80">
              Navigate
            </p>
            <div className="flex-1 overflow-y-auto px-3 pb-6 flex flex-col gap-0.5">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex items-center px-4 py-3 font-display text-lg tracking-wide rounded-lg transition-colors",
                      isActive
                        ? "text-pink-primary bg-pink-primary/10"
                        : "text-base-text-muted hover:text-base-text hover:bg-base-surface-raised",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-pink-primary transition-opacity",
                          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40",
                        )}
                      />
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      )}

      <main className="flex-1">{children}</main>
      <Toaster />
    </div>
  );
}
