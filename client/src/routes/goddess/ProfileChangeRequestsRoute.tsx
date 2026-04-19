import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import { listGoddessSubsApi } from "@/services/payments/paymentsApi";
import {
  approveChangeRequestApi,
  listPendingChangeRequestsApi,
} from "@/services/profile/profileApi";
import type { ProfileChangeRequestOut } from "@/services/profile/profileApi";
import type { AvatarKey } from "@/services/profile/avatarMap";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileRequestCard } from "@/components/profile/ProfileRequestCard";
import { RejectRequestDialog } from "@/components/profile/RejectRequestDialog";
import { SetFeeRequestDialog } from "@/components/profile/SetFeeRequestDialog";

type ActionModal =
  | { type: "reject"; requestId: string }
  | { type: "set_fee"; requestId: string }
  | null;

export function ProfileChangeRequestsRoute() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ActionModal>(null);

  const {
    data: requests = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.profile.changeRequests.pendingByGoddess(),
    queryFn: listPendingChangeRequestsApi,
  });

  const { data: subs = [] } = useQuery({
    queryKey: queryKeys.goddess.subs(),
    queryFn: listGoddessSubsApi,
  });

  const subMap = Object.fromEntries(subs.map((s) => [s.id, s]));

  function invalidate() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.profile.changeRequests.pendingByGoddess(),
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.goddess.subs() });
  }

  const approveMutation = useMutation({
    mutationFn: approveChangeRequestApi,
    onSuccess: () => {
      toast.success("Request approved");
      invalidate();
    },
    onError: () => toast.error("Failed to approve"),
  });

  function getSubInfo(req: ProfileChangeRequestOut) {
    const sub = subMap[req.sub_id];
    return {
      displayName: sub?.display_name ?? "Unknown sub",
      avatarKey: (sub?.avatar_key ?? "default") as AvatarKey,
    };
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <PageHeader
          crumbs={["Home · Moderation · Profile changes"]}
          title={<span className="italic">Profile change requests</span>}
          description="Pending requests from your subs to update their profiles."
        />

        {isLoading && <ListSkeleton rows={4} />}
        {isError && (
          <ErrorState
            title="Failed to load requests"
            message={(error as Error | undefined)?.message}
          />
        )}

        {!isLoading && !isError && requests.length === 0 && (
          <EmptyState title="No pending requests" message="All caught up." />
        )}

        {requests.length > 0 && (
          <div className="flex flex-col gap-4">
            {requests.map((req) => {
              const { displayName, avatarKey } = getSubInfo(req);
              return (
                <ProfileRequestCard
                  key={req.id}
                  request={req}
                  subDisplayName={displayName}
                  subAvatarKey={avatarKey}
                  onApprove={() => approveMutation.mutate(req.id)}
                  onReject={() => setModal({ type: "reject", requestId: req.id })}
                  onSetFee={() => setModal({ type: "set_fee", requestId: req.id })}
                  isApproving={approveMutation.isPending && approveMutation.variables === req.id}
                />
              );
            })}
          </div>
        )}
      </div>

      {modal?.type === "reject" && (
        <RejectRequestDialog
          requestId={modal.requestId}
          onClose={() => setModal(null)}
          onSuccess={() => {
            invalidate();
            setModal(null);
          }}
        />
      )}

      {modal?.type === "set_fee" && (
        <SetFeeRequestDialog
          requestId={modal.requestId}
          onClose={() => setModal(null)}
          onSuccess={() => {
            invalidate();
            setModal(null);
          }}
        />
      )}
    </div>
  );
}
