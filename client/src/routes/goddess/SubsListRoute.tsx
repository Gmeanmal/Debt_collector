import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listGoddessSubsApi } from "@/services/payments/paymentsApi";
import { listGoddessDebtsApi } from "@/services/debtContracts/debtContractsApi";
import { getRollingApi } from "@/services/rolling/rollingApi";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { queryKeys } from "@/lib/queryKeys";
import { Avatar } from "@/components/profile/Avatar";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

type BadgeTone = NonNullable<BadgeProps["variant"]>;

function statusTone(status: string): BadgeTone {
  switch (status) {
    case "active":
      return "ok";
    case "blacklisted":
      return "bad";
    case "pending_entry_tribute":
      return "warn";
    default:
      return "neutral";
  }
}

const ACTIVE_CONTRACT_STATUSES = new Set([
  "pending_sub",
  "pending_dom",
  "pending_dom_counter",
  "pending_sub_signature",
  "active",
]);

export function SubsListRoute() {
  const navigate = useNavigate();

  const {
    data: subs = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.goddess.subs(),
    queryFn: listGoddessSubsApi,
  });

  const { data: contracts = [] } = useQuery({
    queryKey: queryKeys.goddess.contracts(),
    queryFn: () => listGoddessDebtsApi(),
    enabled: subs.length > 0,
  });

  const rollingQueries = useQuery({
    queryKey: queryKeys.goddess.allRolling(subs.map((s) => s.id)),
    queryFn: async () => {
      const results = await Promise.allSettled(subs.map((s) => getRollingApi(s.id)));
      return Object.fromEntries(
        subs.map((s, i) => {
          const r = results[i];
          return [s.id, r.status === "fulfilled" && r.value != null];
        }),
      );
    },
    enabled: subs.length > 0,
  });

  const hasRolling: Record<string, boolean> = rollingQueries.data ?? {};

  function activeContractCount(subId: string): number {
    return contracts.filter((c) => c.sub_id === subId && ACTIVE_CONTRACT_STATUSES.has(c.status))
      .length;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <PageHeader
          crumbs={["Home · People"]}
          title={<span className="italic">Subs</span>}
          description="All subs linked to your account."
        />

        {isLoading && <ListSkeleton rows={4} />}
        {isError && (
          <ErrorState title="Failed to load subs" message={(error as Error | undefined)?.message} />
        )}

        {!isLoading && !isError && subs.length === 0 && (
          <EmptyState title="No subs yet" message="Invite a sub to get started." />
        )}

        {subs.length > 0 && (
          <div className="bg-bg-elev border border-line rounded-[10px] overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line bg-bg-sunken text-left">
                  <th className="px-4 py-3 text-[10px] font-mono uppercase tracking-[0.14em] text-text-faint">
                    Name
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono uppercase tracking-[0.14em] text-text-faint">
                    Status
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono uppercase tracking-[0.14em] text-text-faint">
                    Rolling
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono uppercase tracking-[0.14em] text-text-faint text-right">
                    Active contracts
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {subs.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => void navigate(`/goddess/subs/${sub.username}`)}
                    className="hover:bg-bg-sunken transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
                    tabIndex={0}
                    role="button"
                    aria-label={`Manage ${sub.display_name}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void navigate(`/goddess/subs/${sub.username}`);
                      }
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar user={sub} size="sm" />
                        <div className="flex flex-col">
                          <span className="font-medium text-text">
                            {sub.first_name || sub.last_name
                              ? [sub.first_name, sub.last_name].filter(Boolean).join(" ")
                              : sub.display_name}
                          </span>
                          <span className="font-mono text-[11px] tracking-[0.08em] text-text-faint">
                            @{sub.username}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusTone(sub.status)}>
                        {sub.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {hasRolling[sub.id] ? (
                        <span className="text-ok-ink font-semibold">Yes</span>
                      ) : (
                        <span className="text-text-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-text text-right">
                      {activeContractCount(sub.id)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
