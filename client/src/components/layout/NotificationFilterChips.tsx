import { cn } from "@/lib/utils";
import {
  FILTER_KINDS,
  HIDDEN_CHIPS,
  type ChipId,
} from "@/services/notifications/notificationKinds";
import type { NotificationOut } from "@/services/notifications/notificationsApi";

const CHIP_LABELS: Record<ChipId, string> = {
  all: "All",
  validations: "Validations",
  late: "Late",
  kink_updates: "Kink updates",
  contract_events: "Contract events",
};

interface Props {
  activeChip: ChipId;
  items: NotificationOut[];
  onChange: (chip: ChipId) => void;
}

function unreadCountForChip(chip: ChipId, items: NotificationOut[]): number {
  if (chip === "all") return items.filter((n) => !n.read_at).length;
  const types = FILTER_KINDS[chip];
  return items.filter((n) => !n.read_at && (types as string[]).includes(n.type)).length;
}

const ALL_CHIPS: ChipId[] = ["all", "validations", "late", "kink_updates", "contract_events"];

export function NotificationFilterChips({ activeChip, items, onChange }: Props) {
  const visibleChips = ALL_CHIPS.filter((c) => !HIDDEN_CHIPS.includes(c));

  return (
    <div
      role="group"
      aria-label="Filter notifications"
      className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-base-border"
    >
      {visibleChips.map((chip) => {
        const count = unreadCountForChip(chip, items);
        const label = CHIP_LABELS[chip];
        const isActive = activeChip === chip;

        return (
          <button
            key={chip}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(chip)}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary",
              isActive
                ? "bg-pink-primary text-pink-foreground"
                : "bg-base-surface-raised text-base-text-muted hover:text-base-text",
            )}
          >
            {label}
            {count > 0 && (
              <span
                className={cn(
                  "tabular-nums",
                  isActive ? "text-pink-foreground" : "text-pink-primary",
                )}
              >
                · {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
