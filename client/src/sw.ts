/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
}

interface NotificationNavData {
  url?: string;
}

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;
  let payload: PushPayload = {};
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { body: event.data.text() };
  }
  const title = payload.title ?? "Debt Collector";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url ?? "/" } satisfies NotificationNavData,
    }),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const data = (event.notification.data ?? {}) as NotificationNavData;
  const url = data.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) {
          void c.focus();
          c.postMessage({ type: "navigate", url });
          return;
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const data = event.data as { type?: string } | null;
  if (data && data.type === "SKIP_WAITING") self.skipWaiting();
});
