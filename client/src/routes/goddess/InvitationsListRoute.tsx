import { useQuery } from "@tanstack/react-query";
import { listInvitationsApi } from "@/services/invitations/invitationsApi";
import type { components } from "@/types/api.generated";

type InvitationOut = components["schemas"]["InvitationOut"];

function invitationStatus(inv: InvitationOut): "used" | "expired" | "pending" {
  if (inv.used_at) return "used";
  if (new Date(inv.expires_at) < new Date()) return "expired";
  return "pending";
}

const STATUS_CLASSES: Record<string, string> = {
  used: "bg-base-surface-raised text-base-text-muted",
  expired: "bg-debt-muted text-status-danger",
  pending: "bg-pink-muted text-pink-primary",
};

function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_CLASSES[status] ?? ""}`}
    >
      {status}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function InvitationsListRoute() {
  const {
    data: invitations,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["invitations", "goddess"],
    queryFn: listInvitationsApi,
  });

  return (
    <div className="min-h-screen bg-base-bg p-4 md:p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-pink-primary tracking-wider">
            Debt Collector
          </h1>
        </div>

        <div className="bg-base-surface border border-base-border rounded-lg p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-xl font-semibold text-base-text mb-4">Invitations</h2>

          {isLoading && <p className="text-base-text-muted text-sm">Loading…</p>}
          {isError && <p className="text-status-danger text-sm">Failed to load invitations.</p>}

          {invitations && invitations.length === 0 && (
            <p className="text-base-text-muted text-sm">No invitations yet.</p>
          )}

          {invitations && invitations.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-base-border text-base-text-muted text-left">
                    <th className="pb-2 pr-4 font-medium">Created</th>
                    <th className="pb-2 pr-4 font-medium">Amount</th>
                    <th className="pb-2 pr-4 font-medium">Expires</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => {
                    const status = invitationStatus(inv);
                    return (
                      <tr key={inv.id} className="border-b border-base-border last:border-0">
                        <td className="py-3 pr-4 text-base-text-muted">
                          {formatDate(inv.created_at)}
                        </td>
                        <td className="py-3 pr-4 text-base-text font-semibold">
                          £{Number(inv.entry_tribute_amount).toFixed(2)}
                        </td>
                        <td className="py-3 pr-4 text-base-text-muted">
                          {formatDate(inv.expires_at)}
                        </td>
                        <td className="py-3 pr-4">
                          <StatusChip status={status} />
                        </td>
                        <td className="py-3 text-base-text-subtle text-xs max-w-[160px] truncate">
                          {inv.note ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
