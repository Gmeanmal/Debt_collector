import { X } from "lucide-react";
import type { components } from "@/types/api.generated";
import type { NavGroup } from "@/components/layout/navItems";
import { BrandLockup } from "@/components/layout/BrandMark";
import { NavSections } from "@/components/layout/NavSections";
import { cn } from "@/lib/utils";

type UserOut = components["schemas"]["UserOut"];

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  nav: NavGroup[];
  user: UserOut;
}

function handleFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local || email;
}

export function MobileDrawer({ open, onClose, nav, user }: MobileDrawerProps) {
  const handle = handleFromEmail(user.email);
  return (
    <div
      className={cn(
        "md:hidden fixed inset-0 z-50 transition-opacity duration-300",
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close menu"
        className="absolute inset-0 bg-ink-400/55 backdrop-blur-sm"
      />
      <aside
        id="mobile-nav"
        aria-label="Primary"
        className={cn(
          "absolute inset-y-0 left-0 w-[82%] max-w-sm bg-bg-elev border-r border-line shadow-md flex flex-col transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-line">
          <BrandLockup small />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid place-items-center h-9 w-9 rounded-md text-text-mute hover:text-text hover:bg-bg-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavSections nav={nav} onNavigate={onClose} density="roomy" />
        </div>

        <div className="border-t border-line px-4 py-3 flex items-center gap-2.5">
          <div className="grid place-items-center h-[30px] w-[30px] rounded-full border border-accent bg-accent-soft text-accent-deep font-mono text-[11px] font-semibold shrink-0">
            {user.display_name.trim().charAt(0).toUpperCase() || "·"}
          </div>
          <div className="min-w-0 flex-1 leading-[1.15]">
            <div className="text-[12.5px] font-semibold text-text truncate">
              {user.display_name}
            </div>
            <div className="font-mono text-[10.5px] text-text-faint truncate">
              @{handle}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
