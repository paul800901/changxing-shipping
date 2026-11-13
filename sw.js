// 離線快取：有網路時頁面一律先抓最新版（最多等 4 秒），沒網路才用手機裡存的版本。
const CACHE = 'chx-v3';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // 跳過瀏覽器的 HTTP 快取，直接向伺服器確認有沒有新版
    const fresh = fetch(req, { cache: 'no-cache' }).then(async res => {
      if (res && res.ok) { try { await cache.put(isPage ? './index.html' : req, res.clone()); } catch (err) {} }
      return res;
    }).catch(() => null);
    e.waitUntil(fresh);
    const cached = await cache.match(isPage ? './index.html' : req, { ignoreSearch: true });
    if (isPage) {
      const timeout = new Promise(r => setTimeout(() => r(null), 4000));
      const res = await Promise.race([fresh, timeout]);
      if (res && res.ok) return res;
      return cached || (await fresh) || Response.error();
    }
    if (cached) return cached;
    return (await fresh) || Response.error();
  })());
});
