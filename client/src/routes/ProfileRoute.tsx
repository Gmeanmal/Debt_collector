import { useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/services/auth/useAuth";
import { updateProfileApi } from "@/services/auth/authApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queryKeys } from "@/lib/queryKeys";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/profile/Avatar";
import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { ChangeRequestPanel } from "@/components/profile/ChangeRequestPanel";
import { ChangeRequestList } from "@/components/profile/ChangeRequestList";
import { updatePaymentHandleApi, listMyChangeRequestsApi } from "@/services/profile/profileApi";
import type { AvatarKey } from "@/services/profile/avatarMap";
import { IdentityFieldsCard } from "@/components/profile/IdentityFieldsCard";

function emptyToNull(v: string): string | null {
  return v.trim() === "" ? null : v.trim();
}

const paymentHandleSchema = z.string().max(64).nullable();

function deriveHandle(email: string): string {
  return email.split("@")[0] ?? email;
}

export function ProfileRoute() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const panelHeadingId = useId();

  const [avatarKey, setAvatarKey] = useState<AvatarKey>(user?.avatar_key ?? "default");
  const [showChangePanel, setShowChangePanel] = useState(false);
  const [paymentHandle, setPaymentHandle] = useState("");
  const [paymentHandleError, setPaymentHandleError] = useState("");

  const { data: changeRequests = [] } = useQuery({
    queryKey: queryKeys.profile.changeRequests.own(),
    queryFn: listMyChangeRequestsApi,
    enabled: user?.role === "sub",
  });

  const avatarMutation = useMutation({
    mutationFn: (key: AvatarKey) =>
      updateProfileApi({
        avatar_key: key,
        first_name: user?.first_name ?? null,
        last_name: user?.last_name ?? null,
        bio: user?.bio ?? null,
      }),
    onSuccess: (result) => {
      if (result.kind === "applied") {
        void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
        toast.success("Avatar saved");
      }
    },
    onError: () => toast.error("Failed to update avatar"),
  });

  const handleMutation = useMutation({
    mutationFn: (handle: string | null) => updatePaymentHandleApi(handle),
    onSuccess: () => {
      toast.success("Payment handle updated");
    },
    onError: () => toast.error("Failed to update payment handle"),
  });

  function handleSaveHandle() {
    const parsed = paymentHandleSchema.safeParse(emptyToNull(paymentHandle));
    if (!parsed.success) {
      setPaymentHandleError(parsed.error.issues[0]?.message ?? "Invalid");
      return;
    }
    setPaymentHandleError("");
    handleMutation.mutate(parsed.data);
  }

  function handleSaveAvatar() {
    avatarMutation.mutate(avatarKey);
  }

  function handlePayToFee(requestId: string) {
    void navigate(`/sub/payments/new?change_request_id=${requestId}`);
  }

  function handleChangePanelSuccess() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.profile.changeRequests.own(),
    });
    setShowChangePanel(false);
  }

  const isSubRole = user?.role === "sub";
  const emailHandle = user?.email ? deriveHandle(user.email) : null;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            {user?.display_name ?? "Profile"}
          </h1>
          {emailHandle && <p className="text-sm text-base-text-muted mt-0.5">@{emailHandle}</p>}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar user={user} size="lg" />
              <div>
                <CardTitle className="text-lg">{user?.display_name}</CardTitle>
                {user?.first_name || user?.last_name ? (
                  <p className="text-sm text-base-text-muted">
                    {[user.first_name, user.last_name].filter(Boolean).join(" ")}
                  </p>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Choose avatar</Label>
              <AvatarPicker value={avatarKey} onChange={setAvatarKey} />
            </div>
            <Button
              onClick={handleSaveAvatar}
              disabled={avatarMutation.isPending || avatarKey === user?.avatar_key}
              variant="outline"
              className="self-end"
            >
              {avatarMutation.isPending ? "Saving…" : "Save avatar"}
            </Button>
          </CardContent>
        </Card>

        <IdentityFieldsCard
          user={user}
          onSaved={() => queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() })}
        />

        {isSubRole && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment handle</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-xs text-base-text-muted">
                Your payment identifier (e.g. CashApp tag, Throne handle). Visible to you and your
                Goddess.
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="payment_handle">Handle</Label>
                <Input
                  id="payment_handle"
                  value={paymentHandle}
                  onChange={(e) => {
                    setPaymentHandle(e.target.value);
                    setPaymentHandleError("");
                  }}
                  placeholder="@yourhandle"
                  maxLength={64}
                />
                {paymentHandleError && (
                  <p className="text-xs text-status-danger">{paymentHandleError}</p>
                )}
              </div>
              <Button
                onClick={handleSaveHandle}
                disabled={handleMutation.isPending}
                className="self-end"
              >
                {handleMutation.isPending ? "Saving…" : "Save handle"}
              </Button>
            </CardContent>
          </Card>
        )}

        {isSubRole && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base" id={panelHeadingId}>
                  Profile change requests
                </CardTitle>
                <Button
                  size="sm"
                  aria-expanded={showChangePanel}
                  aria-controls="change-request-panel"
                  onClick={() => setShowChangePanel((prev) => !prev)}
                >
                  Request profile change
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {showChangePanel && (
                <section
                  id="change-request-panel"
                  role="region"
                  aria-labelledby={panelHeadingId}
                  className="border border-base-border rounded-md px-4 pb-4"
                >
                  <ChangeRequestPanel
                    onSuccess={handleChangePanelSuccess}
                    onCancel={() => setShowChangePanel(false)}
                  />
                </section>
              )}
              <ChangeRequestList requests={changeRequests} onPayFee={handlePayToFee} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
