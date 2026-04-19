import { useAuth } from "@/services/auth/useAuth";
import { AvatarImage } from "@/components/profile/AvatarImage";
import type { AvatarKey } from "@/services/profile/avatarMap";
import { formatLondon } from "@/services/format/datetime";
import { LedgerSection, LedgerEmpty, LedgerLoading } from "@/components/ledger/LedgerSection";

interface Row {
  label: string;
  value: string | null | undefined;
}

function IdentityRow({ label, value }: Row) {
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-line/40 last:border-b-0">
      <span className="text-xs text-text-mute uppercase tracking-wide">{label}</span>
      <span className="text-sm text-text text-right break-words">{value || "—"}</span>
    </div>
  );
}

export function IdentitySection() {
  const { user, isLoading } = useAuth();

  return (
    <LedgerSection title="Identity" updatedAt={user?.created_at} defaultOpen>
      {isLoading && <LedgerLoading />}
      {!isLoading && !user && <LedgerEmpty message="Identity not available." />}
      {user && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <AvatarImage
              avatarKey={(user.avatar_key ?? "default") as AvatarKey}
              size="lg"
              displayName={user.display_name}
            />
            <div className="flex flex-col min-w-0">
              <span className="font-serif italic text-lg text-text tracking-wide truncate">
                {user.display_name}
              </span>
              <span className="text-sm text-text-mute truncate">{user.email}</span>
            </div>
          </div>

          <div className="flex flex-col">
            <IdentityRow label="First name" value={user.first_name} />
            <IdentityRow label="Last name" value={user.last_name} />
            <IdentityRow label="Real name" value={user.real_name} />
            <IdentityRow label="Payment handle" value={user.payment_handle} />
            <IdentityRow label="Pronouns" value={user.pronouns} />
            <IdentityRow label="Location" value={user.location} />
            <IdentityRow label="Timezone" value={user.timezone} />
            <IdentityRow
              label="Date of birth"
              value={user.date_of_birth ? formatLondon(user.date_of_birth, "date") : null}
            />
            <IdentityRow label="Account status" value={user.status} />
            <IdentityRow
              label="Member since"
              value={user.created_at ? formatLondon(user.created_at, "date") : null}
            />
          </div>

          {user.bio && (
            <div className="bg-bg-sunken border border-line rounded p-3">
              <p className="text-xs text-text-mute uppercase tracking-wide mb-1">Bio</p>
              <p className="text-sm text-text whitespace-pre-wrap">{user.bio}</p>
            </div>
          )}
        </div>
      )}
    </LedgerSection>
  );
}
