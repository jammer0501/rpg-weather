# RPG Companion

Weather and events roller for tabletop RPGs. Supports The One Ring and Blade Runner modes.

## Running locally

```
python -m http.server
```

Then open `http://localhost:8000`.

## Deploying

Push to `main`. GitHub Pages redeploys automatically (configure under Settings → Pages → Deploy from branch → `main` / root).

## Service worker & cache versioning

The app installs as a PWA via `sw.js`. When you ship content or code changes, **bump `CACHE_VERSION` in `sw.js`** — this invalidates the old cache and forces installed PWAs to pick up the new files on next launch.

```js
// sw.js
const CACHE_VERSION = 'v1'; // ← increment this
```

Bump when:
- Adding or changing region/journey-event JSON files
- Updating app.js, roller.js, or CSS
- Changing index.html or manifest.webmanifest

The new service worker takes effect immediately on next navigation (`skipWaiting` + `clients.claim`), so users don't need to reinstall.
