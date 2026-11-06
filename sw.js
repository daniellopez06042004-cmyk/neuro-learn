// Service worker: makes the app open offline after the first visit.
// - App files: served from cache instantly, refreshed in the background.
// - Content (course.json, lessons, images): network first so new lessons show
//   up right away, falling back to the cached copy when offline.
// Bump VERSION when you change any app file so phones pick up the new code.

const VERSION = 'v21';
const SHELL_CACHE = `shell-${VERSION}`;
const CONTENT_CACHE = 'content';

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './src/app.js',
  './src/router.js',
  './src/ui.js',
  './src/content.js',
  './src/validate.js',
  './src/progress.js',
  './src/map.js',
  './src/steps.js',
  './src/player.js',
  './src/trace.js',
  './src/themes.js',
  './src/slides.js',
  './src/haptics.js',
  './src/circuit.js',
  './src/circuits-data.js',
  './src/badge.js',
  './src/sound.js',
  './src/views/stats.js',
  './src/views/glossary.js',
  './src/views/pulse.js',
  './src/views/circuit.js',
  './src/views/home.js',
  './src/views/unit.js',
  './src/views/lesson.js',
  './src/views/review.js',
  './src/views/settings.js',
  './src/views/errors.js',
  './src/views/slidebox.js',
  './src/views/quiz.js',
  './src/quiz.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    // cache: 'reload' skips the browser's HTTP cache so a new version is really new.
    await shell.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })));
    // Pre-cache every lesson listed in course.json so it all works offline.
    const content = await caches.open(CONTENT_CACHE);
    try {
      const res = await fetch('content/course.json', { cache: 'no-cache' });
      if (res.ok) {
        await content.put('content/course.json', res.clone());
        const course = await res.json();
        const ids = course.tracks.flatMap((t) => t.units.flatMap((u) => u.lessons || []));
        for (const extra of ['content/pulse.json', 'content/glossary.json', 'content/slides.json', 'content/quiz-pool.json']) {
          const r = await fetch(extra, { cache: 'no-cache' }).catch(() => null);
          if (r && r.ok) await content.put(extra, r);
        }
        await Promise.all(ids.map(async (id) => {
          const url = `content/lessons/${encodeURIComponent(id)}.json`;
          const r = await fetch(url, { cache: 'no-cache' }).catch(() => null);
          if (!r || !r.ok) return;
          await content.put(url, r.clone());
          // ...and the diagrams, videos and widgets the lesson shows.
          const lesson = await r.json().catch(() => null);
          const assets = (lesson?.steps || []).flatMap((st) => [st, ...(st.variants || [])])
            .flatMap((st) => [st.visual?.src, typeof st.image === 'string' ? st.image : st.image?.src])
            .filter((src) => typeof src === 'string' && !/^(https?:)?\/\//.test(src));
          await Promise.all(assets.map(async (src) => {
            const a = await fetch(`content/${src}`).catch(() => null);
            if (a && a.ok) await content.put(`content/${src}`, a);
          }));
        }));
      }
    } catch { /* offline during install — the app will cache as it loads */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = [SHELL_CACHE, CONTENT_CACHE];
    for (const key of await caches.keys()) if (!keep.includes(key)) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.includes('/content/')) event.respondWith(networkFirst(req));
  else event.respondWith(staleWhileRevalidate(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CONTENT_CACHE);
  try {
    const res = await withTimeout(fetch(req), 4000);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(req, { ignoreSearch: true });
    return hit || new Response('Offline and not cached yet', { status: 503 });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  const update = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return hit || (await update) || (await cache.match('./index.html')) || Response.error();
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}
