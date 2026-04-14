import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listGoddessSubsApi } from "@/services/payments/paymentsApi";
import { SubRollingSection } from "@/components/subDetail/SubRollingSection";
import { SubContractsSection } from "@/components/subDetail/SubContractsSection";
import { SubPaymentsSection } from "@/components/subDetail/SubPaymentsSection";

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-status-success/15 text-status-success border-status-success/30",
  blacklisted: "bg-debt-muted text-status-danger border-debt-ring",
  pending_entry_tribute: "bg-status-warning/15 text-status-warning border-status-warning/30",
  deleted: "bg-base-surface-raised text-base-text-muted border-base-border",
};

export function SubDetailRoute() {
  const { subId } = useParams<{ subId: string }>();
  const safeSubId = subId ?? "";

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["goddessSubs"],
    queryFn: listGoddessSubsApi,
  });

  const sub = subs.find((s) => s.id === safeSubId);

  if (!safeSubId) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-status-danger text-sm">No sub ID in route.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
              {sub?.display_name ?? (isLoading ? "Loading…" : "Unknown sub")}
            </h1>
            {sub && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-base-text-muted">@{sub.username}</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${STATUS_CLASSES[sub.status] ?? ""}`}
                >
                  {sub.status.replace(/_/g, " ")}
                </span>
              </div>
            )}
          </div>
          {sub?.status === "active" && (
            <Link
              to={`/goddess/subs/${safeSubId}/breach`}
              className="px-3 py-1.5 text-sm bg-debt-primary text-pink-foreground font-semibold rounded hover:bg-debt-primary-hover transition-colors focus-visible:ring-2 focus-visible:ring-debt-primary"
            >
              Breach sub
            </Link>
          )}
        </div>

        <SubRollingSection subId={safeSubId} />
        <SubContractsSection subId={safeSubId} />
        <SubPaymentsSection subId={safeSubId} />
      </div>
    </div>
  );
}
