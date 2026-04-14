import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { breachSubApi } from "@/services/blacklist/blacklistApi";

export function BreachSubRoute() {
  const { subId } = useParams<{ subId: string }>();
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const safeId = subId ?? "";

  const mutation = useMutation({
    mutationFn: () => breachSubApi(safeId, { reason: reason || undefined }),
    onSuccess: () => navigate("/goddess/blacklist"),
  });

  if (!safeId)
    return (
      <div className="p-4">
        <p className="text-status-danger text-sm">No sub ID.</p>
      </div>
    );

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Breach sub
          </h1>
          <p className="text-sm text-base-text-muted mt-1">
            Transitions all active contracts to <span className="font-semibold">breached</span>,
            blacklists this sub, and snapshots the outstanding balance.
          </p>
        </div>

        <div className="bg-base-surface border border-base-border rounded-lg p-5 flex flex-col gap-4">
          <p className="text-xs text-base-text-muted font-mono">{safeId}</p>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-text" htmlFor="reason">
              Reason <span className="text-base-text-subtle font-normal">(optional)</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={4}
              className="bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-debt-primary"
            />
          </div>
          {mutation.isError && (
            <p className="text-xs text-status-danger">{(mutation.error as Error).message}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => navigate(-1)}
              className="px-3 py-1.5 text-sm text-base-text-muted border border-base-border rounded hover:text-base-text transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (
                  window.confirm("Breach this sub? This cannot be undone without a reinstatement.")
                )
                  mutation.mutate();
              }}
              disabled={mutation.isPending}
              className="px-3 py-1.5 text-sm bg-debt-primary text-pink-foreground font-semibold rounded hover:bg-debt-primary-hover transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? "Breaching…" : "Breach sub"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
