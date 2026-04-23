// BUMP CACHE_VERSION when shipping content or code changes.
const CACHE_VERSION = 'v7';
const SHELL_CACHE   = `rpg-weather-${CACHE_VERSION}`;
const RUNTIME_CACHE = `rpg-weather-runtime-${CACHE_VERSION}`;
const DEBUG = false;

function log(...args) {
  if (DEBUG) console.log('[SW]', ...args);
}

// ── Pre-cache manifest ─────────────────────────────────────────────────────
// App shell — cache-first. Update CACHE_VERSION to bust these.
const SHELL_URLS = [
  'index.html',
  'app.js',
  'state.js',
  'weather.js',
  'tabs.js',
  'roller.js',
  'predators.js',
  'journey.js',
  'camp.js',
  'dice.js',
  'manifest.webmanifest',
  'styles/base.css',
  'styles/one-ring.css',
  'styles/blade-runner.css',
  'assets/flourish.svg',
];

// Data — stale-while-revalidate. Served from cache immediately; updated in
// the background so the next launch sees fresh content.
const DATA_URLS = [
  'data/manifest.json',
  'data/transitions.json',
  'data/regions/dunland.json',
  'data/regions/eriador.json',
  'data/regions/gondor.json',
  'data/regions/la-2037.json',
  'data/regions/lindon.json',
  'data/regions/lothlorien.json',
  'data/regions/mirkwood.json',
  'data/regions/misty-mountains.json',
  'data/regions/rohan.json',
  'data/regions/shire.json',
  'data/regions/wilderland.json',
  'data/journey-events/manifest.json',
  'data/journey-events/hunter.json',
  'data/journey-events/lookout-battle-site.json',
  'data/journey-events/lookout-predators.json',
  'data/journey-events/lookout-robbery.json',
  'data/journey-events/lookout-threats.json',
  'data/journey-events/lookout-traveller.json',
  'data/journey-events/lookout-weather.json',
  'data/journey-events/predators.json',
  'data/journey-events/scout-campsite.json',
  'data/journey-events/scout-geography.json',
  'data/journey-events/scout-routing.json',
  'data/journey-events/scout-ruin.json',
  'data/journey-events/scout-settlement.json',
  'data/journey-events/prey.json',
  'data/journey-events/shadow.json',
  'data/journey-events/camp-events.json',
];

// ── Lifecycle ──────────────────────────────────────────────────────────────

self.addEventListener('install', event => {
  log('installing', SHELL_CACHE);
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll([...SHELL_URLS, ...DATA_URLS]))
      .then(() => {
        log('install complete, skipping wait');
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', event => {
  log('activating, pruning old caches');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map(key => {
            log('deleting old cache', key);
            return caches.delete(key);
          })
      ))
      .then(() => {
        log('claiming clients');
        return self.clients.claim();
      })
  );
});

// ── Fetch strategies ───────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    log('cache hit', request.url);
    return cached;
  }
  log('cache miss', request.url);
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache  = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);

  const revalidate = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
      log('revalidated', request.url);
    }
    return response;
  }).catch(() => null);

  if (cached) {
    log('stale hit', request.url);
    return cached;
  }

  log('cache miss, awaiting network', request.url);
  return revalidate;
}

async function googleFontsFirst(request) {
  const cache  = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    log('fonts cache hit', request.url);
    return cached;
  }
  log('fonts cache miss', request.url);
  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      log('network failed, serving from cache', request.url);
      return cached;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(googleFontsFirst(event.request));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.includes('/data/')) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  event.respondWith(networkFirst(event.request));
});
