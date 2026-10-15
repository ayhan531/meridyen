/* Anlık bildirim: sunucu içeriksiz "uyandırma" gönderir; en son okunmamış bildirimi çekip gösteririz. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let title = 'Meridyen Yatırım', body = 'Yeni bir bildiriminiz var.';
    try {
      const r = await fetch('/api/notifications', { credentials: 'same-origin', cache: 'no-store' });
      if (r.ok) { const j = await r.json(); const n = (j.notifications || []).find((x) => !x.read_at) || (j.notifications || [])[0]; if (n) { title = n.title || title; body = n.body || body; } }
    } catch (e) { /* çevrimdışı: varsayılan metin */ }
    await self.registration.showNotification(title, { body, icon: '/img/favicon.svg', badge: '/img/favicon.svg', tag: 'meridyen', renotify: true });
  })());
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) { c.navigate('/app'); return c.focus(); } }
    return self.clients.openWindow('/app');
  })());
});
