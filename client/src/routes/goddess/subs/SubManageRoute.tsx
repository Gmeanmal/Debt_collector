import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getSubByUsernameApi } from "@/services/payments/paymentsApi";
import { queryKeys } from "@/lib/queryKeys";
import { SubOverviewTab } from "./SubOverviewTab";
import { SubRollingTab } from "./SubRollingTab";
import { SubContractsTab } from "./SubContractsTab";
import { SubLateTab } from "./SubLateTab";
import { SubProfileTab } from "./SubProfileTab";
import { SubKinksTab } from "./SubKinksTab";
import { SubLimitsTab } from "./SubLimitsTab";
import { SubAftercareTab } from "./SubAftercareTab";
import { SubRitualsTab } from "./SubRitualsTab";
import { SubJournalTab } from "./SubJournalTab";
import { SubMeritsTab } from "./SubMeritsTab";
import { SubInventoryTab } from "./SubInventoryTab";
import { SubDevicesTab } from "./SubDevicesTab";
import { SubProfileCard } from "@/components/goddess/SubProfileCard";
import { SendMessageQuickAction } from "@/components/goddess/SendMessageQuickAction";
import type { AvatarKey } from "@/services/profile/avatarMap";

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-base-text-muted self-center">
      {children}
    </span>
  );
}

function GroupSeparator() {
  return <span aria-hidden className="h-4 w-px bg-base-border/60 self-center" />;
}

export function SubManageRoute() {
  const { username } = useParams<{ username: string }>();
  const safeUsername = username ?? "";

  const { data: sub, isLoading } = useQuery({
    queryKey: queryKeys.goddess.subByUsername(safeUsername),
    queryFn: () => getSubByUsernameApi(safeUsername),
    enabled: safeUsername.length > 0,
  });

  if (!safeUsername) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-status-danger text-sm">No username in route.</p>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              {sub ? (
                <SubProfileCard sub={sub} />
              ) : (
                <SubProfileCard
                  sub={{
                    display_name: isLoading ? "Loading…" : "Unknown sub",
                    username: safeUsername,
                    status: "deleted",
                  }}
                  isLoading={isLoading}
                />
              )}
            </div>
            {sub ? (
              <SendMessageQuickAction
                username={safeUsername}
                displayName={sub.display_name ?? safeUsername}
              />
            ) : null}
          </div>
        </div>

        {sub?.id ? (
          <Tabs defaultValue="overview">
            <div className="overflow-x-auto">
              <TabsList className="flex-wrap items-center gap-1">
                <GroupLabel>Money</GroupLabel>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="rolling">Rolling</TabsTrigger>
                <TabsTrigger value="contracts">Contracts</TabsTrigger>
                <TabsTrigger value="late">Late</TabsTrigger>
                <GroupSeparator />
                <GroupLabel>Profile</GroupLabel>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="kinks">Kinks</TabsTrigger>
                <TabsTrigger value="limits">Limits</TabsTrigger>
                <TabsTrigger value="aftercare">Aftercare</TabsTrigger>
                <GroupSeparator />
                <GroupLabel>D/s</GroupLabel>
                <TabsTrigger value="rituals">Rituals</TabsTrigger>
                <TabsTrigger value="journal">Journal</TabsTrigger>
                <TabsTrigger value="merits">Merits</TabsTrigger>
                <GroupSeparator />
                <GroupLabel>Things</GroupLabel>
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
                <TabsTrigger value="devices">Devices</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview">
              <SubOverviewTab subId={sub.id} username={safeUsername} status={sub.status ?? ""} />
            </TabsContent>

            <TabsContent value="rolling">
              <SubRollingTab subId={sub.id} />
            </TabsContent>

            <TabsContent value="contracts">
              <SubContractsTab subId={sub.id} username={safeUsername} />
            </TabsContent>

            <TabsContent value="late">
              <SubLateTab subId={sub.id} />
            </TabsContent>

            <TabsContent value="profile">
              <SubProfileTab
                subId={sub.id}
                currentFirstName={sub.first_name}
                currentLastName={sub.last_name}
                currentAvatarKey={(sub.avatar_key as AvatarKey | undefined) ?? "default"}
              />
            </TabsContent>

            <TabsContent value="kinks">
              <SubKinksTab subId={sub.id} />
            </TabsContent>

            <TabsContent value="limits">
              <SubLimitsTab subId={sub.id} />
            </TabsContent>

            <TabsContent value="aftercare">
              <SubAftercareTab username={safeUsername} />
            </TabsContent>

            <TabsContent value="rituals">
              <SubRitualsTab subId={sub.id} />
            </TabsContent>

            <TabsContent value="journal">
              <SubJournalTab subId={sub.id} username={safeUsername} />
            </TabsContent>

            <TabsContent value="merits">
              <SubMeritsTab subId={sub.id} />
            </TabsContent>

            <TabsContent value="inventory">
              <SubInventoryTab subId={sub.id} />
            </TabsContent>

            <TabsContent value="devices">
              <SubDevicesTab subId={sub.id} />
            </TabsContent>
          </Tabs>
        ) : null}
      </div>
    </div>
  );
}
