import { cn } from "@/lib/utils";
import type { KinkRating } from "@/services/kinks/kinksApi";

interface RatingOption {
  value: KinkRating;
  label: string;
  shortLabel: string;
  className: string;
  activeClassName: string;
}

const RATING_OPTIONS: RatingOption[] = [
  {
    value: "hard_limit",
    label: "Hard limit",
    shortLabel: "✗",
    className: "border-status-danger text-status-danger hover:bg-status-danger/10",
    activeClassName: "bg-status-danger text-base-surface border-status-danger",
  },
  {
    value: "soft_limit",
    label: "Soft limit",
    shortLabel: "~",
    className: "border-status-warning text-status-warning hover:bg-status-warning/10",
    activeClassName: "bg-status-warning text-base-surface border-status-warning",
  },
  {
    value: "not_set",
    label: "Not set",
    shortLabel: "–",
    className: "border-base-border text-base-text-muted hover:bg-base-surface-raised",
    activeClassName: "bg-base-surface-raised text-base-text border-base-border",
  },
  {
    value: "curious",
    label: "Curious",
    shortLabel: "?",
    className: "border-status-info text-status-info hover:bg-status-info/10",
    activeClassName: "bg-status-info text-base-surface border-status-info",
  },
  {
    value: "loves",
    label: "Loves",
    shortLabel: "♥",
    className: "border-pink-primary text-pink-primary hover:bg-pink-primary/10",
    activeClassName: "bg-pink-primary text-pink-foreground border-pink-primary",
  },
  {
    value: "fetish_need",
    label: "Fetish need",
    shortLabel: "★",
    className: "border-gold-accent text-gold-accent hover:bg-gold-accent/10",
    activeClassName: "bg-gold-accent text-gold-foreground border-gold-accent",
  },
];

interface Props {
  value: KinkRating;
  onChange: (rating: KinkRating) => void;
  compact?: boolean;
  disabled?: boolean;
}

export function RatingPicker({ value, onChange, compact = false, disabled = false }: Props) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Kink rating">
      {RATING_OPTIONS.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            aria-label={opt.label}
            aria-pressed={isActive}
            title={opt.label}
            className={cn(
              "border rounded text-xs font-medium transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary focus-visible:ring-offset-1 focus-visible:ring-offset-base-bg",
              "disabled:opacity-40 disabled:pointer-events-none",
              compact ? "h-7 px-1.5 min-w-[1.75rem]" : "h-8 px-2 min-w-[4.5rem]",
              isActive ? opt.activeClassName : opt.className,
            )}
          >
            {compact ? opt.shortLabel : opt.label}
          </button>
        );
      })}
    </div>
  );
}
