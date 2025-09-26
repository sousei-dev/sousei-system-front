/* sw.js */
self.addEventListener('push', (event) => {
  let data = {}
  if (event.data) {
    data = event.data.json()
  }

  const options = {
    body: data.body || '새로운 알림이 있습니다.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
  }

  event.waitUntil(
    self.registration.showNotification(data.title || '알림', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow('/') // 알림 클릭 시 열릴 URL
  )
})
