/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

interface ClubhuisPush {
  title?: string
  body?: string
  url?: string
  badgeCount?: number
}

self.addEventListener('push', (event) => {
  const payload = event.data?.json() as ClubhuisPush | undefined
  const badgeCount = payload?.badgeCount ?? 1
  const registration = self.registration as ServiceWorkerRegistration & {
    setAppBadge?: (count?: number) => Promise<void>
  }

  event.waitUntil(
    Promise.all([
      registration.setAppBadge?.(badgeCount),
      self.registration.showNotification(payload?.title ?? 'Nieuw in Clubhuis', {
        body: payload?.body ?? 'Er staat iets nieuws voor je klaar.',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: { url: payload?.url ?? '/verhalen' },
        tag: 'clubhuis-activiteit',
      }),
    ]),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url ?? '/verhalen', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        await client.navigate(target)
        return client.focus()
      }
      return self.clients.openWindow(target)
    }),
  )
})
