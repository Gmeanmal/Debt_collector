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
import { formatLondon } from "@/services/format/datetime";
import { formatGBP } from "@/services/format/currency";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

type InvitationOut = components["schemas"]["InvitationOut"];

function formatDateTime(iso: string): string {
  return formatLondon(iso, "datetime");
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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onPreview(inv.id)}
        aria-label="Preview invitation email"
      >
        Preview
      </Button>
      {inv.status === "active" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onResend(inv.id)}
          aria-label="Resend invitation email"
        >
          Resend
        </Button>
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
      <span className="font-mono text-[11px] tracking-[0.08em] text-text-faint">
        {token.slice(0, 8)}&hellip;
      </span>
      <button
        type="button"
        onClick={() => copyToken(token)}
        aria-label="Copy invite token"
        className="text-text-faint hover:text-text focus-visible:ring-2 focus-visible:ring-accent rounded"
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
        <PageHeader
          crumbs={["Home · Gatekeeping · Invitations"]}
          title={<span className="italic">Invitations</span>}
          actions={
            <Button asChild variant="primary" size="sm">
              <Link to="/goddess/invite">+ New invitation</Link>
            </Button>
          }
        />

        <div className="bg-bg-elev border border-line rounded-[10px] p-[18px]">
          {isLoading && <p className="text-text-mute text-sm">Loading…</p>}
          {isError && <p className="text-bad-ink text-sm">Failed to load invitations.</p>}

          {invitations && invitations.length === 0 && (
            <p className="text-text-mute text-sm">No invitations yet.</p>
          )}

          {invitations && invitations.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm bg-bg-elev border-line rounded-[10px]">
                <thead className="bg-bg-sunken">
                  <tr className="border-b border-line text-left">
                    <th className="pb-2 pr-4 pt-2 pl-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">
                      Created
                    </th>
                    <th className="pb-2 pr-4 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">
                      Token
                    </th>
                    <th className="pb-2 pr-4 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">
                      Amount
                    </th>
                    <th className="pb-2 pr-4 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">
                      Expires
                    </th>
                    <th className="pb-2 pr-4 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">
                      Status
                    </th>
                    <th className="pb-2 pr-4 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">
                      Note
                    </th>
                    <th className="pb-2 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {invitations.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-3 pr-4 pl-2 text-text-mute whitespace-nowrap">
                        {formatDateTime(inv.created_at)}
                      </td>
                      <td className="py-3 pr-4">
                        <TokenCell token={inv.token} />
                      </td>
                      <td className="py-3 pr-4 text-text font-semibold">
                        {formatGBP(inv.entry_tribute_amount)}
                      </td>
                      <td className="py-3 pr-4 text-text-mute whitespace-nowrap">
                        {formatDateTime(inv.expires_at)}
                      </td>
                      <td className="py-3 pr-4">
                        <InvitationStatusChip status={inv.status} />
                      </td>
                      <td className="py-3 pr-4 text-text-faint text-xs max-w-[120px] truncate">
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
        <InvitationPreviewModal invitationId={previewId} onClose={() => setPreviewId(null)} />
      )}
      {resendId && (
        <InvitationResendModal invitationId={resendId} onClose={() => setResendId(null)} />
      )}
    </div>
  );
}
