import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  forgiveEntryApi,
  listBlacklistApi,
  type BlacklistEntryOut,
} from "@/services/blacklist/blacklistApi";
import { listGoddessSubsApi } from "@/services/payments/paymentsApi";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/services/auth/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { formatLondon } from "@/services/format/datetime";
import { formatGBP } from "@/services/format/currency";

function fmtGbp(v: string): string {
  return formatGBP(v);
}

function fmtDate(iso: string): string {
  return formatLondon(iso, "datetime");
}

interface ForgiveModalProps {
  entry: BlacklistEntryOut;
  onClose: () => void;
}

function ForgiveModal({ entry, onClose }: ForgiveModalProps) {
  const qc = useQueryClient();
  const [fee, setFee] = useState("");

  const mutation = useMutation({
    mutationFn: () => forgiveEntryApi(entry.id, { reinstatement_fee_paid: fee }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.blacklist.all() });
      onClose();
    },
  });

  return (
    <Modal title="Forgive sub" onClose={onClose}>
      <p className="text-xs text-text-mute">Balance at breach: {fmtGbp(entry.balance_snapshot)}</p>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text" htmlFor="fee">
          Reinstatement fee paid (GBP)
        </label>
        <input
          id="fee"
          type="number"
          min="0"
          step="0.01"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          className="bg-bg-sunken border border-line rounded px-3 py-2 text-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>
      {mutation.isError && (
        <p className="text-xs text-bad-ink">{(mutation.error as Error).message}</p>
      )}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !fee}
        >
          {mutation.isPending ? "Forgiving…" : "Forgive"}
        </Button>
      </div>
    </Modal>
  );
}

export function BlacklistRoute() {
  const [target, setTarget] = useState<BlacklistEntryOut | null>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const {
    data: entries = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.blacklist.all(),
    queryFn: listBlacklistApi,
  });

  const { data: subs = [] } = useQuery({
    queryKey: queryKeys.goddess.subs(),
    queryFn: listGoddessSubsApi,
  });

  function subLabel(subId: string): { name: string; username: string } | null {
    const sub = subs.find((s) => s.id === subId);
    if (sub) return { name: sub.display_name, username: sub.username };
    return null;
  }

  function renderSubLabel(subId: string) {
    const found = subLabel(subId);
    if (found) {
      return (
        <>
          <span className="font-serif italic text-text">{found.name}</span>{" "}
          <span className="font-mono text-[11px] tracking-[0.08em] text-text-faint">
            @{found.username}
          </span>
        </>
      );
    }
    return <span className="text-text-faint">{isAdmin ? subId : "Unknown sub"}</span>;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <PageHeader
          crumbs={["Home · Moderation · Blacklist"]}
          title={<span className="italic">Blacklist</span>}
          description="Subs who were breached. Their debts remain; their access does not."
        />

        {isLoading && <ListSkeleton rows={3} />}
        {isError && (
          <ErrorState
            title="Failed to load blacklist"
            message={(error as Error | undefined)?.message}
          />
        )}
        {!isLoading && !isError && entries.length === 0 && (
          <EmptyState
            title="Blacklist is empty"
            message="No subs have been breached. They will appear here if you mark one as in breach."
          />
        )}

        <div className="bg-bg-elev border border-line rounded-[10px] overflow-hidden">
          {entries.map((e, idx) => {
            const forgiven = e.forgiven_at !== null && e.forgiven_at !== undefined;
            return (
              <div
                key={e.id}
                className={
                  "p-4 flex flex-col gap-2" +
                  (idx < entries.length - 1 ? " border-b border-line" : "")
                }
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-semibold text-text text-sm flex flex-wrap items-baseline gap-1">
                      {renderSubLabel(e.sub_id)}
                      <span className="text-text-mute font-normal">
                        · {fmtGbp(e.balance_snapshot)}
                      </span>
                      {e.reason && (
                        <span className="text-text-faint font-normal"> · {e.reason}</span>
                      )}
                    </p>
                    <p className="text-xs text-text-mute mt-0.5">
                      Breached {fmtDate(e.breached_at)}
                    </p>
                    {forgiven && e.forgiven_at && (
                      <p className="text-xs text-ok-ink mt-1">
                        Forgiven {fmtDate(e.forgiven_at)}
                        {e.reinstatement_fee_paid !== null &&
                          e.reinstatement_fee_paid !== undefined &&
                          ` · ${fmtGbp(e.reinstatement_fee_paid)}`}
                      </p>
                    )}
                  </div>
                  {!forgiven && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setTarget(e)}>
                      Forgive
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {target && <ForgiveModal entry={target} onClose={() => setTarget(null)} />}
      </div>
    </div>
  );
}
