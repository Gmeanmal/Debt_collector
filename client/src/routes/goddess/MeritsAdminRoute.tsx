import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RewardTierList } from "@/components/merits/RewardTierList";
import { PunishmentTierList } from "@/components/merits/PunishmentTierList";
import { RewardTierForm } from "@/components/merits/RewardTierForm";
import { PunishmentTierForm } from "@/components/merits/PunishmentTierForm";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/ErrorState";
import { listGoddessSubsApi } from "@/services/payments/paymentsApi";
import {
  listGoddessRewards,
  listGoddessPunishments,
  createGoddessReward,
  createGoddessPunishment,
  goddessRewardsKey,
  goddessPunishmentsKey,
  type RewardTierIn,
  type PunishmentTierIn,
} from "@/services/merits/meritsApi";
import { queryKeys } from "@/lib/queryKeys";

export function MeritsAdminRoute() {
  const qc = useQueryClient();
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [showPunishmentForm, setShowPunishmentForm] = useState(false);
  const [rewardCreateError, setRewardCreateError] = useState<string | null>(null);
  const [punishmentCreateError, setPunishmentCreateError] = useState<string | null>(null);

  const {
    data: rewards = [],
    isLoading: rewardsLoading,
    isError: rewardsError,
    error: rewardsErrorObj,
  } = useQuery({
    queryKey: [...goddessRewardsKey],
    queryFn: listGoddessRewards,
  });

  const {
    data: punishments = [],
    isLoading: punishmentsLoading,
    isError: punishmentsError,
    error: punishmentsErrorObj,
  } = useQuery({
    queryKey: [...goddessPunishmentsKey],
    queryFn: listGoddessPunishments,
  });

  const { data: subs = [] } = useQuery({
    queryKey: queryKeys.goddess.subs(),
    queryFn: listGoddessSubsApi,
  });

  const createRewardMutation = useMutation({
    mutationFn: (payload: RewardTierIn) => createGoddessReward(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...goddessRewardsKey] });
      setShowRewardForm(false);
      setRewardCreateError(null);
    },
    onError: (err) => {
      setRewardCreateError(err instanceof Error ? err.message : "Failed to create reward tier");
    },
  });

  const createPunishmentMutation = useMutation({
    mutationFn: (payload: PunishmentTierIn) => createGoddessPunishment(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...goddessPunishmentsKey] });
      setShowPunishmentForm(false);
      setPunishmentCreateError(null);
    },
    onError: (err) => {
      setPunishmentCreateError(
        err instanceof Error ? err.message : "Failed to create punishment tier",
      );
    },
  });

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Rewards &amp; Punishments
          </h1>
          <p className="text-sm text-base-text-muted mt-1">
            Manage merit tiers your subs can redeem or receive.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Rewards column */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-base-text">Reward tiers</h2>
              {!showRewardForm && (
                <Button size="sm" onClick={() => setShowRewardForm(true)}>
                  + New reward
                </Button>
              )}
            </div>

            {showRewardForm && (
              <div className="bg-base-surface border border-base-border rounded-lg p-4">
                <RewardTierForm
                  onSubmit={(values) => createRewardMutation.mutate(values)}
                  onCancel={() => {
                    setShowRewardForm(false);
                    setRewardCreateError(null);
                  }}
                  isPending={createRewardMutation.isPending}
                  error={rewardCreateError}
                />
              </div>
            )}

            {rewardsLoading && (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-base-surface border border-base-border rounded-lg h-20 animate-pulse"
                  />
                ))}
              </div>
            )}

            {rewardsError && (
              <ErrorState
                title="Failed to load rewards"
                message={(rewardsErrorObj as Error | undefined)?.message}
              />
            )}

            {!rewardsLoading && !rewardsError && <RewardTierList tiers={rewards} mode="goddess" />}
          </section>

          {/* Punishments column */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-base-text">Punishment tiers</h2>
              {!showPunishmentForm && (
                <Button size="sm" onClick={() => setShowPunishmentForm(true)}>
                  + New punishment
                </Button>
              )}
            </div>

            {showPunishmentForm && (
              <div className="bg-base-surface border border-base-border rounded-lg p-4">
                <PunishmentTierForm
                  onSubmit={(values) => createPunishmentMutation.mutate(values)}
                  onCancel={() => {
                    setShowPunishmentForm(false);
                    setPunishmentCreateError(null);
                  }}
                  isPending={createPunishmentMutation.isPending}
                  error={punishmentCreateError}
                />
              </div>
            )}

            {punishmentsLoading && (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-base-surface border border-base-border rounded-lg h-20 animate-pulse"
                  />
                ))}
              </div>
            )}

            {punishmentsError && (
              <ErrorState
                title="Failed to load punishments"
                message={(punishmentsErrorObj as Error | undefined)?.message}
              />
            )}

            {!punishmentsLoading && !punishmentsError && (
              <PunishmentTierList tiers={punishments} subs={subs} />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
