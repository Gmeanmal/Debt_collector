import { useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTributeGauge, tributeGaugeKey } from "@/services/tributeMinimum/tributeMinimumApi";
import type { GaugeColor } from "@/services/tributeMinimum/tributeMinimumApi";
import { formatGBP } from "@/services/format/currency";

// TODO: when /goddess/subs/:subId/tribute-minimum route is registered in the router,
// replace the "Not configured" stub with: <Link to={`/goddess/subs/${subId}/tribute-minimum`}>Configure</Link>

const COLOR_BAR_CLASSES: Record<GaugeColor, string> = {
  green: "bg-status-success",
  amber: "bg-status-warning",
  red: "bg-status-danger",
};

const COLOR_TEXT_CLASSES: Record<GaugeColor, string> = {
  green: "text-status-success",
  amber: "text-status-warning",
  red: "text-status-danger",
};

function periodLabel(period: "weekly" | "monthly" | null): string {
  if (period === "weekly") return "This week";
  if (period === "monthly") return "This month";
  return "This period";
}

function formatGbp(value: string | null): string {
  return formatGBP(value);
}

function clampRatio(ratio: string | null): number {
  if (ratio === null) return 0;
  const n = Number.parseFloat(ratio);
  return Math.min(Math.max(n, 0), 1);
}

interface GaugeFillProps {
  ratioPercent: number;
  barClass: string;
}

function GaugeFill({ ratioPercent, barClass }: GaugeFillProps) {
  const fillRef = useRef<HTMLDivElement>(null);

  // Runtime-computed width cannot be expressed as a static Tailwind class.
  // Set via CSS custom property on the DOM element to satisfy the no-inline-style rule.
  useEffect(() => {
    if (fillRef.current) {
      fillRef.current.style.setProperty("--gauge-fill-width", `${ratioPercent.toFixed(2)}%`);
    }
  }, [ratioPercent]);

  return (
    <div
      ref={fillRef}
      className={`gauge-fill-el absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ${barClass}`}
    />
  );
}

interface TributeGaugeProps {
  subId: string;
}

export function TributeGauge({ subId }: TributeGaugeProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: tributeGaugeKey(subId),
    queryFn: () => getTributeGauge(subId),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-3 rounded-md bg-base-surface-raised border border-base-border">
        <div className="h-4 w-32 rounded bg-base-surface animate-pulse" />
        <div className="h-3 w-full rounded-full bg-base-surface animate-pulse" />
        <div className="h-3 w-24 rounded bg-base-surface animate-pulse" />
      </div>
    );
  }

  if (isError || !data) {
    return null;
  }

  if (!data.configured) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-md bg-base-surface-raised border border-base-border">
        <span className="text-sm text-base-text-muted">No tribute minimum set.</span>
        <span className="text-sm text-base-text-subtle">Configure via sub settings.</span>
      </div>
    );
  }

  const ratioPercent = clampRatio(data.ratio) * 100;
  const barClass = COLOR_BAR_CLASSES[data.color];
  const textClass = COLOR_TEXT_CLASSES[data.color];
  const label = periodLabel(data.period);

  return (
    <div className="flex flex-col gap-2 p-3 rounded-md bg-base-surface-raised border border-base-border">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-base-text-muted uppercase tracking-wide">
          Tribute — {label}
        </span>
        <span className={`text-sm font-semibold tabular-nums ${textClass}`}>
          {formatGbp(data.actual_this_period)} / {formatGbp(data.target_amount)}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={Math.round(ratioPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Tribute progress: ${Math.round(ratioPercent)}% of target`}
        className="relative h-2.5 w-full rounded-full bg-base-surface overflow-hidden"
      >
        <GaugeFill ratioPercent={ratioPercent} barClass={barClass} />
      </div>

      <p className="text-xs text-base-text-subtle" role="status">
        {Math.round(ratioPercent)}% of {formatGbp(data.target_amount)} target
      </p>
    </div>
  );
}
