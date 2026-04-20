import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { updateProfileApi } from "@/services/auth/authApi";
import { useGenderTaxonomy } from "@/hooks/useGenderTaxonomy";
import type { components } from "@/types/api.generated";

type UserOut = components["schemas"]["UserOut"];
type AvatarKey = components["schemas"]["AvatarKey"];
type GenderTaxonomyOut = components["schemas"]["GenderTaxonomyOut"];

interface Props {
  user: UserOut | null | undefined;
  onSaved: () => void;
}

interface IdentityFields {
  pronouns: string;
  location: string;
  timezone: string;
  date_of_birth: string;
  real_name: string;
}

function initFields(user: UserOut | null | undefined): IdentityFields {
  return {
    pronouns: user?.pronouns ?? "",
    location: user?.location ?? "",
    timezone: user?.timezone ?? "",
    date_of_birth: user?.date_of_birth ?? "",
    real_name: user?.real_name ?? "",
  };
}

export function IdentityFieldsCard({ user, onSaved }: Props) {
  const [fields, setFields] = useState<IdentityFields>(() => initFields(user));
  const [pendingRealName, setPendingRealName] = useState(false);
  const { genders, isLoading: gendersLoading } = useGenderTaxonomy();
  const [selectedGender, setSelectedGender] = useState<GenderTaxonomyOut | null>(null);

  // Sync selected gender once the taxonomy list has loaded and the user has a gender_taxonomy set.
  // WHY: genders array is empty on first render; this effect resolves the initial value lazily.
  useEffect(() => {
    if (genders.length === 0) return;
    const taxId = user?.gender_taxonomy?.id;
    if (!taxId) return;
    const match = genders.find((g) => g.id === taxId) ?? null;
    setSelectedGender(match);
  }, [genders, user?.gender_taxonomy?.id]);

  const mutation = useMutation({
    mutationFn: () =>
      updateProfileApi({
        avatar_key: (user?.avatar_key ?? "default") as AvatarKey,
        first_name: user?.first_name ?? null,
        last_name: user?.last_name ?? null,
        bio: user?.bio ?? null,
        gender: user?.gender ?? null,
        pronouns: fields.pronouns.trim() || null,
        location: fields.location.trim() || null,
        timezone: fields.timezone.trim() || null,
        date_of_birth: fields.date_of_birth || null,
        real_name: fields.real_name.trim() || null,
        gender_id: selectedGender?.id ?? null,
      }),
    onSuccess: (result) => {
      if (result.kind === "pending_change_request") {
        setPendingRealName(true);
        toast.info("Your real name change is pending goddess approval.");
        onSaved();
      } else {
        setPendingRealName(false);
        toast.success("Identity updated");
        onSaved();
      }
    },
    onError: () => toast.error("Failed to update identity"),
  });

  function handleChange(field: keyof IdentityFields) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFields((prev) => ({ ...prev, [field]: e.target.value }));
      if (field === "real_name") setPendingRealName(false);
    };
  }

  return (
    <Card className="bg-bg-elev border border-line rounded-[10px]">
      <CardHeader>
        <CardTitle className="text-base">Identity</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="id-timezone">Timezone</Label>
          <Input
            id="id-timezone"
            value={fields.timezone}
            onChange={handleChange("timezone")}
            placeholder="Europe/London"
            maxLength={64}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="id-dob">Date of birth</Label>
          <Input
            id="id-dob"
            type="date"
            value={fields.date_of_birth}
            onChange={handleChange("date_of_birth")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="id-gender">Gender</Label>
          <SearchableSelect<GenderTaxonomyOut>
            options={genders}
            value={selectedGender}
            onChange={setSelectedGender}
            getLabel={(g) => g.label}
            getValue={(g) => g.id}
            placeholder="Select a gender…"
            emptyMessage="No match — try another search."
            disabled={gendersLoading}
            nullable
            ariaLabel="Gender"
          />
          <p className="text-xs text-text-mute min-h-[1rem]">{selectedGender?.description ?? ""}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="id-pronouns">Pronouns</Label>
          <Input
            id="id-pronouns"
            value={fields.pronouns}
            onChange={handleChange("pronouns")}
            placeholder="e.g. they/them"
            maxLength={64}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="id-location">Location</Label>
          <Input
            id="id-location"
            value={fields.location}
            onChange={handleChange("location")}
            placeholder="e.g. London, UK"
            maxLength={120}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="id-real-name">Real name</Label>
          <Input
            id="id-real-name"
            value={fields.real_name}
            onChange={handleChange("real_name")}
            placeholder="Your legal name (visible only to your goddess)"
            maxLength={200}
          />
          {pendingRealName && (
            <p className="text-xs text-warn-ink">Real name change is pending goddess approval.</p>
          )}
        </div>

        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          variant="ghost"
          className="self-end"
        >
          {mutation.isPending ? "Saving…" : "Save identity"}
        </Button>
      </CardContent>
    </Card>
  );
}
