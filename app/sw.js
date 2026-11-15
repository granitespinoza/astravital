// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
// Update the cache version when releasing a changed app shell.
const cacheName = 'astravital-dashboard-v11';
const prefix = 'astravital-dashboard-';
const files = [
  './', './index.html', './legacy.html', './experience.css?v=10', './experience.js?v=10', './view3d.bundle.js?v=10', './web-demo.bundle.js?v=10', './review.html', './visor.css', './visor.js', './workflow.js', './hud-model.js', './styles.css', './dashboard.js', './engine.js',
  './scenarios.js', './storage.js', './chart.js', './explorer.js',
  './hud-check.wav', './hud-followup.wav', './hud-saved.wav', './hud-error.wav', './hud-explain.wav',
  './fira-sans-bold.woff2', './overpass-regular.woff2', './overpass-bold.woff2',
];
const shell = new Set(files.map(file => new URL(file, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(files)).then(() => self.skipWaiting()));
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
  // Hashes select browser-only views; all views use the same cached app shell.
  url.hash = '';
  if (!shell.has(url.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(url.href, response.clone());
      return response;
    } catch {
      const stored = await cache.match(url.href);
      return stored ?? Response.error();
    }
  })());
});
