import { useQuery } from "@tanstack/react-query";
import { InventoryGrid } from "@/components/toys/InventoryGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { listGoddessSubToys, goddessSubToysKey } from "@/services/toys/toysApi";

interface Props {
  subId: string;
}

// "cage" maps to chastity devices and belongs in SubDevicesTab.
// All other categories render here.
const DEVICE_CATEGORY = "cage";

export function SubInventoryTab({ subId }: Props) {
  const toysKey = goddessSubToysKey(subId);

  const {
    data: allToys = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: toysKey,
    queryFn: () => listGoddessSubToys(subId),
    enabled: Boolean(subId),
  });

  if (isLoading) {
    return <ListSkeleton rows={4} />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load inventory"
        message={(error as Error | undefined)?.message}
      />
    );
  }

  const toys = allToys.filter((t) => t.category !== DEVICE_CATEGORY);
  const pendingCount = toys.filter((t) => !t.approved).length;

  if (toys.length === 0 && allToys.length > 0) {
    return (
      <EmptyState
        title="No inventory items"
        message="All toys are chastity devices — see the Devices tab."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {pendingCount > 0 && (
        <p className="text-sm text-warn-ink">
          {pendingCount} pending proposal{pendingCount > 1 ? "s" : ""} awaiting review
        </p>
      )}
      <InventoryGrid toys={toys} goddessContext subId={subId} />
    </div>
  );
}
