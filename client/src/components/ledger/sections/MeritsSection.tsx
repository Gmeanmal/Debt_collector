import { useQuery } from "@tanstack/react-query";
import {
  getOwnPointsBalance,
  listSubRewards,
  subBalanceKey,
  subRewardsKey,
  type RewardTier,
} from "@/services/merits/meritsApi";
import { formatLondon } from "@/services/format/datetime";
import { Badge } from "@/components/ui/badge";
import {
  LedgerSection,
  LedgerEmpty,
  LedgerError,
  LedgerLoading,
} from "@/components/ledger/LedgerSection";

function RewardRow({ reward, affordable }: { reward: RewardTier; affordable: boolean }) {
  return (
    <li className="flex items-start justify-between gap-3 py-2 border-b border-line/40 last:border-b-0">
      <div className="flex flex-col min-w-0">
        <span className="text-sm text-text">{reward.name}</span>
        {reward.description && <span className="text-xs text-text-mute">{reward.description}</span>}
      </div>
      <Badge variant={affordable ? "ok" : "neutral"}>
        {reward.cost} pt{reward.cost === 1 ? "" : "s"}
      </Badge>
    </li>
  );
}

export function MeritsSection() {
  const balanceQuery = useQuery({ queryKey: subBalanceKey, queryFn: getOwnPointsBalance });
  const rewardsQuery = useQuery({ queryKey: subRewardsKey, queryFn: listSubRewards });

  const isLoading = balanceQuery.isLoading || rewardsQuery.isLoading;
  const firstError =
    (balanceQuery.error as Error | undefined) ??
    (rewardsQuery.error as Error | undefined) ??
    undefined;
  const balance = balanceQuery.data?.balance ?? 0;
  const lastEventAt = balanceQuery.data?.last_event_at ?? null;
  const activeRewards = (rewardsQuery.data ?? []).filter((r) => r.active);

  return (
    <LedgerSection title="Merits & rewards" updatedAt={lastEventAt}>
      {isLoading && <LedgerLoading />}
      {!isLoading && firstError && <LedgerError message={firstError.message} />}
      {!isLoading && !firstError && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 bg-bg-sunken border border-line rounded p-3">
            <div>
              <p className="text-xs text-text-mute uppercase tracking-wide">Points balance</p>
              <p className="text-lg font-serif italic text-accent">
                {balance} pt{balance === 1 ? "" : "s"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-mute">
                {balanceQuery.data?.event_count ?? 0} event
                {(balanceQuery.data?.event_count ?? 0) === 1 ? "" : "s"} recorded
              </p>
              {lastEventAt && (
                <p className="text-xs text-text-mute">
                  Last change {formatLondon(lastEventAt, "datetime")}
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs text-text-mute uppercase tracking-wide mb-2">
              Redeemable rewards
            </p>
            {activeRewards.length === 0 ? (
              <LedgerEmpty message="No active rewards offered right now." />
            ) : (
              <ul className="flex flex-col">
                {activeRewards.map((r) => (
                  <RewardRow key={r.id} reward={r} affordable={balance >= r.cost} />
                ))}
              </ul>
            )}
          </div>

          <p className="text-xs text-text-mute italic">
            Individual reward/penalty events are only visible to your goddess. Your balance above
            reflects every change.
          </p>
        </div>
      )}
    </LedgerSection>
  );
}
