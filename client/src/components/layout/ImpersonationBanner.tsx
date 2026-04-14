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
    <div className="sticky top-0 z-50 border-b border-pink-primary/50 bg-pink-primary/15 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-2 text-sm">
        <ShieldAlert className="h-4 w-4 text-pink-primary shrink-0" />
        <span className="text-base-text">
          Acting as <strong className="text-pink-primary">{user.display_name}</strong> — signed in
          as admin <strong className="text-base-text">{user.impersonator_display_name}</strong>
        </span>
        <button
          type="button"
          onClick={() => void onReturn()}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-pink-primary/50 bg-pink-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-pink-primary hover:bg-pink-primary/20 disabled:opacity-50"
        >
          <ArrowLeftCircle className="h-3.5 w-3.5" />
          {busy ? "Returning…" : "Return to admin"}
        </button>
      </div>
    </div>
  );
}
