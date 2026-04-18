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
    <div className={cn("flex flex-wrap items-center gap-3", className)} role="group" aria-label="Chart date range">
      <div className="flex items-center rounded-md border border-base-border bg-base-surface p-0.5 gap-0.5">
        {PRESETS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => setPreset(value)}
            aria-pressed={activePreset === value}
            className={cn(
              "rounded px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary",
              activePreset === value
                ? "bg-pink-primary/20 text-pink-primary ring-1 ring-inset ring-pink-primary/40"
                : "text-base-text-muted hover:text-base-text",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activePreset === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="date-range-from"
              className="text-xs text-base-text-muted"
            >
              From
            </label>
            <input
              id="date-range-from"
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded border border-base-border bg-base-surface px-2 py-1 text-xs text-base-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="date-range-to"
              className="text-xs text-base-text-muted"
            >
              To
            </label>
            <input
              id="date-range-to"
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded border border-base-border bg-base-surface px-2 py-1 text-xs text-base-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
            />
          </div>
          {customFrom.length > 0 && customTo.length > 0 && !isCustomValid && (
            <p className="text-xs text-status-danger" role="alert">
              "From" must be before "To"
            </p>
          )}
          <button
            type="button"
            onClick={applyCustom}
            disabled={!isCustomValid}
            className={cn(
              "rounded px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary",
              isCustomValid
                ? "bg-pink-primary/20 text-pink-primary hover:bg-pink-primary/30"
                : "cursor-not-allowed text-base-text-subtle opacity-50",
            )}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
