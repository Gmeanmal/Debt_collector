import { Bell, BellOff } from "lucide-react";
import { usePushOptIn } from "@/hooks/usePushOptIn";
import { env } from "@/utils/env";

export function PushOptInToggle(): JSX.Element | null {
  const { supported, permission, enabled, enabling, disabling, enable, disable } = usePushOptIn();
  if (!supported || !env.VITE_VAPID_PUBLIC_KEY) return null;

  if (permission === "denied") {
    return (
      <div
        className="flex items-center gap-2 px-2 py-1.5 text-sm text-base-text-subtle cursor-not-allowed"
        aria-label="Push notifications blocked by browser"
        role="note"
      >
        <BellOff className="h-4 w-4" />
        Notifications blocked in browser
      </div>
    );
  }

  const busy = enabling || disabling;
  const label = enabled ? "Disable push notifications" : "Enable push notifications";
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void (enabled ? disable() : enable())}
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-base-surface-raised disabled:opacity-60 disabled:cursor-not-allowed"
      aria-label={label}
      aria-busy={busy}
    >
      <Bell className="h-4 w-4" />
      {label}
    </button>
  );
}
