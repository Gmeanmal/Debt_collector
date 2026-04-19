export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "PushManager" in window &&
    "Notification" in window &&
    "serviceWorker" in navigator
  );
}

export async function getPushPermissionState(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  return Notification.permission;
}

export function urlBase64ToUint8Array(vapidBase64: string): Uint8Array {
  const padding = "=".repeat((4 - (vapidBase64.length % 4)) % 4);
  const base64 = (vapidBase64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function subscribeBrowser(vapidPublicKey: string): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
}

export async function unsubscribeBrowser(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return false;
  return sub.unsubscribe();
}

export interface SerializedSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export function serializeSubscriptionKeys(sub: PushSubscription): SerializedSubscriptionKeys {
  // The DOM typings return `ArrayBuffer | null` for getKey; the values are always
  // present after a successful subscribe() with userVisibleOnly+applicationServerKey.
  const p256dhBuf = sub.getKey("p256dh");
  const authBuf = sub.getKey("auth");
  if (!p256dhBuf || !authBuf) {
    throw new Error("PushSubscription is missing p256dh/auth keys");
  }
  return {
    p256dh: arrayBufferToBase64Url(p256dhBuf),
    auth: arrayBufferToBase64Url(authBuf),
  };
}
