import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicInvitationApi } from "@/services/invitations/invitationsApi";

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
    queryKey: ["invitation", "public", token],
    queryFn: () => getPublicInvitationApi(token!),
    enabled: !!token,
    retry: false,
  });

  const isInvalid = error != null || (invitation && new Date(invitation.expires_at) < new Date());

  return (
    <div className="min-h-screen bg-base-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-pink-primary tracking-wider">
            Debt Collector
          </h1>
        </div>

        {isLoading && (
          <div className="bg-base-surface border border-base-border rounded-lg p-8 text-center">
            <p className="text-base-text-muted">Loading invitation…</p>
          </div>
        )}

        {isInvalid && (
          <div className="bg-base-surface border border-base-border rounded-lg p-8 text-center flex flex-col gap-3">
            <p className="text-base-text font-semibold">Invitation no longer valid</p>
            <p className="text-base-text-muted text-sm">{errorMessage(error)}</p>
          </div>
        )}

        {invitation && !isInvalid && (
          <div className="bg-base-surface border border-base-border rounded-lg p-8 shadow-[var(--shadow-card)] flex flex-col gap-6">
            <div className="text-center">
              <p className="text-base-text-muted text-sm mb-1">Invitation from</p>
              <p className="text-pink-primary font-display text-2xl font-bold">
                {invitation.goddess_display_name}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-base-border pb-3">
                <span className="text-base-text-muted text-sm">Entry tribute</span>
                <span className="text-base-text font-semibold" role="status">
                  £{Number(invitation.entry_tribute_amount).toFixed(2)}
                </span>
              </div>
              {invitation.note && (
                <div className="border-b border-base-border pb-3">
                  <p className="text-base-text-muted text-sm mb-1">Note</p>
                  <p className="text-base-text text-sm">{invitation.note}</p>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-base-text-muted text-sm">Expires</span>
                <span className="text-base-text-subtle text-sm">
                  {new Date(invitation.expires_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <Link
              to={`/invite/${token}/signup`}
              className="w-full text-center bg-pink-primary text-white font-semibold py-2 px-4 rounded-md hover:bg-pink-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-pink-primary focus:ring-offset-2 focus:ring-offset-base-surface"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
