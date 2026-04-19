import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { SectionTitle } from "@/components/ui/section-title";
import { Divider } from "@/components/ui/divider";
import { Button } from "@/components/ui/button";
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
    <div className="px-6 py-8 md:px-8 md:py-10">
      <div className="mx-auto flex max-w-6xl flex-col">
        <PageHeader
          crumbs={["Home · Money"]}
          title="Late"
          description="The reckoning."
          actions={
            <Button variant="soft" size="sm" type="button">
              Send reminder to all
            </Button>
          }
        />

        <SectionTitle eyebrow="Rolling" title="Late rolling tributes" />

        {rollingLoading && <ListSkeleton rows={5} />}

        {rollingError && (
          <ErrorState
            title="Failed to load late rolling subs"
            message={(rollingErr as Error | undefined)?.message ?? "Try refreshing the page."}
          />
        )}

        {!rollingLoading && !rollingError && <LateRollingSection items={rollingItems} />}

        <Divider />

        <SectionTitle eyebrow="Contracts" title="Overdue contracts" />

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
