// Service worker for the customer portal PWA. Scoped to /customer/ only —
// the staff dashboard is not a PWA and must never be served from this cache.
//
// Versioned cache name is a deliberate escape hatch: bumping CACHE_VERSION
// forces every existing client to drop old caches on the next activate, in
// case a future deploy needs a manual cache-bust the way this file once did
// (see git history — this previously shipped as a one-time kill switch after
// a stale-cache incident during local development).
const CACHE_VERSION = 'customer-portal-v2'

const APP_SHELL = [
  '/customer',
  '/customer/login',
  '/customer/panel',
  '/customer/offline',
  '/manifest-customer.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

const isStaticAsset = url => url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Never intercept API calls — those must always hit the network live.
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    // Network-first so logged-in users always see fresh data when online;
    // cache fallback covers brief network drops, true offline state falls
    // through to the dedicated /customer/offline page.
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone()
          caches.open(CACHE_VERSION).then(cache => cache.put(request, copy))
          return response
        })
        .catch(() =>
          caches
            .match(request)
            .then(cached => cached || caches.match('/customer/panel'))
            .then(fallback => fallback || caches.match('/customer/offline'))
        )
    )
    return
  }

  if (isStaticAsset(url)) {
    // Cache-first for hashed build assets and icons — they never change content under the same URL.
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_VERSION).then(cache => cache.put(request, copy))
        }
        return response
      }))
    )
    return
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached

      return fetch(request).then(response => {
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone()
          caches.open(CACHE_VERSION).then(cache => cache.put(request, copy))
        }
        return response
      })
    })
  )
})

self.addEventListener('push', event => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Jewellery Scheme', body: event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Jewellery Scheme', {
      body: payload.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url || '/customer/panel' }
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/customer/panel'

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clientsList => {
      const existing = clientsList.find(client => client.url.includes(targetUrl))
      if (existing) return existing.focus()

      return self.clients.openWindow(targetUrl)
    })
  )
})
