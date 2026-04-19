import { useQuery } from "@tanstack/react-query";
import { getOwnAftercare, aftercareKey } from "@/services/aftercare/aftercareApi";
import { AftercareEditForm } from "@/components/aftercare/AftercareEditForm";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/page-header";

export function AftercareRoute() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: aftercareKey,
    queryFn: getOwnAftercare,
  });

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <PageHeader
          crumbs={["Home · Profile · Aftercare"]}
          title="Aftercare profile"
          description="Describe what helps you recover after an intense scene. Your Goddess will see this when she marks a session complete."
        />

        {isLoading && <ListSkeleton rows={4} />}

        {isError && (
          <ErrorState
            title="Failed to load aftercare profile"
            message={(error as Error | undefined)?.message ?? "Try refreshing the page."}
          />
        )}

        {data && (
          <div className="bg-bg-elev border border-line rounded-[10px] p-[18px]">
            <AftercareEditForm initial={data} />
          </div>
        )}
      </div>
    </div>
  );
}
