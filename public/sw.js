const CACHE_NAME = "tropacs-v1";
const STATIC_ASSETS = [
  "/favicon.png",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  if (
    request.method === "GET" &&
    /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|webp)$/i.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return res;
      }))
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || "",
      icon: data.icon || "/favicon.png",
      badge: "/favicon.png",
      data: { url: data.url || "/" },
      tag: data.tag || "default",
      vibrate: [200, 100, 200],
      requireInteraction: true
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "TropaCS", options)
    );
  } catch {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("TropaCS", { body: text })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
