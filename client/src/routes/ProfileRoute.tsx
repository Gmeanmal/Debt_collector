import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/services/auth/useAuth";
import { updateProfileApi } from "@/services/auth/authApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";

const BIO_MAX = 500;

const profileSchema = z.object({
  first_name: z.string().max(100).nullable(),
  last_name: z.string().max(100).nullable(),
  bio: z.string().max(BIO_MAX).nullable(),
  avatar_url: z
    .string()
    .url("Must be a valid URL")
    .nullable()
    .or(z.literal("").transform(() => null)),
});

type ProfileForm = z.infer<typeof profileSchema>;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function emptyToNull(v: string): string | null {
  return v.trim() === "" ? null : v.trim();
}

interface FieldRowProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
}

function FieldRow({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
}: FieldRowProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {error && <p className="text-xs text-status-danger">{error}</p>}
    </div>
  );
}

export function ProfileRoute() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<ProfileForm>({
    first_name: user?.first_name ?? null,
    last_name: user?.last_name ?? null,
    bio: user?.bio ?? null,
    avatar_url: user?.avatar_url ?? null,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({});

  const mutation = useMutation({
    mutationFn: updateProfileApi,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Profile updated");
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });

  function field(key: keyof ProfileForm) {
    return form[key] ?? "";
  }

  function setField(key: keyof ProfileForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleSave() {
    const payload: ProfileForm = {
      first_name: emptyToNull(form.first_name ?? ""),
      last_name: emptyToNull(form.last_name ?? ""),
      bio: emptyToNull(form.bio ?? ""),
      avatar_url: emptyToNull(form.avatar_url ?? ""),
    };

    const parsed = profileSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof ProfileForm, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ProfileForm;
        if (key) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    mutation.mutate(parsed.data);
  }

  const bioLength = (form.bio ?? "").length;
  const avatarPreview =
    form.avatar_url && form.avatar_url.startsWith("http") ? form.avatar_url : undefined;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Profile
          </h1>
          <p className="text-sm text-base-text-muted mt-1">Update your personal details.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                {avatarPreview && <AvatarImage src={avatarPreview} alt="Avatar preview" />}
                <AvatarFallback className="text-lg">
                  {user ? initials(user.display_name) : "?"}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-lg">{user?.display_name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <FieldRow
                id="first_name"
                label="First name"
                value={field("first_name") as string}
                onChange={(v) => setField("first_name", v)}
                placeholder="Jane"
                error={errors.first_name}
              />
              <FieldRow
                id="last_name"
                label="Last name"
                value={field("last_name") as string}
                onChange={(v) => setField("last_name", v)}
                placeholder="Doe"
                error={errors.last_name}
              />
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bio">Bio</Label>
                  <span
                    className={`text-xs ${bioLength > BIO_MAX ? "text-status-danger" : "text-base-text-muted"}`}
                    role="status"
                    aria-label={`${bioLength} of ${BIO_MAX} characters`}
                  >
                    {bioLength}/{BIO_MAX}
                  </span>
                </div>
                <textarea
                  id="bio"
                  className="flex min-h-[100px] w-full rounded-md border border-base-border bg-base-surface-raised/60 px-4 py-2 text-sm text-base-text shadow-[0_1px_0_rgba(244,237,225,0.04)_inset] transition-all duration-200 placeholder:text-base-text-subtle focus:border-pink-primary/60 focus:bg-base-surface-raised focus:outline-none focus:ring-2 focus:ring-pink-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  value={form.bio ?? ""}
                  onChange={(e) => setField("bio", e.target.value)}
                  placeholder="Tell us a bit about yourself…"
                  maxLength={BIO_MAX}
                />
                {errors.bio && <p className="text-xs text-status-danger">{errors.bio}</p>}
              </div>
              <FieldRow
                id="avatar_url"
                label="Avatar URL"
                value={field("avatar_url") as string}
                onChange={(v) => setField("avatar_url", v)}
                placeholder="https://example.com/avatar.png"
                type="url"
                error={errors.avatar_url}
              />
              <Button
                onClick={handleSave}
                disabled={mutation.isPending}
                className="w-full sm:w-auto sm:self-end"
              >
                {mutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
