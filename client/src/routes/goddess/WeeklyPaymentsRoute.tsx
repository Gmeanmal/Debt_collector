import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { WeekRowButton } from "@/components/goddess/WeekRowButton";
import { WeeklyDetailPanel } from "@/components/goddess/WeeklyDetailPanel";
import { getWeeklyPaymentsApi, type WeeklyPaymentBucket } from "@/services/goddess/weeklyApi";
import { queryKeys } from "@/lib/queryKeys";

export function WeeklyPaymentsRoute() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.goddess.weeklyPayments(),
    queryFn: getWeeklyPaymentsApi,
  });

  const [openWeek, setOpenWeek] = useState<WeeklyPaymentBucket | null>(null);

  const handleOpen = useCallback(
    (weekStart: string) => {
      const bucket = data?.find((b) => b.week_start === weekStart);
      if (bucket) setOpenWeek(bucket);
    },
    [data],
  );

  const handleClose = useCallback(() => setOpenWeek(null), []);

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
            Last 8 weeks of validated tributes — current week first. Click a row to drill in.
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

        {!isLoading && !isError && data && <WeeklyChart buckets={data} onOpen={handleOpen} />}
      </div>

      {openWeek && (
        <WeeklyDetailPanel
          weekStart={openWeek.week_start}
          bucketTotal={openWeek.total}
          bucketCount={openWeek.count}
          onClose={handleClose}
        />
      )}
    </div>
  );
}

interface WeeklyChartProps {
  buckets: WeeklyPaymentBucket[];
  onOpen: (weekStart: string) => void;
}

function WeeklyChart({ buckets, onOpen }: WeeklyChartProps) {
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
        <WeekRowButton key={bucket.week_start} bucket={bucket} max={max} onOpen={onOpen} />
      ))}
      <Separator />
      <div className="flex justify-between text-sm">
        <span className="text-base-text-muted">8-week total</span>
        <span className="font-semibold text-base-text">£{totalOverall.toFixed(2)}</span>
      </div>
    </div>
  );
}
