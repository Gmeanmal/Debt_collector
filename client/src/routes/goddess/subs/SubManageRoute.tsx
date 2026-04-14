import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { listGoddessSubsApi } from "@/services/payments/paymentsApi";
import { SubOverviewTab } from "./SubOverviewTab";
import { SubRollingTab } from "./SubRollingTab";
import { SubContractsTab } from "./SubContractsTab";
import { SubLateTab } from "./SubLateTab";

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-status-success/15 text-status-success border-status-success/30",
  blacklisted: "bg-debt-muted text-status-danger border-debt-ring",
  pending_entry_tribute: "bg-status-warning/15 text-status-warning border-status-warning/30",
  deleted: "bg-base-surface-raised text-base-text-muted border-base-border",
};

export function SubManageRoute() {
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
        <div className="flex flex-col gap-1">
          <Link
            to="/goddess/subs"
            className="text-xs text-base-text-muted hover:text-base-text transition-colors focus-visible:ring-2 focus-visible:ring-pink-ring rounded w-fit"
          >
            ← All subs
          </Link>
          <div className="flex items-start justify-between gap-3 flex-wrap mt-1">
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
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rolling">Rolling</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="late">Late</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <SubOverviewTab subId={safeSubId} status={sub?.status ?? ""} />
          </TabsContent>

          <TabsContent value="rolling">
            <SubRollingTab subId={safeSubId} />
          </TabsContent>

          <TabsContent value="contracts">
            <SubContractsTab subId={safeSubId} />
          </TabsContent>

          <TabsContent value="late">
            <SubLateTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
