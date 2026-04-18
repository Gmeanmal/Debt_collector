import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { LateRollingSection } from "@/components/goddess/LateRollingSection";
import { LateContractsSection } from "@/components/goddess/LateContractsSection";
import { getLateSubsApi, type LateSubItem } from "@/services/goddess/lateSubsApi";
import { getLateContractsApi } from "@/services/goddess/lateContractsApi";
import { listGoddessSubsApi } from "@/services/payments/paymentsApi";
import { queryKeys } from "@/lib/queryKeys";

export function LateRoute() {
  const {
    data: rawRollingData,
    isLoading: rollingLoading,
    isError: rollingError,
    error: rollingErr,
  } = useQuery({
    queryKey: queryKeys.goddess.lateSubs(),
    queryFn: getLateSubsApi,
  });

  const { data: subs = [] } = useQuery({
    queryKey: queryKeys.goddess.subs(),
    queryFn: listGoddessSubsApi,
    staleTime: 60_000,
  });

  const {
    data: contractsData,
    isLoading: contractsLoading,
    isError: contractsError,
    error: contractsErr,
  } = useQuery({
    queryKey: queryKeys.goddess.lateContracts(),
    queryFn: getLateContractsApi,
  });

  const rollingItems: LateSubItem[] =
    rawRollingData?.map((item) => {
      const sub = subs.find((s) => s.id === item.sub_id);
      return sub ? { ...item, sub_username: sub.username } : item;
    }) ?? [];

  return (
    <div className="px-4 py-10 sm:px-8 md:py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-pink-primary/80">
            The ledger
          </p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl italic leading-none text-base-text">
            Late
          </h1>
        </header>

        <Separator />

        {rollingLoading && <ListSkeleton rows={5} />}

        {rollingError && (
          <ErrorState
            title="Failed to load late rolling subs"
            message={(rollingErr as Error | undefined)?.message ?? "Try refreshing the page."}
          />
        )}

        {!rollingLoading && !rollingError && <LateRollingSection items={rollingItems} />}

        <Separator />

        {contractsLoading && <ListSkeleton rows={5} />}

        {contractsError && (
          <ErrorState
            title="Failed to load late contracts"
            message={(contractsErr as Error | undefined)?.message ?? "Try refreshing the page."}
          />
        )}

        {!contractsLoading && !contractsError && contractsData && (
          <LateContractsSection items={contractsData} />
        )}
      </div>
    </div>
  );
}
