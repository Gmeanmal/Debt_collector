import { PendingAdjustmentsPanel } from "@/components/contracts/PendingAdjustmentsPanel";

export function PendingAdjustmentsRoute() {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Pending approvals
          </h1>
          <p className="text-sm text-base-text-muted mt-1">
            Mid-contract adjustments proposed by your goddess that need your response.
          </p>
        </div>
        <PendingAdjustmentsPanel />
      </div>
    </div>
  );
}
