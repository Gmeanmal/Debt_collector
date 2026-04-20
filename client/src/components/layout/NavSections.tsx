import { NavLink } from "react-router-dom";
import type { NavGroup, NavItem } from "@/components/layout/navItems";
import { cn } from "@/lib/utils";

interface NavSectionsProps {
  nav: NavGroup[];
  onNavigate?: () => void;
  density?: "compact" | "roomy";
}

export function NavSections({ nav, onNavigate, density = "compact" }: NavSectionsProps) {
  const itemPad = density === "roomy" ? "px-3 py-2.5" : "px-2.5 py-[7px]";
  return (
    <nav className="flex flex-1 flex-col gap-[14px]" aria-label="Primary">
      {nav.map((section) => (
        <div key={section.group}>
          <div className="px-2.5 pb-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-text-faint">
            {section.group}
          </div>
          <div className="flex flex-col gap-px">
            {section.items.map((item) => (
              <NavRow key={item.to} item={item} onNavigate={onNavigate} padClass={itemPad} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

interface NavRowProps {
  item: NavItem;
  padClass: string;
  onNavigate?: () => void;
}

function NavRow({ item, padClass, onNavigate }: NavRowProps) {
  return (
    <NavLink
      to={item.to}
      end
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-2 rounded-[6px] -ml-[2px] border-l-2 text-[13.5px] transition-colors",
          padClass,
          isActive
            ? "bg-accent-trace text-accent-deep font-semibold border-accent"
            : "text-text border-transparent hover:bg-bg-sunken",
        )
      }
    >
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge != null && <NavBadge tone={item.tone} value={item.badge} />}
    </NavLink>
  );
}

interface NavBadgeProps {
  tone?: NavItem["tone"];
  value: number;
}

function NavBadge({ tone, value }: NavBadgeProps) {
  const isWarn = tone === "warn" || tone === "bad";
  return (
    <span
      className={cn(
        "font-mono text-[10px] font-semibold min-w-[18px] h-[18px] px-[5px] rounded-[4px] grid place-items-center",
        isWarn ? "bg-bad-bg text-bad-ink" : "bg-accent text-accent-ink",
      )}
    >
      {value}
    </span>
  );
}
