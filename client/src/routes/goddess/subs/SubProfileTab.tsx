import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { AvatarImage } from "@/components/profile/AvatarImage";
import { goddessEditSubProfileApi } from "@/services/profile/profileApi";
import { queryKeys } from "@/lib/queryKeys";
import type { AvatarKey } from "@/services/profile/avatarMap";

const schema = z.object({
  first_name: z.string().max(100).nullable(),
  last_name: z.string().max(100).nullable(),
  avatar_key: z
    .enum([
      "default",
      "pink_1",
      "pink_2",
      "pink_3",
      "pink_4",
      "dark_1",
      "dark_2",
      "dark_3",
      "accent_1",
      "accent_2",
    ])
    .nullable(),
});

function toNull(v: string): string | null {
  return v.trim() === "" ? null : v.trim();
}

interface SubProfileTabProps {
  subId: string;
  currentFirstName?: string | null;
  currentLastName?: string | null;
  currentAvatarKey?: AvatarKey;
}

export function SubProfileTab({
  subId,
  currentFirstName,
  currentLastName,
  currentAvatarKey = "default",
}: SubProfileTabProps) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState(currentFirstName ?? "");
  const [lastName, setLastName] = useState(currentLastName ?? "");
  const [avatarKey, setAvatarKey] = useState<AvatarKey>(currentAvatarKey);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () =>
      goddessEditSubProfileApi(subId, {
        first_name: toNull(firstName),
        last_name: toNull(lastName),
        avatar_key: avatarKey,
      }),
    onSuccess: () => {
      toast.success("Profile updated");
      void queryClient.invalidateQueries({ queryKey: queryKeys.goddess.subs() });
    },
    onError: () => toast.error("Failed to update profile"),
  });

  function handleSave() {
    const payload = {
      first_name: toNull(firstName),
      last_name: toNull(lastName),
      avatar_key: avatarKey,
    };
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[String(issue.path[0])] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    mutation.mutate();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Edit sub profile</CardTitle>
        <p className="text-xs text-base-text-muted">Direct edit — no change request required.</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3 mb-2">
          <AvatarImage avatarKey={avatarKey} size="lg" />
          <span className="text-sm text-base-text-muted">Current selection</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sub_first_name">First name</Label>
          <Input
            id="sub_first_name"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              setErrors((p) => ({ ...p, first_name: "" }));
            }}
            placeholder="Alice"
          />
          {errors.first_name && <p className="text-xs text-status-danger">{errors.first_name}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sub_last_name">Last name</Label>
          <Input
            id="sub_last_name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Smith"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Avatar</Label>
          <AvatarPicker value={avatarKey} onChange={setAvatarKey} />
        </div>

        <Button onClick={handleSave} disabled={mutation.isPending} className="self-end">
          {mutation.isPending ? "Saving…" : "Save profile"}
        </Button>
      </CardContent>
    </Card>
  );
}
