/* CDGA 答题系统 Service Worker —— 让手机端可离线使用 */
const CACHE = 'cdga-quiz-20260922205658';
const SHELL = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // 页面导航：缓存优先 + 后台静默更新（stale-while-revalidate）
  //   有缓存 => 立即出画面，不等网络；同时后台拉新版，下次打开生效。
  //   没缓存（首次访问）=> 走网络。
  const isDoc = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');
  if (isDoc) {
    e.respondWith(
      caches.open(CACHE).then(c =>
        c.match('./index.html').then(hit => {
          const update = fetch(req)
            .then(res => {
              const copy = res.clone();
              c.put('./index.html', copy);
              return res;
            })
            .catch(() => hit);
          return hit || update;
        })
      )
    );
    return;
  }

  // 静态资源：缓存优先
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }))
  );
});
