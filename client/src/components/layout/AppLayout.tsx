import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/services/auth/useAuth";
import { useTheme, type ThemePref } from "@/hooks/useTheme";
import { ImpersonationBanner } from "@/components/layout/ImpersonationBanner";
import { SafewordBanner } from "@/components/layout/SafewordBanner";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { BrandLockup } from "@/components/layout/BrandMark";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar, AccountMenu } from "@/components/layout/Topbar";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import {
  GODDESS_NAV,
  SUB_NAV,
  ADMIN_NAV,
  type NavGroup,
  type NavItem,
} from "@/components/layout/navItems";
import { Toaster } from "@/components/ui/sonner";
import type { components } from "@/types/api.generated";

type UserOut = components["schemas"]["UserOut"];
type UserRole = UserOut["role"];

interface AppLayoutProps {
  children: ReactNode;
}

function isThemePref(value: string | null | undefined): value is ThemePref {
  return value === "system" || value === "dark" || value === "light";
}

function navFor(role: UserRole | undefined): NavGroup[] {
  if (role === "goddess") return GODDESS_NAV;
  if (role === "sub") return SUB_NAV;
  if (role === "admin") return ADMIN_NAV;
  return [];
}

function rootRedirectFor(role: UserRole | undefined): string | null {
  if (role === "goddess") return "/goddess/dashboard";
  if (role === "sub") return "/sub/dashboard";
  if (role === "admin") return "/admin";
  return null;
}

interface ActiveMatch {
  group: string;
  item: NavItem;
}

function findActive(
  nav: NavGroup[],
  pathname: string,
  role: UserRole | undefined,
): ActiveMatch | null {
  const target = pathname === "/" ? (rootRedirectFor(role) ?? "/") : pathname;
  for (const section of nav) {
    for (const item of section.items) {
      if (item.to === target) return { group: section.group, item };
    }
  }
  return null;
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

  const nav = useMemo(() => navFor(user?.role), [user?.role]);
  const active = useMemo(
    () => findActive(nav, location.pathname, user?.role),
    [nav, location.pathname, user?.role],
  );

  const crumbs = active ? [active.group] : [];
  const title = active?.item.label ?? "";

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <ImpersonationBanner />
      <SafewordBanner />

      {user ? (
        <div className="flex flex-1 min-h-0">
          <Sidebar nav={nav} user={user} />
          <div className="flex-1 min-w-0 flex flex-col">
            <MobileTopbar
              mobileOpen={mobileOpen}
              onToggle={() => setMobileOpen((v) => !v)}
              user={user}
              onLogout={() => void logout()}
            />
            <Topbar crumbs={crumbs} title={title} user={user} onLogout={() => void logout()} />
            <main className="flex-1 min-w-0 overflow-y-auto px-6 md:px-8 py-6">{children}</main>
          </div>
        </div>
      ) : (
        <main className="flex-1 min-w-0 px-6 md:px-8 py-6">{children}</main>
      )}

      {user && (
        <MobileDrawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          nav={nav}
          user={user}
        />
      )}

      <Toaster />
    </div>
  );
}

interface MobileTopbarProps {
  mobileOpen: boolean;
  onToggle: () => void;
  user: UserOut;
  onLogout: () => void;
}

function MobileTopbar({ mobileOpen, onToggle, user, onLogout }: MobileTopbarProps) {
  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 bg-bg border-b border-line px-3 py-3">
      <button
        type="button"
        onClick={onToggle}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileOpen}
        aria-controls="mobile-nav"
        className="grid place-items-center h-9 w-9 rounded-md text-text-mute hover:text-text hover:bg-bg-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        {mobileOpen ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
      <NavLink to="/" className="flex-1 min-w-0">
        <BrandLockup small />
      </NavLink>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationBell enabled={true} />
        <AccountMenu user={user} onLogout={onLogout} />
      </div>
    </header>
  );
}
