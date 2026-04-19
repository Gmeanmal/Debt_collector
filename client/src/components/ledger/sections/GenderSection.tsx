import { useAuth } from "@/services/auth/useAuth";
import { LedgerSection, LedgerEmpty, LedgerLoading } from "@/components/ledger/LedgerSection";

export function GenderSection() {
  const { user, isLoading } = useAuth();

  const taxonomy = user?.gender_taxonomy ?? null;
  const freeText = user?.gender ?? null;
  const hasAnything = taxonomy != null || (freeText != null && freeText.length > 0);

  return (
    <LedgerSection title="Gender & pronouns">
      {isLoading && <LedgerLoading />}
      {!isLoading && !hasAnything && (
        <LedgerEmpty message="No gender has been set on your profile yet." />
      )}
      {!isLoading && hasAnything && (
        <div className="flex flex-col gap-3">
          {taxonomy && (
            <div>
              <p className="text-xs text-base-text-muted uppercase tracking-wide">Identity</p>
              <p className="text-sm text-base-text font-semibold">{taxonomy.label}</p>
              {taxonomy.description && (
                <p className="text-xs text-base-text-muted mt-1">{taxonomy.description}</p>
              )}
            </div>
          )}
          {freeText && (
            <div>
              <p className="text-xs text-base-text-muted uppercase tracking-wide">Self-described</p>
              <p className="text-sm text-base-text">{freeText}</p>
            </div>
          )}
          {user?.pronouns && (
            <div>
              <p className="text-xs text-base-text-muted uppercase tracking-wide">Pronouns</p>
              <p className="text-sm text-base-text">{user.pronouns}</p>
            </div>
          )}
        </div>
      )}
    </LedgerSection>
  );
}
