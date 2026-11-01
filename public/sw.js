/**
 * HyperLog service worker — hand-written and dependency-free.
 *
 * vite-plugin-pwa / serwist do not work with TanStack Start's Solid renderer
 * (their SW generation runs from a build hook Start never invokes), so this
 * worker is authored directly. It lives in `public/`, which the client build
 * copies into `dist/client` — the Worker assets directory — so it is served at
 * the root scope as `/sw.js` with no extra configuration.
 *
 * Hashed build-asset filenames are not known at author time, so nothing beyond
 * the shell URLs below is precached; every other asset is cached lazily as it
 * is requested.
 */

const VERSION = 'v1'
const SHELL_CACHE = `hyperlog-shell-${VERSION}`
const ASSET_CACHE = `hyperlog-assets-${VERSION}`
const MONACO_CACHE = `hyperlog-monaco-${VERSION}`
const KNOWN_CACHES = [SHELL_CACHE, ASSET_CACHE, MONACO_CACHE]

/** Everything needed to boot the app with no network at all. */
const SHELL_URLS = [
  '/',
  '/viewer',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon-180.png',
]

const STATIC_EXTENSIONS = [
  '.js',
  '.css',
  '.png',
  '.svg',
  '.ico',
  '.woff2',
  '.woff',
  '.webmanifest',
]

/** Endpoints the worker must never sit in front of. */
const PASSTHROUGH_PREFIXES = ['/_serverFn/', '/__debug', '/.well-known/']

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(activate())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  // Only same-origin GETs are candidates (the Monaco CDN bucket is the one
  // deliberate cross-origin exception below). Anything else passes through.
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin && !isMonacoAsset(url)) return
  if (url.origin === self.location.origin && isPassthrough(url)) return

  if (isMonacoAsset(url)) {
    event.respondWith(staleWhileRevalidateMonaco(request))
    return
  }

  // Same-origin from here on.
  if (isNavigation(request)) {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstAsset(request))
  }
  // Anything else (POST responses, streaming endpoints, unknown paths) is
  // left to the browser untouched.
})

async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE)
  await Promise.all(
    // One request per entry so a single missing file (e.g. an icon that has
    // not been generated yet) cannot abort the whole install.
    SHELL_URLS.map((href) =>
      cache.add(new Request(href, { cache: 'reload' })).catch(() => undefined),
    ),
  )
}

async function activate() {
  const names = await caches.keys()
  await Promise.all(
    names
      .filter((name) => !KNOWN_CACHES.includes(name))
      .map((name) => caches.delete(name)),
  )
  await clients.claim()
}

function isNavigation(request) {
  if (request.mode === 'navigate') return true
  const accept = request.headers.get('accept') || ''
  return accept.includes('text/html')
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_build/') ||
    STATIC_EXTENSIONS.some((extension) => url.pathname.endsWith(extension))
  )
}

/** Monaco is loaded from jsDelivr at runtime; offline editing needs it cached. */
function isMonacoAsset(url) {
  return (
    url.protocol === 'https:' &&
    url.hostname === 'cdn.jsdelivr.net' &&
    url.pathname.startsWith('/npm/monaco-editor')
  )
}

function isPassthrough(url) {
  if (url.origin !== self.location.origin) return false
  return PASSTHROUGH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
}

/** Navigations: try the network so updates land, fall back to the cached shell. */
async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE)
  try {
    const response = await fetch(request)
    await put(cache, request, response)
    return response
  } catch (error) {
    const cached =
      (await cache.match(request)) ||
      (await cache.match('/viewer')) ||
      (await cache.match('/'))
    if (cached) return cached
    throw error
  }
}

/** Hashed assets: serve from cache, otherwise fetch and write through. */
async function cacheFirstAsset(request) {
  const cache = await caches.open(ASSET_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  await put(cache, request, response)
  return response
}

/** Monaco: answer instantly from cache, refresh in the background. */
async function staleWhileRevalidateMonaco(request) {
  const cache = await caches.open(MONACO_CACHE)
  const cached = await cache.match(request)
  // Started eagerly and only awaited when there is nothing cached, otherwise
  // "stale-while-revalidate" would degrade into a blocking network fetch.
  const revalidated = fetch(request)
    .then((response) => put(cache, request, response).then(() => response))
    .catch(() => undefined)
  if (cached) {
    void revalidated
    return cached
  }
  const fresh = await revalidated
  if (fresh) return fresh
  throw new TypeError('Monaco asset unavailable offline')
}

/**
 * Store a copy only when it is worth storing: a 2xx whose body we may actually
 * read back (opaque cross-origin responses cannot be served as our own).
 * The Cache API rejects `put` for some responses, so failures are logged, never
 * thrown back into the request path.
 */
async function put(cache, request, response) {
  if (!response.ok || response.type === 'opaque' || response.type === 'error')
    return
  try {
    await cache.put(request, response.clone())
  } catch (error) {
    console.warn('[hyperlog-sw] cache.put skipped', error)
  }
}
