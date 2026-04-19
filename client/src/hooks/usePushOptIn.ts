import { useCallback, useEffect, useState } from "react";
import { get, set, del } from "idb-keyval";
import {
  createPushSubscriptionApi,
  deletePushSubscriptionApi,
} from "@/api/pushSubscriptions";
import {
  isPushSupported,
  serializeSubscriptionKeys,
  subscribeBrowser,
  unsubscribeBrowser,
} from "@/services/push/pushService";
import { env } from "@/utils/env";

const STORAGE_KEY = "pushSubscriptionId";

interface UsePushOptIn {
  supported: boolean;
  permission: NotificationPermission;
  enabled: boolean;
  enabling: boolean;
  disabling: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

async function readStoredId(): Promise<string | null> {
  const raw = await get<string | undefined>(STORAGE_KEY);
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

async function computeEnabled(): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (Notification.permission !== "granted") return false;
  const stored = await readStoredId();
  if (!stored) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub !== null;
}

export function usePushOptIn(): UsePushOptIn {
  const supported = isPushSupported();
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    supported ? Notification.permission : "denied",
  );
  const [enabled, setEnabled] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [disabling, setDisabling] = useState(false);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    void computeEnabled().then((value) => {
      if (!cancelled) setEnabled(value);
    });
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const enable = useCallback(async () => {
    if (!supported) return;
    const vapid = env.VITE_VAPID_PUBLIC_KEY;
    if (!vapid) return;
    setEnabling(true);
    try {
      const granted = await Notification.requestPermission();
      setPermission(granted);
      if (granted !== "granted") return;
      const browserSub = await subscribeBrowser(vapid);
      const keys = serializeSubscriptionKeys(browserSub);
      const row = await createPushSubscriptionApi({
        endpoint: browserSub.endpoint,
        keys,
      });
      await set(STORAGE_KEY, row.id);
      setEnabled(true);
    } finally {
      setEnabling(false);
    }
  }, [supported]);

  const disable = useCallback(async () => {
    if (!supported) return;
    setDisabling(true);
    try {
      const stored = await readStoredId();
      if (stored) {
        try {
          await deletePushSubscriptionApi(stored);
        } catch {
          // Row may already be gone — fall through and clean local state.
        }
      }
      await unsubscribeBrowser();
      await del(STORAGE_KEY);
      setEnabled(false);
    } finally {
      setDisabling(false);
    }
  }, [supported]);

  return { supported, permission, enabled, enabling, disabling, enable, disable };
}
