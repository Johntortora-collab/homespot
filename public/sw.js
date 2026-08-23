/* Homespot service worker — push notifications.
 *
 * Lives in public/ so it's served from the site ROOT (/sw.js). That matters:
 * a service worker can only control pages at or below its own path, so one
 * served from /assets/sw.js would control nothing.
 *
 * Deliberately minimal — no offline caching. Caching a shell here would mean
 * customers seeing stale stamp counts, which is worse than a slow load.
 */

self.addEventListener('install', () => {
  // Take over immediately rather than waiting for every open tab to close.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'Homespot'
  const options = {
    body:  payload.body || '',
    icon:  payload.icon  || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    // Tagging by spot means a second offer from the same business replaces the
    // first instead of stacking two notifications for one shop.
    tag:   payload.tag || 'homespot',
    renotify: true,
    data: {
      url: payload.url || '/',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url || '/'

  // Focus an already-open Homespot tab if there is one; only open a new
  // window as a fallback. Opening a duplicate every time is a common bug
  // and it's maddening on a phone.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    })
  )
})
