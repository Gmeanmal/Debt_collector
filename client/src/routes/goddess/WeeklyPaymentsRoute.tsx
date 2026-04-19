import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/page-header";
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

  const activeWeek = useMemo<WeeklyPaymentBucket | null>(() => {
    if (openWeek) return openWeek;
    if (data && data.length > 0) return data[0] ?? null;
    return null;
  }, [openWeek, data]);

  return (
    <div className="px-6 py-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          crumbs={["Home · Money"]}
          title="Weekly intake"
          description="Last 8 weeks of validated tributes — current week first. Pick a row to drill in."
        />

        {isLoading && <ListSkeleton rows={8} />}

        {isError && (
          <ErrorState
            title="Failed to load weekly payments"
            message={(error as Error | undefined)?.message ?? "Try refreshing the page."}
          />
        )}

        {!isLoading && !isError && data && (
          <WeeklyLayout
            buckets={data}
            activeWeek={activeWeek}
            onOpen={handleOpen}
            onClose={handleClose}
          />
        )}
      </div>
    </div>
  );
}

interface WeeklyLayoutProps {
  buckets: WeeklyPaymentBucket[];
  activeWeek: WeeklyPaymentBucket | null;
  onOpen: (weekStart: string) => void;
  onClose: () => void;
}

function WeeklyLayout({ buckets, activeWeek, onOpen, onClose }: WeeklyLayoutProps) {
  const totalOverall = buckets.reduce((sum, b) => sum + Number(b.total), 0);
  const allEmpty = totalOverall === 0 && buckets.every((b) => b.count === 0);

  if (allEmpty) {
    return (
      <EmptyState
        title="Nothing yet"
        message="Validated payments will appear here grouped by week."
      />
    );
  }

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-6">
      <div className="flex flex-col gap-2">
        {buckets.map((bucket) => (
          <WeekRowButton
            key={bucket.week_start}
            bucket={bucket}
            active={activeWeek?.week_start === bucket.week_start}
            onOpen={onOpen}
          />
        ))}
      </div>
      {activeWeek ? (
        <WeeklyDetailPanel
          weekStart={activeWeek.week_start}
          bucketTotal={activeWeek.total}
          bucketCount={activeWeek.count}
          onClose={onClose}
        />
      ) : (
        <EmptyState
          title="Pick a week"
          message="Select a week on the left to see validated tributes."
        />
      )}
    </div>
  );
}
