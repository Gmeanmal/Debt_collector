import { cn } from "@/lib/utils";
import type { DatePreset, UseDashboardDateRangeResult } from "@/hooks/useDashboardDateRange";

const PRESETS: { label: string; value: DatePreset }[] = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "YTD", value: "YTD" },
  { label: "Custom", value: "custom" },
];

interface Props extends UseDashboardDateRangeResult {
  className?: string;
}

export function DateRangeSelector({
  range,
  customFrom,
  customTo,
  setPreset,
  setCustomFrom,
  setCustomTo,
  applyCustom,
  isCustomValid,
  className,
}: Props) {
  const activePreset = range.preset;

  return (
    <div
      className={cn("flex flex-wrap items-center gap-3", className)}
      role="group"
      aria-label="Chart date range"
    >
      <div className="flex items-center rounded-[999px] border border-line bg-bg-elev p-0.5 gap-0.5">
        {PRESETS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => setPreset(value)}
            aria-pressed={activePreset === value}
            className={cn(
              "rounded-[999px] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              activePreset === value
                ? "bg-accent-trace text-accent-deep"
                : "text-text-mute hover:text-text",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activePreset === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label htmlFor="date-range-from" className="text-xs text-text-mute">
              From
            </label>
            <input
              id="date-range-from"
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-[6px] border border-line bg-bg-elev px-2 py-1 text-xs text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label htmlFor="date-range-to" className="text-xs text-text-mute">
              To
            </label>
            <input
              id="date-range-to"
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-[6px] border border-line bg-bg-elev px-2 py-1 text-xs text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>
          {customFrom.length > 0 && customTo.length > 0 && !isCustomValid && (
            <p className="text-xs text-bad-ink" role="alert">
              "From" must be before "To"
            </p>
          )}
          <button
            type="button"
            onClick={applyCustom}
            disabled={!isCustomValid}
            className={cn(
              "rounded-[6px] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              isCustomValid
                ? "bg-accent-trace text-accent-deep hover:bg-accent-soft"
                : "cursor-not-allowed text-text-faint opacity-50",
            )}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
