/*
 * Canonical service-worker source. Copy this file verbatim to each consuming
 * application's public/sw.js so it is served from that application's origin root.
 */
const resolveSameOriginUrl = (url) => {
  try {
    const resolvedUrl = new URL(url || '/', self.location.origin);
    if (resolvedUrl.origin !== self.location.origin) return '/';

    return `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
  } catch {
    return '/';
  }
};

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { body: event.data.text() };
  }

  const options = {
    body: payload.body || '',
    data: { url: resolveSameOriginUrl(payload.url) },
  };
  if (payload.icon) options.icon = payload.icon;
  if (payload.badge) options.badge = payload.badge;

  event.waitUntil(self.registration.showNotification(payload.title || 'Notification', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = resolveSameOriginUrl(event.notification.data?.url);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return Promise.resolve(client.navigate(url)).then(() => client.focus());
        }
      }
      return clients.openWindow ? clients.openWindow(url) : undefined;
    }),
  );
});
