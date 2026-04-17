import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { listInvitationsApi } from "@/services/invitations/invitationsApi";
import type { components } from "@/types/api.generated";
import { queryKeys } from "@/lib/queryKeys";
import { InvitationStatusChip } from "@/components/invitations/InvitationStatusChip";
import { InvitationPreviewModal } from "@/components/invitations/InvitationPreviewModal";
import { InvitationResendModal } from "@/components/invitations/InvitationResendModal";

type InvitationOut = components["schemas"]["InvitationOut"];

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(iso))
    .replace(",", " ·");
}

function copyToken(token: string) {
  navigator.clipboard
    .writeText(token)
    .then(() => toast.success("Token copied"))
    .catch(() => toast.error("Copy failed"));
}

interface ActionsProps {
  inv: InvitationOut;
  onPreview: (id: string) => void;
  onResend: (id: string) => void;
}

function InvitationActionsCell({ inv, onPreview, onResend }: ActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onPreview(inv.id)}
        className="text-xs text-base-text-muted hover:text-base-text focus-visible:ring-2 focus-visible:ring-pink-primary rounded px-1.5 py-0.5 border border-base-border hover:border-pink-primary transition-colors"
        aria-label="Preview invitation email"
      >
        Preview
      </button>
      {inv.status === "active" && (
        <button
          type="button"
          onClick={() => onResend(inv.id)}
          className="text-xs text-base-text-muted hover:text-base-text focus-visible:ring-2 focus-visible:ring-pink-primary rounded px-1.5 py-0.5 border border-base-border hover:border-pink-primary transition-colors"
          aria-label="Resend invitation email"
        >
          Resend
        </button>
      )}
    </div>
  );
}

interface TokenCellProps {
  token: string;
}

function TokenCell({ token }: TokenCellProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-xs text-base-text-muted">
        {token.slice(0, 8)}&hellip;
      </span>
      <button
        type="button"
        onClick={() => copyToken(token)}
        aria-label="Copy invite token"
        className="text-base-text-subtle hover:text-base-text focus-visible:ring-2 focus-visible:ring-pink-primary rounded"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      </button>
    </div>
  );
}

export function InvitationsListRoute() {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [resendId, setResendId] = useState<string | null>(null);

  const {
    data: invitations,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.invitations.goddess(),
    queryFn: listInvitationsApi,
  });

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div className="bg-base-surface border border-base-border rounded-lg p-6 shadow-[var(--shadow-card)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold text-base-text">Invitations</h2>
            <Link
              to="/goddess/invite"
              className="inline-flex items-center justify-center px-3 py-1.5 text-sm bg-pink-primary text-pink-foreground font-semibold rounded-md hover:bg-pink-primary-hover transition-colors focus-visible:ring-2 focus-visible:ring-pink-primary w-full sm:w-auto"
            >
              + New invitation
            </Link>
          </div>

          {isLoading && <p className="text-base-text-muted text-sm">Loading…</p>}
          {isError && <p className="text-status-danger text-sm">Failed to load invitations.</p>}

          {invitations && invitations.length === 0 && (
            <p className="text-base-text-muted text-sm">No invitations yet.</p>
          )}

          {invitations && invitations.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-base-border text-base-text-muted text-left">
                    <th className="pb-2 pr-4 font-medium">Created</th>
                    <th className="pb-2 pr-4 font-medium">Token</th>
                    <th className="pb-2 pr-4 font-medium">Amount</th>
                    <th className="pb-2 pr-4 font-medium">Expires</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Note</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="border-b border-base-border last:border-0">
                      <td className="py-3 pr-4 text-base-text-muted whitespace-nowrap">
                        {formatDateTime(inv.created_at)}
                      </td>
                      <td className="py-3 pr-4">
                        <TokenCell token={inv.token} />
                      </td>
                      <td className="py-3 pr-4 text-base-text font-semibold">
                        £{Number(inv.entry_tribute_amount).toFixed(2)}
                      </td>
                      <td className="py-3 pr-4 text-base-text-muted whitespace-nowrap">
                        {formatDateTime(inv.expires_at)}
                      </td>
                      <td className="py-3 pr-4">
                        <InvitationStatusChip status={inv.status} />
                      </td>
                      <td className="py-3 pr-4 text-base-text-subtle text-xs max-w-[120px] truncate">
                        {inv.note ?? "—"}
                      </td>
                      <td className="py-3">
                        <InvitationActionsCell
                          inv={inv}
                          onPreview={setPreviewId}
                          onResend={setResendId}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {previewId && (
        <InvitationPreviewModal
          invitationId={previewId}
          onClose={() => setPreviewId(null)}
        />
      )}
      {resendId && (
        <InvitationResendModal
          invitationId={resendId}
          onClose={() => setResendId(null)}
        />
      )}
    </div>
  );
}
