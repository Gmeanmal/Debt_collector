import { PageHeader } from "@/components/ui/page-header";
import { PendingAdjustmentsPanel } from "@/components/contracts/PendingAdjustmentsPanel";

export function PendingAdjustmentsRoute() {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <PageHeader
          crumbs={["Home · Contracts · Pending adjustments"]}
          title="Pending approvals"
          description="Mid-contract adjustments proposed by your goddess that need your response."
        />
        <PendingAdjustmentsPanel />
      </div>
    </div>
  );
}
