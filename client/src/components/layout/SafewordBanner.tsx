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
      className="border-b border-status-warning/40 bg-status-warning/10 text-status-warning"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-3 sm:px-6 py-2 text-xs">
        <span className="flex items-center gap-1.5 font-semibold uppercase tracking-[0.08em]">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Safeword:
          <span className="font-mono font-bold">{safeword.word}</span>
        </span>
        {safeword.signal && (
          <span className="text-status-warning/80">
            Signal: <span className="font-medium text-status-warning">{safeword.signal}</span>
          </span>
        )}
        {safeword.emergency_contact_name && (
          <span className="text-status-warning/80">
            Emergency:{" "}
            <span className="font-medium text-status-warning">
              {safeword.emergency_contact_name}
              {safeword.emergency_contact_phone ? ` · ${safeword.emergency_contact_phone}` : ""}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
