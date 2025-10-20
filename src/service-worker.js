// Service Worker for PWA Notifications (iOS Safari PWA Optimized)
import { precacheAndRoute } from 'workbox-precaching'

// Workbox에서 자동으로 주입하는 매니페스트
precacheAndRoute(self.__WB_MANIFEST)

// 캐시 이름 (버전 관리)
const CACHE_NAME = 'sousei-system-v1'

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  
  // 새 서비스 워커를 즉시 활성화
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

  // 푸시 타입에 따른 처리
  const pushType = data.data?.type || data.type || 'general'
  
  // 입원 알림인 경우 특별 처리
  if (pushType === 'hospitalization_notification') {
    console.log('🏥 입원 알림 수신:', data)
    
    // 입원 알림 데이터 구조 처리
    const hospitalizationData = data.data || {}
    const notificationData = {
      title: data.notification?.title || data.title || '🏥 입원 알림',
      body: data.notification?.body || data.body || `입원자: ${hospitalizationData.elderly_name || '알 수 없음'}`,
      icon: data.notification?.icon || data.icon || '/pwa-192x192.png',
      badge: data.notification?.badge || data.badge || '/pwa-192x192.png',
      tag: 'hospitalization-notification',
      data: {
        type: 'hospitalization_notification',
        elderly_id: hospitalizationData.elderly_id,
        elderly_name: hospitalizationData.elderly_name,
        hospital_name: hospitalizationData.hospital_name,
        admission_date: hospitalizationData.admission_date,
        ...hospitalizationData
      },
      vibrate: [300, 200, 300], // 입원 알림은 더 강한 진동
      requireInteraction: true // 입원 알림은 사용자 상호작용 필요
    }
    
    // 입원 알림 전용 처리
    return handleHospitalizationNotification(event, notificationData)
  }
  
  // 일반 알림 처리
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

  // 앱 배지 업데이트 (읽지 않은 메시지 개수)
  if (data.unread_count !== undefined && 'setAppBadge' in self.navigator) {
    self.navigator.setAppBadge(data.unread_count).catch((error) => {
      console.error('배지 설정 실패:', error)
    })
  }

  // 사용자가 웹사이트를 보고 있는지 확인
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      console.log('Active clients:', clients.length)
      
      // 포커스된 클라이언트가 있는지 확인
      const focusedClient = clients.find(client => client.focused)
      
      if (focusedClient) {
        console.log('사용자가 웹사이트를 보고 있습니다. 알림을 표시하지 않고 메시지만 전송합니다.')
        // 포커스된 클라이언트에게만 메시지 전송
        return focusedClient.postMessage({
          type: 'PUSH_RECEIVED',
          data: notificationData
        })
      }
      
      // 포커스된 클라이언트가 없으면 모든 클라이언트에게 알림
      console.log('사용자가 웹사이트를 보고 있지 않습니다. 푸시 알림을 표시합니다.')
      clients.forEach(client => {
        client.postMessage({
          type: 'PUSH_RECEIVED',
          data: notificationData
        })
      })
      
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

      return self.registration.showNotification(notificationData.title, notificationOptions)
        .then(() => {
          console.log('Notification shown successfully')
        })
        .catch(error => {
          console.error('Failed to show notification:', error)
        })
    })
  )
})

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event)
  
  event.notification.close()

  // 입원 알림인 경우 특별 처리
  if (event.notification.tag === 'hospitalization-notification') {
    console.log('🏥 입원 알림 클릭됨')
    
    if (event.action === 'close') {
      return
    }
    
    // 입원자 확인 액션이거나 일반 클릭
    if (event.action === 'view_hospitalization' || !event.action) {
      event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              // 대시보드로 이동하여 입원자 리스트 표시
              return client.postMessage({
                type: 'NAVIGATE_TO_HOSPITALIZATION',
                data: event.notification.data
              }).then(() => client.focus())
            }
          }
          
          if (clients.openWindow) {
            return clients.openWindow('/')
          }
        })
      )
    }
    return
  }

  // 일반 알림 처리
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

// 입원 알림 전용 처리 함수
function handleHospitalizationNotification(event, notificationData) {
  console.log('🏥 입원 알림 처리 시작:', notificationData)
  
  // 앱 배지 업데이트 (입원 알림 카운트)
  if ('setAppBadge' in self.navigator) {
    self.navigator.setAppBadge(1).catch((error) => {
      console.error('입원 알림 배지 설정 실패:', error)
    })
  }
  
  // 사용자가 웹사이트를 보고 있는지 확인
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      console.log('입원 알림 - 활성 클라이언트:', clients.length)
      
      // 포커스된 클라이언트가 있는지 확인
      const focusedClient = clients.find(client => client.focused)
      
      if (focusedClient) {
        console.log('사용자가 웹사이트를 보고 있습니다. 입원 알림 메시지를 전송합니다.')
        // 포커스된 클라이언트에게 입원 알림 메시지 전송
        return focusedClient.postMessage({
          type: 'HOSPITALIZATION_NOTIFICATION',
          data: notificationData
        })
      }
      
      // 포커스된 클라이언트가 없으면 모든 클라이언트에게 알림
      console.log('사용자가 웹사이트를 보고 있지 않습니다. 입원 푸시 알림을 표시합니다.')
      clients.forEach(client => {
        client.postMessage({
          type: 'HOSPITALIZATION_NOTIFICATION',
          data: notificationData
        })
      })
      
      // 입원 알림 전용 옵션
      const hospitalizationOptions = {
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
            action: 'view_hospitalization',
            title: '입원자 확인',
            icon: '/pwa-192x192.png'
          },
          {
            action: 'close',
            title: '닫기',
            icon: '/pwa-192x192.png'
          }
        ]
      }

      return self.registration.showNotification(notificationData.title, hospitalizationOptions)
        .then(() => {
          console.log('입원 알림 표시 성공')
        })
        .catch(error => {
          console.error('입원 알림 표시 실패:', error)
        })
    })
  )
}
