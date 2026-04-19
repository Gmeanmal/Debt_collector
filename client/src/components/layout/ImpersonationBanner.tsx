import { useState } from "react";
import { ArrowLeftCircle, ShieldAlert } from "lucide-react";
import { useAuth } from "@/services/auth/useAuth";

export function ImpersonationBanner() {
  const { user, stopImpersonating } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!user?.impersonator_id) return null;

  async function onReturn() {
    setBusy(true);
    try {
      await stopImpersonating();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sticky top-0 z-50 border-b border-warn-ink/20 bg-warn-bg text-warn-ink">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-2 text-sm">
        <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-warn-ink/80">
          Impersonating
        </span>
        <span className="text-warn-ink">
          Acting as <strong className="font-semibold">{user.display_name}</strong> — signed in as
          admin <strong className="font-semibold">{user.impersonator_display_name}</strong>
        </span>
        <button
          type="button"
          onClick={() => void onReturn()}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-1.5 rounded-[6px] border border-warn-ink/30 bg-bg-elev/40 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.12em] text-warn-ink hover:bg-bg-elev/70 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warn-ink/50"
        >
          <ArrowLeftCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {busy ? "Returning…" : "Return to admin"}
        </button>
      </div>
    </div>
  );
}
