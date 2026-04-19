import { NavLink } from "react-router-dom";
import { LogOut, Search, User } from "lucide-react";
import type { components } from "@/types/api.generated";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { PushOptInToggle } from "@/components/layout/PushOptInToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserOut = components["schemas"]["UserOut"];

interface TopbarProps {
  crumbs: string[];
  title: string;
  user: UserOut;
  onLogout: () => void;
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "·"
  );
}

function handleFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local || email;
}

export function Topbar({ crumbs, title, user, onLogout }: TopbarProps) {
  return (
    <header className="hidden md:flex sticky top-0 z-30 items-center gap-5 bg-bg border-b border-line px-8 py-[18px]">
      <div className="flex-1 min-w-0">
        {crumbs.length > 0 && (
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint truncate">
            {crumbs.join(" / ")}
          </div>
        )}
        {title && (
          <div className="font-serif italic text-[22px] leading-tight text-text tracking-[-0.01em] truncate">
            {title}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        <button
          type="button"
          disabled
          aria-label="Search (coming soon)"
          className="grid place-items-center h-8 w-8 rounded-full border border-line bg-bg-elev text-text-mute opacity-60 cursor-not-allowed"
        >
          <Search className="h-[14px] w-[14px]" aria-hidden="true" />
        </button>
        <NotificationBell enabled={true} />
        <AccountMenu user={user} onLogout={onLogout} />
      </div>
    </header>
  );
}

interface AccountMenuProps {
  user: UserOut;
  onLogout: () => void;
}

export function AccountMenu({ user, onLogout }: AccountMenuProps) {
  const handle = handleFromEmail(user.email);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex items-center rounded-full p-0.5 transition-colors hover:bg-bg-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials(user.display_name)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5 normal-case tracking-normal">
            <span className="font-serif italic text-[15px] text-text leading-tight">
              {user.display_name}
            </span>
            <span className="font-mono text-[11px] text-text-faint">@{handle}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <NavLink to="/profile" className="flex items-center gap-2 w-full">
            <User className="h-4 w-4" />
            Profile
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
          <PushOptInToggle />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onLogout()}>
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
