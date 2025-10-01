// Service Worker for PWA Notifications (iOS Safari PWA Optimized)
import { precacheAndRoute } from 'workbox-precaching'

// Workbox에서 자동으로 주입하는 매니페스트
precacheAndRoute(self.__WB_MANIFEST)

const CACHE_NAME = 'sousei-system-v1'

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && !cacheName.includes('workbox')) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      return self.clients.claim()
    })
  )
})

// Push event - 백엔드에서 푸시 전송 시 여기서 수신!
self.addEventListener('push', event => {
  console.log('🔔 PUSH EVENT RECEIVED!', event)
  console.log('Push data:', event.data)
  
  // 아이폰 사파리 PWA에서의 푸시 데이터 처리 개선
  let data = {}
  if (event.data) {
    try {
      data = event.data.json()
      console.log('Parsed push data:', data)
    } catch (e) {
      console.error('Push data parsing error:', e)
      try {
        data = JSON.parse(event.data.text())
        console.log('Text parsed push data:', data)
      } catch (e2) {
        console.error('Text parsing also failed:', e2)
        data = { 
          title: '새 메시지', 
          body: event.data.text() || '새 메시지가 도착했습니다'
        }
      }
    }
  } else {
    console.log('No push data received')
    data = {
      title: 'SOUSEI 시스템',
      body: '새 메시지가 도착했습니다'
    }
  }

  // 모든 클라이언트에게 푸시 수신 알림
  self.clients.matchAll().then(clients => {
    console.log('Notifying clients:', clients.length)
    clients.forEach(client => {
      client.postMessage({
        type: 'PUSH_RECEIVED',
        data: data
      })
    })
  })
  
  // 백엔드에서 보낸 데이터 구조에 맞게 처리
  const notificationData = {
    title: data.notification?.title || data.title || 'SOUSEI 시스템',
    body: data.notification?.body || data.body || '새 메시지가 도착했습니다',
    icon: data.notification?.icon || data.icon || '/pwa-192x192.png',
    badge: data.notification?.badge || data.badge || '/pwa-192x192.png',
    tag: data.data?.type || 'general-notification',
    data: data.data || {},
    vibrate: data.notification?.vibrate || [200, 100, 200],
    requireInteraction: data.notification?.requireInteraction || false
  }

  console.log('Showing notification with data:', notificationData)

  // 아이폰 사파리 PWA에서의 알림 표시 최적화
  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    requireInteraction: notificationData.requireInteraction,
    silent: false,
    vibrate: notificationData.vibrate,
    data: notificationData.data,
    actions: [
      {
        action: 'open',
        title: '열기',
        icon: '/pwa-192x192.png'
      },
      {
        action: 'close',
        title: '닫기',
        icon: '/pwa-192x192.png'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
      .then(() => {
        console.log('Notification shown successfully')
      })
      .catch(error => {
        console.error('Failed to show notification:', error)
      })
  )
})

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event)
  
  event.notification.close()

  if (event.action === 'close') {
    return
  }

  // Open the app
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    })
  )
})

// 메시지 이벤트 처리
self.addEventListener('message', event => {
  console.log('Service Worker received message:', event.data)
  
  const { type, data } = event.data

  switch (type) {
    case 'SHOW_NOTIFICATION':
      showNotification(data)
      break
    case 'CLOSE_NOTIFICATION':
      closeNotification(data.tag)
      break
    case 'CLOSE_ALL_NOTIFICATIONS':
      closeAllNotifications()
      break
    case 'TEST_PUSH':
      // 테스트용 푸시 알림
      self.registration.showNotification('테스트 알림', {
        body: '아이폰 사파리 PWA에서 푸시 알림이 작동합니다!',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'test-notification'
      })
      break
    default:
      console.log('Unknown message type:', type)
  }
})

// 알림 표시 함수
function showNotification(data) {
  const options = {
    body: data.body || '새 메시지가 도착했습니다',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    tag: data.tag || 'general-notification',
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    data: data.data || {}
  }

  return self.registration.showNotification(data.title || 'SOUSEI 시스템', options)
}

// 알림 닫기 함수
function closeNotification(tag) {
  return self.registration.getNotifications({ tag }).then(notifications => {
    notifications.forEach(notification => notification.close())
  })
}

// 모든 알림 닫기 함수
function closeAllNotifications() {
  return self.registration.getNotifications().then(notifications => {
    notifications.forEach(notification => notification.close())
  })
}
