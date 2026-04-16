import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RewardTierForm } from "@/components/merits/RewardTierForm";
import {
  updateGoddessReward,
  deleteGoddessReward,
  type RewardTier,
  type RewardTierIn,
  goddessRewardsKey,
} from "@/services/merits/meritsApi";

interface Props {
  tiers: RewardTier[];
  mode: "goddess" | "sub";
  onRedeem?: (tierId: string) => void;
  isRedeemPending?: boolean;
}

interface EditState {
  tierId: string;
  error: string | null;
}

export function RewardTierList({ tiers, mode, onRedeem, isRedeemPending }: Props) {
  const qc = useQueryClient();
  const [editState, setEditState] = useState<EditState | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RewardTierIn }) =>
      updateGoddessReward(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...goddessRewardsKey] });
      setEditState(null);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Failed to update";
      setEditState((s) => (s ? { ...s, error: msg } : null));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGoddessReward(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...goddessRewardsKey] });
    },
  });

  if (tiers.length === 0) {
    return <EmptyState title="No reward tiers yet" message="Create one to let subs redeem points." />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {tiers.map((tier) => {
        const isEditing = editState?.tierId === tier.id;

        return (
          <li
            key={tier.id}
            className="bg-base-surface border border-base-border rounded-lg p-4 flex flex-col gap-3"
          >
            {isEditing && mode === "goddess" ? (
              <RewardTierForm
                initial={tier}
                onSubmit={(values) =>
                  updateMutation.mutate({ id: tier.id, payload: values })
                }
                onCancel={() => setEditState(null)}
                isPending={updateMutation.isPending}
                error={editState.error}
              />
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-sm font-semibold text-base-text">{tier.name}</span>
                    {tier.description && (
                      <span className="text-xs text-base-text-muted">{tier.description}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={tier.active ? "success" : "default"}>
                      {tier.active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="primary">{tier.cost} pts</Badge>
                  </div>
                </div>

                {mode === "goddess" && (
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditState({ tierId: tier.id, error: null })}
                      aria-label={`Edit ${tier.name}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(tier.id)}
                      aria-label={`Delete ${tier.name}`}
                    >
                      Delete
                    </Button>
                  </div>
                )}

                {mode === "sub" && tier.active && onRedeem && (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={isRedeemPending}
                      onClick={() => onRedeem(tier.id)}
                      aria-label={`Redeem ${tier.name} for ${tier.cost} points`}
                    >
                      Redeem
                    </Button>
                  </div>
                )}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
