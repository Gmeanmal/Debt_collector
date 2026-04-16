import { useEffect, useState } from "react";
import { isSessionActive } from "@/services/aftercare/sessionCompleteCookie";

/**
 * Returns true when the goddess has marked a session complete for this sub
 * within the last 30 minutes (tracked via localStorage).
 * Re-checks every 60 s so the banner auto-dismisses when the window expires.
 *
 * TODO: replace localStorage polling with a websocket/push signal for
 * cross-device parity.
 */
export function useAftercareActive(subId: string | undefined): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!subId) {
      setActive(false);
      return;
    }

    const check = () => setActive(isSessionActive(subId));
    check();

    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [subId]);

  return active;
}
