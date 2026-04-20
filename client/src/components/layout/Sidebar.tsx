import type { components } from "@/types/api.generated";
import type { NavGroup } from "@/components/layout/navItems";
import { BrandLockup } from "@/components/layout/BrandMark";
import { NavSections } from "@/components/layout/NavSections";

type UserOut = components["schemas"]["UserOut"];

interface SidebarProps {
  nav: NavGroup[];
  user: UserOut;
}

export function Sidebar({ nav, user }: SidebarProps) {
  return (
    <aside className="hidden md:flex md:flex-col md:w-[232px] md:shrink-0 md:bg-bg-elev md:border-r md:border-line md:py-5 md:px-[14px] md:gap-[18px]">
      <div className="px-2 pt-0.5 pb-3">
        <BrandLockup />
      </div>

      <NavSections nav={nav} />

      <SidebarFooter user={user} />
    </aside>
  );
}

interface SidebarFooterProps {
  user: UserOut;
}

function initial(role: UserOut["role"], displayName: string): string {
  if (role === "goddess") return "G";
  if (role === "admin") return "A";
  const trimmed = displayName.trim();
  if (!trimmed) return "S";
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "S";
}

function handleFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local || email;
}

function SidebarFooter({ user }: SidebarFooterProps) {
  const disc = initial(user.role, user.display_name);
  const handle = handleFromEmail(user.email);
  return (
    <div className="mt-1 border-t border-line pt-3 px-2 flex items-center gap-2.5">
      <div className="grid place-items-center h-[30px] w-[30px] rounded-full border border-accent bg-accent-soft text-accent-deep font-mono text-[11px] font-semibold shrink-0">
        {disc}
      </div>
      <div className="min-w-0 flex-1 leading-[1.15]">
        <div className="text-[12.5px] font-semibold text-text truncate">{user.display_name}</div>
        <div className="font-mono text-[10.5px] text-text-faint truncate">@{handle}</div>
      </div>
    </div>
  );
}
