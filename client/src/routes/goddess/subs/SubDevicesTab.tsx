import { useQuery } from "@tanstack/react-query";
import { InventoryGrid } from "@/components/toys/InventoryGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { listGoddessSubToys, goddessSubToysKey } from "@/services/toys/toysApi";

interface Props {
  subId: string;
}

// The toy model uses "cage" as the category for chastity / physical restraint devices.
// No separate backend resource exists for devices — we subset from the toys list.
const DEVICE_CATEGORY = "cage";

export function SubDevicesTab({ subId }: Props) {
  const toysKey = goddessSubToysKey(subId);

  const { data: allToys = [], isLoading, isError, error } = useQuery({
    queryKey: toysKey,
    queryFn: () => listGoddessSubToys(subId),
    enabled: Boolean(subId),
  });

  if (isLoading) {
    return <ListSkeleton rows={2} />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load devices"
        message={(error as Error | undefined)?.message}
      />
    );
  }

  const devices = allToys.filter((t) => t.category === DEVICE_CATEGORY);

  if (devices.length === 0) {
    return (
      <EmptyState
        title="No devices"
        message="No cage-category toys are registered for this sub."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <InventoryGrid
        toys={devices}
        goddessContext
        subId={subId}
      />
    </div>
  );
}
