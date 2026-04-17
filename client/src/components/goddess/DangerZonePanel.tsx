import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ConfirmActionModal } from "@/components/shared/ConfirmActionModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  breachSubApi,
  breachPreviewApi,
  type BreachPreviewOut,
} from "@/services/blacklist/blacklistApi";
import { queryKeys } from "@/lib/queryKeys";

interface Props {
  subId: string;
  username: string;
}

function fmtGbp(v: string): string {
  return `£${parseFloat(v).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function BreachPreviewContent({ data }: { data: BreachPreviewOut }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex justify-between">
        <span className="text-base-text-muted">Contracts to cascade</span>
        <span className="font-semibold text-status-danger">{data.active_contracts_to_cascade}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-base-text-muted">Rolling balance to freeze</span>
        <span className="font-semibold text-base-text">
          {fmtGbp(data.rolling_balance_to_freeze)}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-base-text-muted">Will blacklist sub</span>
        <span className="font-semibold text-status-danger">
          {data.will_blacklist ? "Yes" : "No"}
        </span>
      </div>
    </div>
  );
}

export function DangerZonePanel({ subId, username }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState("");

  const reasonReady = reason.trim().length >= 5;

  const previewQuery = useQuery({
    queryKey: queryKeys.breachPreview.forSub(username, reason),
    queryFn: () => breachPreviewApi(username, reason),
    // Only fetch when modal is open and goddess has typed a meaningful reason
    enabled: showModal && reasonReady,
    retry: false,
  });

  const breachMutation = useMutation({
    mutationFn: () => breachSubApi(subId, { reason: reason || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.goddess.subs() });
      qc.invalidateQueries({ queryKey: queryKeys.blacklist.all() });
      navigate("/goddess/blacklist");
    },
  });

  function handleClose() {
    setShowModal(false);
    setReason("");
  }

  const previewContent = previewQuery.data ? (
    <BreachPreviewContent data={previewQuery.data} />
  ) : previewQuery.isLoading ? (
    <p className="text-sm text-base-text-muted">Loading breach preview…</p>
  ) : previewQuery.isError ? (
    <p className="text-sm text-base-text-muted italic">
      Preview unavailable — backend not yet deployed.
    </p>
  ) : null;

  return (
    <>
      <section
        className="border-2 border-status-danger/40 rounded-lg p-5 flex flex-col gap-3 bg-debt-muted/20"
        aria-label="Danger zone"
      >
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-semibold text-status-danger uppercase tracking-widest">
            Danger zone
          </h3>
          <p className="text-xs text-base-text-muted">
            Irreversible actions. Read carefully before proceeding.
          </p>
        </div>

        <div className="flex items-start justify-between gap-4 flex-wrap border-t border-status-danger/20 pt-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium text-base-text">Breach sub</p>
            <p className="text-xs text-base-text-muted max-w-xs">
              Marks all active contracts as breached, snapshots the balance, and blacklists{" "}
              <span className="font-semibold">@{username}</span>.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            type="button"
            onClick={() => setShowModal(true)}
            aria-label={`Breach sub @${username}`}
          >
            Breach sub
          </Button>
        </div>
      </section>

      {showModal && (
        <ConfirmActionModal
          kind="typedConfirm"
          title="Breach sub"
          isDestructive
          description={
            <div className="flex flex-col gap-3">
              <p>
                This will breach all active contracts, freeze the rolling balance, and permanently
                blacklist <span className="font-semibold">@{username}</span>. This cannot be undone
                without a reinstatement fee.
              </p>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-base-text" htmlFor="breach-reason">
                  Reason{" "}
                  <span className="text-base-text-subtle font-normal">(min. 5 characters)</span>
                </label>
                <textarea
                  id="breach-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className={cn(
                    "bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm resize-none",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-debt-primary",
                  )}
                  placeholder="e.g. missed three consecutive payments"
                />
              </div>
              {reasonReady && previewContent && (
                <div className="bg-base-surface-raised border border-base-border rounded-md p-3">
                  {previewContent}
                </div>
              )}
            </div>
          }
          expectedString={username}
          confirmPrompt={`Type "${username}" to confirm`}
          confirmLabel="Breach"
          onClose={handleClose}
          onConfirm={() => breachMutation.mutate()}
          isLoading={breachMutation.isPending}
          error={breachMutation.isError ? breachMutation.error.message : null}
        />
      )}
    </>
  );
}
