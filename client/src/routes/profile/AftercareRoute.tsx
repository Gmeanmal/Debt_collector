import { useQuery } from "@tanstack/react-query";
import { getOwnAftercare, aftercareKey } from "@/services/aftercare/aftercareApi";
import { AftercareEditForm } from "@/components/aftercare/AftercareEditForm";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

export function AftercareRoute() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: aftercareKey,
    queryFn: getOwnAftercare,
  });

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Aftercare profile
          </h1>
          <p className="text-sm text-base-text-muted mt-1">
            Describe what helps you recover after an intense scene. Your Goddess will see this when
            she marks a session complete.
          </p>
        </div>

        {isLoading && <ListSkeleton rows={4} />}

        {isError && (
          <ErrorState
            title="Failed to load aftercare profile"
            message={(error as Error | undefined)?.message ?? "Try refreshing the page."}
          />
        )}

        {data && <AftercareEditForm initial={data} />}
      </div>
    </div>
  );
}
