import { ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/services/auth/useAuth";
import { getSafeword, safewordKey } from "@/services/safeword/safewordApi";

export function SafewordBanner() {
  const { user } = useAuth();

  const { data: safeword } = useQuery({
    queryKey: [...safewordKey],
    queryFn: getSafeword,
    enabled: user?.role === "sub",
    retry: false,
    // 404 means no safeword set — treat as null, not an error worth retrying
    throwOnError: false,
  });

  if (user?.role !== "sub" || !safeword) return null;

  return (
    <div
      role="banner"
      aria-label="Safeword information"
      className="border-b border-bad-ink/25 bg-bad-bg/70 text-bad-ink"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-baseline gap-x-5 gap-y-1 px-3 sm:px-6 py-3">
        <span className="flex items-center gap-2 font-serif italic text-[20px] leading-tight">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          Safeword
          <span className="font-mono not-italic text-[16px] font-semibold tracking-[0.04em]">
            {safeword.word}
          </span>
        </span>
        {safeword.signal && (
          <span className="text-sm text-bad-ink/75">
            Signal: <span className="font-medium text-bad-ink">{safeword.signal}</span>
          </span>
        )}
        {safeword.emergency_contact_name && (
          <span className="text-sm text-bad-ink/75">
            Emergency:{" "}
            <span className="font-medium text-bad-ink">
              {safeword.emergency_contact_name}
              {safeword.emergency_contact_phone ? ` · ${safeword.emergency_contact_phone}` : ""}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
