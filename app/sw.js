// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
// Update the cache version when releasing a changed app shell.
const cacheName = 'astravital-dashboard-v28';
const prefix = 'astravital-dashboard-';
const files = [
  './', './index.html', './legacy.html', './experience.css?v=22', './experience.js?v=24', './view3d.bundle.js?v=13', './web-demo.bundle.js?v=16', './mission.html', './mission.js', './mission.css', './review.html', './visor.css', './visor.js', './workflow.js', './hud-model.js', './styles.css', './dashboard.js', './engine.js',
  './case-messages.js', './case-thread.js', './case-thread.css?v=3',
  './scenarios.js', './storage.js', './chart.js', './explorer.js', './health-status.js',
  './mission.js?v=19', './mission.css?v=19', './ground-view.js?v=19', './ground-model.js', './forecast.js',
  './mission-demo.js?v=15', './mission-demo.json',
  './anatomy-body.webp', './anatomy-heart.webp', './anatomy-left-hip.webp',
  './hud-check.wav', './hud-followup.wav', './hud-saved.wav', './hud-error.wav', './hud-explain.wav',
  './fira-sans-bold.woff2', './overpass-regular.woff2', './overpass-bold.woff2',
];
const shell = new Set(files.map(file => new URL(file, self.registration.scope).href));
const missionPage = new URL('./mission.html', self.registration.scope);

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
  // A case or domain is selected in the browser after the mission document loads.
  if (url.origin === missionPage.origin && url.pathname === missionPage.pathname) url.search = '';
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
