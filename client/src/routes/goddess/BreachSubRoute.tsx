import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Modal } from "@/components/ui/Modal";
import { breachSubApi } from "@/services/blacklist/blacklistApi";
import { getSubByUsernameApi } from "@/services/payments/paymentsApi";
import { queryKeys } from "@/lib/queryKeys";

export function BreachSubRoute() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [breachOpen, setBreachOpen] = useState(false);
  const safeUsername = username ?? "";

  const { data: sub, isLoading } = useQuery({
    queryKey: queryKeys.goddess.subByUsername(safeUsername),
    queryFn: () => getSubByUsernameApi(safeUsername),
    enabled: safeUsername.length > 0,
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!sub?.id) throw new Error("Sub not found");
      return breachSubApi(sub.id, { reason: reason || undefined });
    },
    onSuccess: () => navigate("/goddess/blacklist"),
  });

  if (!safeUsername)
    return (
      <div className="p-4">
        <p className="text-status-danger text-sm">No username in route.</p>
      </div>
    );

  if (isLoading)
    return (
      <div className="p-4">
        <p className="text-base-text-muted text-sm">Loading…</p>
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
          <p className="text-sm font-semibold text-base-text">
            {sub?.display_name ?? safeUsername}
            <span className="text-base-text-muted font-normal ml-1">(@{safeUsername})</span>
          </p>
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
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-3 py-1.5 text-sm text-base-text-muted border border-base-border rounded hover:text-base-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setBreachOpen(true)}
              disabled={mutation.isPending || !sub}
              className="w-full sm:w-auto px-3 py-1.5 text-sm bg-debt-primary text-pink-foreground font-semibold rounded hover:bg-debt-primary-hover transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? "Breaching…" : "Breach sub"}
            </button>
            {breachOpen && (
              <Modal
                title="Breach sub"
                onClose={() => setBreachOpen(false)}
                size="sm"
              >
                <p className="text-sm text-base-text">
                  Breach this sub? This cannot be undone without a reinstatement.
                </p>
                <div className="flex gap-3 justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setBreachOpen(false)}
                    className="px-3 py-1.5 text-sm text-base-text-muted border border-base-border rounded hover:text-base-text transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={mutation.isPending}
                    onClick={() => { setBreachOpen(false); mutation.mutate(); }}
                    className="px-3 py-1.5 text-sm bg-debt-primary text-pink-foreground font-semibold rounded hover:bg-debt-primary-hover transition-colors disabled:opacity-50"
                  >
                    {mutation.isPending ? "Breaching…" : "Confirm breach"}
                  </button>
                </div>
              </Modal>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
