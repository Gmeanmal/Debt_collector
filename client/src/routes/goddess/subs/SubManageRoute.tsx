import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { listGoddessSubsApi } from "@/services/payments/paymentsApi";
import { queryKeys } from "@/lib/queryKeys";
import { SubOverviewTab } from "./SubOverviewTab";
import { SubRollingTab } from "./SubRollingTab";
import { SubContractsTab } from "./SubContractsTab";
import { SubLateTab } from "./SubLateTab";
import { SubProfileTab } from "./SubProfileTab";
import { SubProfileCard } from "@/components/goddess/SubProfileCard";
import type { AvatarKey } from "@/services/profile/avatarMap";

export function SubManageRoute() {
  const { subId } = useParams<{ subId: string }>();
  const safeSubId = subId ?? "";

  const { data: subs = [], isLoading } = useQuery({
    queryKey: queryKeys.goddess.subs(),
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
        <div className="flex flex-col gap-2">
          <Link
            to="/goddess/subs"
            className="text-xs text-base-text-muted hover:text-base-text transition-colors focus-visible:ring-2 focus-visible:ring-pink-ring rounded w-fit"
          >
            ← All subs
          </Link>
          {sub ? (
            <SubProfileCard sub={sub} />
          ) : (
            <SubProfileCard
              sub={{
                display_name: isLoading ? "Loading…" : "Unknown sub",
                username: "",
                status: "deleted",
              }}
              isLoading={isLoading}
            />
          )}
        </div>

        <Tabs defaultValue="overview">
          <div className="overflow-x-auto">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="rolling">Rolling</TabsTrigger>
              <TabsTrigger value="contracts">Contracts</TabsTrigger>
              <TabsTrigger value="late">Late</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
            </TabsList>
          </div>

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

          <TabsContent value="profile">
            <SubProfileTab
              subId={safeSubId}
              currentFirstName={sub?.first_name}
              currentLastName={sub?.last_name}
              currentAvatarKey={(sub?.avatar_key as AvatarKey | undefined) ?? "default"}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
