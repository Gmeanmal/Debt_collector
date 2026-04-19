import { cn } from "@/lib/utils";
import type { KinkRating } from "@/services/kinks/kinksApi";

interface RatingOption {
  value: KinkRating;
  label: string;
  shortLabel: string;
  tooltip: string | null;
  className: string;
  activeClassName: string;
}

const RATING_OPTIONS: RatingOption[] = [
  {
    value: "hard_limit",
    label: "Hard limit",
    shortLabel: "✗",
    tooltip: "Hard limit",
    className: "border-bad-ink text-bad-ink hover:bg-bad-bg",
    activeClassName: "bg-bad-bg text-bad-ink border-bad-ink font-semibold",
  },
  {
    value: "soft_limit",
    label: "Dislike",
    shortLabel: "–",
    tooltip: "Dislike",
    className: "border-warn-ink text-warn-ink hover:bg-warn-bg",
    activeClassName: "bg-warn-bg text-warn-ink border-warn-ink",
  },
  {
    value: "not_set",
    label: "Not set",
    shortLabel: "·",
    tooltip: null,
    className: "border-line text-text-mute hover:bg-bg-sunken",
    activeClassName: "bg-bg-sunken text-text border-line",
  },
  {
    value: "curious",
    label: "Curious",
    shortLabel: "?",
    tooltip: "Curious",
    className: "border-warn-ink text-warn-ink hover:bg-warn-bg",
    activeClassName: "bg-warn-bg text-warn-ink border-warn-ink",
  },
  {
    value: "loves",
    label: "Like",
    shortLabel: "+",
    tooltip: "Like",
    className: "border-signal-ink text-signal-ink hover:bg-signal-soft",
    activeClassName: "bg-signal-soft text-signal-ink border-signal-ink",
  },
  {
    value: "fetish_need",
    label: "Crave",
    shortLabel: "++",
    tooltip: "Crave",
    className: "border-accent text-accent-deep hover:bg-accent-trace",
    activeClassName: "bg-accent-soft text-accent-deep border-accent",
  },
];

interface Props {
  value: KinkRating;
  onChange: (rating: KinkRating) => void;
  compact?: boolean;
  disabled?: boolean;
}

export function RatingPicker({ value, onChange, compact = false, disabled = false }: Props) {
  const isPreferNotToSay = value === "prefer_not_to_say";

  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Kink rating">
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
            title={opt.tooltip ?? undefined}
            className={cn(
              "border rounded text-xs font-medium transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
              "disabled:opacity-40 disabled:pointer-events-none",
              compact ? "h-7 px-1.5 min-w-[1.75rem]" : "h-8 px-2 min-w-[4.5rem]",
              isActive ? opt.activeClassName : opt.className,
            )}
          >
            {compact ? opt.shortLabel : opt.label}
          </button>
        );
      })}

      <span className="border-l border-line mx-2 self-stretch" aria-hidden="true" />

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("prefer_not_to_say")}
        aria-label="Prefer not to say"
        aria-pressed={isPreferNotToSay}
        className={cn(
          "border rounded text-xs font-medium transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
          "disabled:opacity-40 disabled:pointer-events-none",
          compact ? "h-7 px-2" : "h-8 px-2",
          isPreferNotToSay
            ? "border-accent text-accent-deep bg-accent-trace"
            : "border-line text-text-mute hover:bg-bg-sunken",
        )}
      >
        Prefer not to say
      </button>
    </div>
  );
}
