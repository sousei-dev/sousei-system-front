/* sw.js */
import { precacheAndRoute } from 'workbox-precaching'

// Workbox manifest 주입
precacheAndRoute(self.__WB_MANIFEST)

// 푸시 알림 이벤트 리스너
self.addEventListener('push', (event) => {
  let data = {}
  if (event.data) {
    data = event.data.json()
  }

  const options = {
    body: data.body || '새로운 알림이 있습니다.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.tag || 'default',
    requireInteraction: false,
    silent: false,
  }

  event.waitUntil(
    self.registration.showNotification(data.title || '알림', options)
  )
})

// 알림 클릭 이벤트 리스너
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const urlToOpen = event.notification.data?.url || '/'
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // 이미 열린 창이 있으면 포커스
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      // 새 창 열기
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// 백그라운드 동기화 (선택사항)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  // 백그라운드에서 실행할 작업
  console.log('백그라운드 동기화 실행')
}
