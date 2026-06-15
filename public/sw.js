// Minimal, network-first service worker for installability.
//
// Deliberately does NOT precache app assets: this is a live, data-backed
// app, so every request goes to the network and users never see stale
// pages. The only cached resource is a tiny offline fallback shown when a
// navigation fails with no connection. Bump CACHE_VERSION to retire it.

const CACHE_VERSION = 'igs-v1'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.add(OFFLINE_URL)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  // Only intervene for page navigations; let everything else hit the
  // network normally (no caching of assets or API responses).
  if (event.request.mode !== 'navigate') return

  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL)),
  )
})
