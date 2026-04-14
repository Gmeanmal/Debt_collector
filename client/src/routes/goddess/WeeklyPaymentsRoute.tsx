import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { getWeeklyPaymentsApi, type WeeklyPaymentBucket } from "@/services/goddess/weeklyApi";

export function WeeklyPaymentsRoute() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["goddessWeeklyPayments"],
    queryFn: getWeeklyPaymentsApi,
  });

  return (
    <div className="px-4 py-10 sm:px-8 md:py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-pink-primary/80">
            The ledger
          </p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl italic leading-none text-base-text">
            Weekly intake.
          </h1>
          <p className="mt-3 text-sm text-base-text-muted max-w-md">
            Last 8 weeks of validated tributes — current week first.
          </p>
        </header>

        <Separator />

        {isLoading && <ListSkeleton rows={8} />}

        {isError && (
          <ErrorState
            title="Failed to load weekly payments"
            message={(error as Error | undefined)?.message ?? "Try refreshing the page."}
          />
        )}

        {!isLoading && !isError && data && <WeeklyChart buckets={data} />}
      </div>
    </div>
  );
}

interface WeeklyChartProps {
  buckets: WeeklyPaymentBucket[];
}

function WeeklyChart({ buckets }: WeeklyChartProps) {
  const totalOverall = buckets.reduce((sum, b) => sum + Number(b.total), 0);

  if (totalOverall === 0 && buckets.every((b) => b.count === 0)) {
    return (
      <EmptyState
        title="Nothing yet"
        message="Validated payments will appear here grouped by week."
      />
    );
  }

  const max = Math.max(...buckets.map((b) => Number(b.total)), 1);

  return (
    <div className="flex flex-col gap-3">
      {buckets.map((bucket) => (
        <WeekRow key={bucket.week_start} bucket={bucket} max={max} />
      ))}
      <Separator />
      <div className="flex justify-between text-sm">
        <span className="text-base-text-muted">8-week total</span>
        <span className="font-semibold text-base-text">£{totalOverall.toFixed(2)}</span>
      </div>
    </div>
  );
}

interface WeekRowProps {
  bucket: WeeklyPaymentBucket;
  max: number;
}

function WeekRow({ bucket, max }: WeekRowProps) {
  const amount = Number(bucket.total);
  const pct = max > 0 ? (amount / max) * 100 : 0;
  const label = formatWeekLabel(bucket.week_start, bucket.week_end);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-base-text-muted">
        <span>{label}</span>
        <span>
          {bucket.count} {bucket.count === 1 ? "payment" : "payments"} ·{" "}
          <span className="text-base-text font-medium">£{amount.toFixed(2)}</span>
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-base-surface-raised overflow-hidden">
        <BarFill pct={pct} />
      </div>
    </div>
  );
}

interface BarFillProps {
  pct: number;
}

function setBarPct(node: HTMLElement | null, pct: number) {
  node?.style.setProperty("--bar-pct", `${pct}%`);
}

function BarFill({ pct }: BarFillProps) {
  return (
    <div
      ref={(node) => setBarPct(node, pct)}
      className="h-full rounded-full bg-pink-primary transition-all duration-300 w-[var(--bar-pct)]"
      role="presentation"
    />
  );
}

function formatWeekLabel(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
  const startStr = start.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const endStr = end.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${startStr} – ${endStr}`;
}
