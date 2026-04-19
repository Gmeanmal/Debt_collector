import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicInvitationApi } from "@/services/invitations/invitationsApi";
import { queryKeys } from "@/lib/queryKeys";
import { formatLondon } from "@/services/format/datetime";
import { formatGBP } from "@/services/format/currency";
import { BrandLockup } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";

function errorMessage(err: unknown): string {
  const e = err as { status?: number; detail?: string } | null;
  if (!e) return "This invitation link is invalid or no longer exists.";
  if (e.status === 404) return "This invitation link is invalid or no longer exists.";
  if (e.status === 409) {
    const detail = (e.detail ?? "").toLowerCase();
    if (detail.includes("expired")) return "This invitation has expired.";
    if (detail.includes("used")) return "This invitation has already been used.";
  }
  return "This invitation link is invalid or no longer exists.";
}

export function InviteLandingRoute() {
  const { token } = useParams<{ token: string }>();

  const {
    data: invitation,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.invitations.public(token ?? ""),
    queryFn: () => getPublicInvitationApi(token!),
    enabled: !!token,
    retry: false,
  });

  const isInvalid = error != null || (invitation && new Date(invitation.expires_at) < new Date());

  return (
    <div className="min-h-screen bg-bg text-text flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[560px] flex flex-col items-center gap-10">
        <BrandLockup />

        <div className="w-full bg-bg-elev border border-line rounded-[10px] shadow-md p-8 sm:p-10 flex flex-col gap-7">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep">
                Invitation received
              </p>
              <h1 className="font-serif italic text-[28px] leading-tight text-text">
                Opening your invitation…
              </h1>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint">
                Verifying token
              </p>
            </div>
          )}

          {isInvalid && (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-bad-ink">
                Invitation declined
              </p>
              <h1 className="font-serif italic text-[30px] leading-tight text-text">
                This key no longer fits.
              </h1>
              <p className="max-w-sm text-[14.5px] leading-relaxed text-text-mute">
                {errorMessage(error)}
              </p>
            </div>
          )}

          {invitation && !isInvalid && (
            <>
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep">
                  Invitation received
                </p>
                <h1 className="font-serif italic text-[32px] leading-[1.05] tracking-[-0.01em] text-text">
                  Enter the ledger.
                </h1>
                <p className="max-w-sm text-[14.5px] leading-relaxed text-text-mute">
                  You have been summoned. Review the terms and claim your place below.
                </p>
              </div>

              <div className="flex flex-col border-t border-line">
                <div className="flex items-baseline justify-between border-b border-line py-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint">
                    Invitation from
                  </span>
                  <span className="font-serif italic text-[20px] text-accent-deep">
                    {invitation.goddess_display_name}
                  </span>
                </div>

                <div className="flex items-baseline justify-between border-b border-line py-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint">
                    Entry tribute
                  </span>
                  <span className="font-mono text-[14px] font-semibold text-text" role="status">
                    {formatGBP(invitation.entry_tribute_amount)}
                  </span>
                </div>

                {invitation.note && (
                  <div className="flex flex-col gap-1.5 border-b border-line py-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint">
                      Note
                    </span>
                    <p className="text-sm leading-relaxed text-text">{invitation.note}</p>
                  </div>
                )}

                <div className="flex items-baseline justify-between py-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint">
                    Expires
                  </span>
                  <span className="font-mono text-[12.5px] text-text">
                    {formatLondon(invitation.expires_at, "date")}
                  </span>
                </div>
              </div>

              <Button asChild size="lg" className="w-full">
                <Link to={`/invite/${token}/signup`}>Accept invitation</Link>
              </Button>
            </>
          )}
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint">
          Mean Mal · The Ledger · Private quarters
        </p>
      </div>
    </div>
  );
}
