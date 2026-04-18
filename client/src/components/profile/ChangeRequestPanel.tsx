import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { createChangeRequestApi } from "@/services/profile/profileApi";
import type { AvatarKey } from "@/services/profile/avatarMap";

const schema = z.object({
  proposed_first_name: z.string().max(100).nullable(),
  proposed_last_name: z.string().max(100).nullable(),
  proposed_display_name: z.string().max(100).nullable(),
  proposed_notes: z.string().max(500).nullable(),
  proposed_avatar_key: z
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

interface ChangeRequestPanelProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ChangeRequestPanel({ onSuccess, onCancel }: ChangeRequestPanelProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [notes, setNotes] = useState("");
  const [avatarKey, setAvatarKey] = useState<AvatarKey | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: createChangeRequestApi,
    onSuccess: () => {
      toast.success("Change request submitted");
      onSuccess();
    },
    onError: () => toast.error("Failed to submit change request"),
  });

  function handleSubmit() {
    const payload = {
      proposed_first_name: toNull(firstName),
      proposed_last_name: toNull(lastName),
      proposed_display_name: toNull(displayName),
      proposed_notes: toNull(notes),
      proposed_avatar_key: avatarKey,
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

    const hasAtLeastOne = Object.values(parsed.data).some((v) => v !== null);
    if (!hasAtLeastOne) {
      setErrors({ _form: "At least one field must be filled in." });
      return;
    }

    setErrors({});
    mutation.mutate(parsed.data);
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      {errors._form && <p className="text-xs text-status-danger">{errors._form}</p>}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cr_first_name">First name</Label>
        <Input
          id="cr_first_name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Proposed first name"
        />
        {errors.proposed_first_name && (
          <p className="text-xs text-status-danger">{errors.proposed_first_name}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cr_last_name">Last name</Label>
        <Input
          id="cr_last_name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Proposed last name"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cr_display_name">Display name</Label>
        <Input
          id="cr_display_name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Proposed display name"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cr_notes">Notes for Goddess</Label>
        <textarea
          id="cr_notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Explain your request…"
          maxLength={500}
          className="flex min-h-[80px] w-full rounded-md border border-base-border bg-base-surface-raised/60 px-4 py-2 text-sm text-base-text transition-all duration-200 placeholder:text-base-text-subtle focus:border-pink-primary/60 focus:bg-base-surface-raised focus:outline-none focus:ring-2 focus:ring-pink-ring focus:ring-offset-0 resize-y"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Proposed avatar (optional)</Label>
        <AvatarPicker value={avatarKey ?? "default"} onChange={(k) => setAvatarKey(k)} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onCancel} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? "Submitting…" : "Submit request"}
        </Button>
      </div>
    </div>
  );
}
