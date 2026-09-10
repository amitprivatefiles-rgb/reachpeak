/* ReachPeak service worker
   - Enables installability (PWA)
   - Push-ready: shows notifications for order/wallet/reply alerts (backend wired in phase 2)
   - Deliberately does NOT cache the live dashboard or Supabase API, so content is never stale.
*/
const SW_VERSION = 'reachpeak-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Network passthrough — a fetch handler exists (installability) but we never serve stale content.
self.addEventListener('fetch', () => { /* default: let the browser handle it */ });

// ── Push notifications ──
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = { title: 'ReachPeak', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'ReachPeak';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: data.url || '/app' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/app';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) { w.navigate(target).catch(() => {}); return w.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
