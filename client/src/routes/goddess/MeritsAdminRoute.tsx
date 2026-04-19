import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RewardTierList } from "@/components/merits/RewardTierList";
import { PunishmentTierList } from "@/components/merits/PunishmentTierList";
import { RewardTierForm } from "@/components/merits/RewardTierForm";
import { PunishmentTierForm } from "@/components/merits/PunishmentTierForm";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionTitle } from "@/components/ui/section-title";
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
        <PageHeader
          crumbs={["Home · Rules · Merits"]}
          title={<span className="italic">Rewards &amp; punishments</span>}
          description="Manage merit tiers your subs can redeem or receive."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Rewards column */}
          <section className="flex flex-col gap-4">
            <SectionTitle
              title="Reward tiers"
              actions={
                !showRewardForm ? (
                  <Button variant="primary" size="sm" onClick={() => setShowRewardForm(true)}>
                    + New reward
                  </Button>
                ) : undefined
              }
            />

            {showRewardForm && (
              <div className="bg-bg-elev border border-line rounded-[10px] p-[18px]">
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
                    className="bg-bg-elev border border-line rounded-[10px] h-20 animate-pulse"
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
            <SectionTitle
              title="Punishment tiers"
              actions={
                !showPunishmentForm ? (
                  <Button variant="primary" size="sm" onClick={() => setShowPunishmentForm(true)}>
                    + New punishment
                  </Button>
                ) : undefined
              }
            />

            {showPunishmentForm && (
              <div className="bg-bg-elev border border-line rounded-[10px] p-[18px]">
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
                    className="bg-bg-elev border border-line rounded-[10px] h-20 animate-pulse"
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
