import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  bulkApplyLatePenaltyApi,
  type BulkApplyLatePenaltySummary,
} from "@/services/goddess/lateContractsApi";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";

interface Props {
  selected: string[];
  onApplied: (summary: BulkApplyLatePenaltySummary) => void;
}

function summarise(s: BulkApplyLatePenaltySummary): string {
  const parts: string[] = [];
  parts.push(`${s.applied} applied`);
  if (s.already_penalised > 0) parts.push(`${s.already_penalised} already penalised`);
  if (s.not_late > 0) parts.push(`${s.not_late} not late`);
  if (s.not_found > 0) parts.push(`${s.not_found} missing`);
  return parts.join(" · ");
}

export function LatePenaltyBulkBar({ selected, onApplied }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => bulkApplyLatePenaltyApi(selected),
    onSuccess: (summary) => {
      toast.success(summarise(summary));
      onApplied(summary);
      void queryClient.invalidateQueries({ queryKey: queryKeys.goddess.lateContracts() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.goddess.dashboardSummary() });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (selected.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Bulk late-penalty actions"
      className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 flex items-center gap-3 rounded-full border border-line bg-bg-elev px-5 py-3 shadow-lg"
    >
      <span className="text-sm text-text tabular-nums">
        {selected.length} contract{selected.length === 1 ? "" : "s"} selected
      </span>
      <Button
        variant="primary"
        size="sm"
        aria-label="Apply standard late penalty to selected contracts"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending
          ? "Applying…"
          : `Apply standard penalty (${selected.length})`}
      </Button>
    </div>
  );
}
