// 離線快取：先用手機裡存的版本立刻打開，背景再抓新版，下次打開就是新版。
const CACHE = 'chx-v2';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then(async res => {
      if (res && res.ok) { try { await cache.put(req, res.clone()); } catch (err) {} }
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(fresh); return cached; }
    const res = await fresh;
    return res || (await cache.match('./index.html')) || Response.error();
  }));
});
