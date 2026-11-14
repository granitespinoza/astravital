// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
// Update the cache version when releasing a changed app shell.
const cacheName = 'astravital-dashboard-v1';
const prefix = 'astravital-dashboard-';
const files = [
  './', './index.html', './styles.css', './dashboard.js', './engine.js',
  './scenarios.js', './storage.js', './chart.js',
];
const shell = new Set(files.map(file => new URL(file, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(files)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(prefix) && key !== cacheName)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!shell.has(url.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    return await cache.match(event.request) ?? await fetch(event.request);
  })());
});
