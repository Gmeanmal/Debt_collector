import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  forgiveEntryApi,
  listBlacklistApi,
  type BlacklistEntryOut,
} from "@/services/blacklist/blacklistApi";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/services/auth/useAuth";
import { queryKeys } from "@/lib/queryKeys";

function fmtGbp(v: string): string {
  return `£${parseFloat(v).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London" });
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
      <p className="text-xs text-base-text-muted">
        Balance at breach: {fmtGbp(entry.balance_snapshot)}
      </p>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-base-text" htmlFor="fee">
          Reinstatement fee paid (GBP)
        </label>
        <input
          id="fee"
          type="number"
          min="0"
          step="0.01"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          className="bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
        />
      </div>
      {mutation.isError && (
        <p className="text-xs text-status-danger">{(mutation.error as Error).message}</p>
      )}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-sm text-base-text-muted border border-base-border rounded hover:text-base-text transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !fee}
          className="px-3 py-1.5 text-sm bg-pink-primary text-pink-foreground font-semibold rounded hover:bg-pink-primary-hover transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? "Forgiving…" : "Forgive"}
        </button>
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

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Blacklist
          </h1>
          <p className="text-sm text-base-text-muted mt-1">
            Subs you have marked as breached, and their reinstatement status.
          </p>
        </div>

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

        <div className="flex flex-col gap-3">
          {entries.map((e) => {
            const forgiven = e.forgiven_at !== null && e.forgiven_at !== undefined;
            return (
              <div
                key={e.id}
                className="bg-base-surface border border-base-border rounded-lg p-4 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-semibold text-base-text text-sm font-mono">
                      {isAdmin ? e.sub_id : `${e.sub_id.slice(0, 6)}…`}
                    </p>
                    <p className="text-xs text-base-text-muted mt-0.5">
                      Breached {fmtDate(e.breached_at)} · balance {fmtGbp(e.balance_snapshot)}
                    </p>
                    {e.reason && (
                      <p className="text-xs text-base-text-subtle italic mt-1">{e.reason}</p>
                    )}
                    {forgiven && e.forgiven_at && (
                      <p className="text-xs text-status-success mt-1">
                        Forgiven {fmtDate(e.forgiven_at)}
                        {e.reinstatement_fee_paid !== null &&
                          e.reinstatement_fee_paid !== undefined &&
                          ` · ${fmtGbp(e.reinstatement_fee_paid)}`}
                      </p>
                    )}
                  </div>
                  {!forgiven && (
                    <button
                      type="button"
                      onClick={() => setTarget(e)}
                      className="px-3 py-1 text-xs bg-status-success/20 text-status-success border border-status-success/30 rounded font-semibold hover:bg-status-success/30 transition-colors focus-visible:ring-2 focus-visible:ring-status-success"
                    >
                      Forgive
                    </button>
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
