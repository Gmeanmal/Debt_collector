import { Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePushOptIn } from "@/hooks/usePushOptIn";
import { env } from "@/utils/env";

export function PushOptInToggle(): JSX.Element | null {
  const { supported, permission, enabled, enabling, disabling, enable, disable } = usePushOptIn();
  if (!supported || !env.VITE_VAPID_PUBLIC_KEY) return null;

  if (permission === "denied") {
    return (
      <div
        className="flex w-full items-center justify-between gap-3 px-2 py-1.5 text-sm text-text-faint cursor-not-allowed"
        aria-label="Push notifications blocked by browser"
        role="note"
      >
        <span className="flex items-center gap-2">
          <BellOff className="h-4 w-4" aria-hidden="true" />
          <span className="text-text">Push notifications</span>
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-faint">
          Blocked
        </span>
      </div>
    );
  }

  const busy = enabling || disabling;
  const label = enabled ? "Disable push notifications" : "Enable push notifications";
  const statusLabel = busy ? "…" : enabled ? "On" : "Off";
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void (enabled ? disable() : enable())}
      className="flex w-full items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-sm text-text outline-none hover:bg-bg-sunken/60 focus:bg-bg-sunken/60 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      aria-label={label}
      aria-busy={busy}
    >
      <span className="flex items-center gap-2">
        <Bell className="h-4 w-4" aria-hidden="true" />
        <span>Push notifications</span>
      </span>
      <span
        className={cn(
          "font-mono text-[11px] uppercase tracking-[0.1em]",
          enabled ? "text-accent-deep" : "text-text-faint",
        )}
      >
        {statusLabel}
      </span>
    </button>
  );
}
