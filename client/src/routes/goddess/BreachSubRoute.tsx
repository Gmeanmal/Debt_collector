import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
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
        <p className="text-bad-ink text-sm">No username in route.</p>
      </div>
    );

  if (isLoading)
    return (
      <div className="p-4">
        <p className="text-text-faint text-sm">Loading…</p>
      </div>
    );

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        <PageHeader
          crumbs={["Home · Moderation · Blacklist"]}
          title={<span className="italic">Breach sub</span>}
          description={
            <>
              Transitions all active contracts to{" "}
              <span className="text-bad-ink font-semibold">breached</span>, blacklists this sub, and
              snapshots the outstanding balance.
            </>
          }
        />

        <div className="bg-bg-elev border border-line rounded-[10px] p-[18px] flex flex-col gap-4">
          <p className="text-sm font-serif italic text-text">
            {sub?.display_name ?? safeUsername}
            <span className="font-mono text-[11px] tracking-[0.08em] text-text-faint font-normal ml-2">
              @{safeUsername}
            </span>
          </p>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text" htmlFor="reason">
              Reason <span className="text-text-faint font-normal">(optional)</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={4}
              className="bg-bg-sunken border border-line rounded-[6px] px-3 py-2 text-sm text-text placeholder:text-text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent resize-none"
            />
          </div>
          {mutation.isError && (
            <p className="text-xs text-bad-ink">{(mutation.error as Error).message}</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => setBreachOpen(true)}
              disabled={mutation.isPending || !sub}
              className="w-full sm:w-auto"
            >
              {mutation.isPending ? "Breaching…" : "Breach sub"}
            </Button>
            {breachOpen && (
              <Modal title="Breach sub" onClose={() => setBreachOpen(false)} size="sm">
                <p className="text-sm text-text">
                  Breach this sub? This cannot be undone without a reinstatement.
                </p>
                <div className="flex gap-3 justify-end mt-2">
                  <Button type="button" variant="ghost" onClick={() => setBreachOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={mutation.isPending}
                    onClick={() => {
                      setBreachOpen(false);
                      mutation.mutate();
                    }}
                  >
                    {mutation.isPending ? "Breaching…" : "Confirm breach"}
                  </Button>
                </div>
              </Modal>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
