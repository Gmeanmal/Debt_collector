import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { approveToy, rejectToy, goddessSubToysKey } from "@/services/toys/toysApi";
import type { ToyItem, ToyCategory } from "@/services/toys/toysApi";

const CATEGORY_LABELS: Record<ToyCategory, string> = {
  restraint: "Restraint",
  impact: "Impact",
  vibrator: "Vibrator",
  plug: "Plug",
  cage: "Cage",
  gag: "Gag",
  clothing: "Clothing",
  collar: "Collar",
  other: "Other",
};

const CATEGORY_BADGE_VARIANT: Record<
  ToyCategory,
  "default" | "primary" | "warning" | "danger" | "info" | "gold"
> = {
  restraint: "danger",
  impact: "warning",
  vibrator: "primary",
  plug: "info",
  cage: "danger",
  gag: "warning",
  clothing: "default",
  collar: "gold",
  other: "default",
};

interface Props {
  toy: ToyItem;
  goddessContext?: boolean;
  subId?: string;
  onEdit?: (toy: ToyItem) => void;
  onDelete?: (toyId: string) => void;
}

export function ToyCard({ toy, goddessContext = false, subId, onEdit, onDelete }: Props) {
  const qc = useQueryClient();

  const approveKey = subId ? goddessSubToysKey(subId) : undefined;

  const approveMutation = useMutation({
    mutationFn: () => approveToy(toy.id),
    onSuccess: () => {
      if (approveKey) {
        qc.invalidateQueries({ queryKey: approveKey });
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectToy(toy.id),
    onSuccess: () => {
      if (approveKey) {
        qc.invalidateQueries({ queryKey: approveKey });
      }
    },
  });

  const showApproveReject = goddessContext && !toy.approved;

  return (
    <article
      className={cn(
        "bg-base-surface border rounded-lg p-4 flex flex-col gap-3",
        toy.approved ? "border-base-border" : "border-status-warning/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-sm font-semibold text-base-text truncate">{toy.name}</span>
          {!toy.approved && (
            <span className="text-xs text-status-warning font-medium">Pending approval</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          <Badge variant={CATEGORY_BADGE_VARIANT[toy.category]}>
            {CATEGORY_LABELS[toy.category]}
          </Badge>
          {toy.proposed_by === "sub" && (
            <Badge variant="info">Sub proposed</Badge>
          )}
        </div>
      </div>

      {/* Photo placeholder — presigned URL not yet surfaced from backend (B4 photo controller) */}
      {/* TODO: surface presigned url from backend (B4 photo controller) */}
      {toy.photo_r2_key && (
        <div
          className="w-full h-24 rounded-md bg-base-surface-raised border border-base-border flex items-center justify-center"
          aria-label="Toy photo placeholder"
        >
          <span className="text-xs text-base-text-muted">Photo stored</span>
        </div>
      )}

      {toy.description && (
        <p className="text-xs text-base-text-muted leading-relaxed line-clamp-3">
          {toy.description}
        </p>
      )}

      {goddessContext && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-base-border mt-auto">
          {showApproveReject && (
            <>
              <button
                type="button"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                aria-label={`Approve toy: ${toy.name}`}
                className="px-3 py-1 text-xs font-semibold rounded-md bg-status-success/10 text-status-success border border-status-success/30 hover:bg-status-success/20 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-status-success"
              >
                {approveMutation.isPending ? "Approving…" : "Approve"}
              </button>
              <button
                type="button"
                onClick={() => rejectMutation.mutate()}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                aria-label={`Reject toy: ${toy.name}`}
                className="px-3 py-1 text-xs font-semibold rounded-md bg-status-danger/10 text-status-danger border border-status-danger/30 hover:bg-status-danger/20 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-status-danger"
              >
                {rejectMutation.isPending ? "Rejecting…" : "Reject"}
              </button>
            </>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(toy)}
              aria-label={`Edit toy: ${toy.name}`}
              className="px-3 py-1 text-xs font-semibold rounded-md border border-base-border text-base-text-muted hover:text-base-text hover:bg-base-surface-raised transition-colors focus-visible:ring-2 focus-visible:ring-pink-ring ml-auto"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(toy.id)}
              aria-label={`Delete toy: ${toy.name}`}
              className="px-3 py-1 text-xs font-semibold rounded-md border border-debt-ring text-status-danger bg-debt-muted hover:bg-debt-muted/80 transition-colors focus-visible:ring-2 focus-visible:ring-status-danger"
            >
              Delete
            </button>
          )}

          {approveMutation.isError && (
            <p className="text-xs text-status-danger w-full">Failed to approve. Try again.</p>
          )}
          {rejectMutation.isError && (
            <p className="text-xs text-status-danger w-full">Failed to reject. Try again.</p>
          )}
        </div>
      )}
    </article>
  );
}
