import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listGoddessSubsApi } from "@/services/payments/paymentsApi";
import { listGoddessDebtsApi } from "@/services/debtContracts/debtContractsApi";
import { getRollingApi } from "@/services/rolling/rollingApi";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { queryKeys } from "@/lib/queryKeys";
import { AvatarImage } from "@/components/profile/AvatarImage";
import type { AvatarKey } from "@/services/profile/avatarMap";

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-status-success/15 text-status-success border-status-success/30",
  blacklisted: "bg-debt-muted text-status-danger border-debt-ring",
  pending_entry_tribute: "bg-status-warning/15 text-status-warning border-status-warning/30",
  deleted: "bg-base-surface-raised text-base-text-muted border-base-border",
};

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
    queryFn: listGoddessDebtsApi,
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
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">Subs</h1>
          <p className="text-sm text-base-text-muted mt-1">All subs linked to your account.</p>
        </div>

        {isLoading && <ListSkeleton rows={4} />}
        {isError && (
          <ErrorState title="Failed to load subs" message={(error as Error | undefined)?.message} />
        )}

        {!isLoading && !isError && subs.length === 0 && (
          <EmptyState title="No subs yet" message="Invite a sub to get started." />
        )}

        {subs.length > 0 && (
          <div className="bg-base-surface border border-base-border rounded-lg overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-base-border bg-base-surface-raised text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-base-text-muted uppercase tracking-wide">
                    Name
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-base-text-muted uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-base-text-muted uppercase tracking-wide">
                    Rolling
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-base-text-muted uppercase tracking-wide">
                    Active contracts
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-border">
                {subs.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => void navigate(`/goddess/subs/${sub.id}`)}
                    className="hover:bg-base-surface-raised transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-inset focus-within:ring-pink-ring"
                    tabIndex={0}
                    role="button"
                    aria-label={`Manage ${sub.display_name}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void navigate(`/goddess/subs/${sub.id}`);
                      }
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AvatarImage
                          avatarKey={(sub.avatar_key as AvatarKey | undefined) ?? "default"}
                          size="sm"
                        />
                        <div className="flex flex-col">
                          <span className="font-medium text-base-text">
                            {sub.first_name || sub.last_name
                              ? [sub.first_name, sub.last_name].filter(Boolean).join(" ")
                              : sub.display_name}
                          </span>
                          <span className="text-xs text-base-text-muted">@{sub.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${STATUS_CLASSES[sub.status] ?? ""}`}
                      >
                        {sub.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-base-text-muted">
                      {hasRolling[sub.id] ? (
                        <span className="text-status-success font-semibold">Yes</span>
                      ) : (
                        <span className="text-base-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-base-text">
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
